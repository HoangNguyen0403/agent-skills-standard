// scripts/evals/l3/runtime/vz/Runner.swift
//
// Minimal direct Apple Virtualization.framework runner for the L3 evaluator.
//
// This is the ONLY Virtualization.framework code in the project. It is driven
// exclusively by a frozen JSON config written by the host before boot and it
// cannot express a network device, a socket device, a shared directory, USB
// mass storage or any host-service channel: those device arrays are never
// populated, and unknown config keys are rejected.
//
// Console output is a single one-way serial pipe: the host passes a writable
// file descriptor, the read direction is /dev/null, so no host->guest console
// path exists. The host enforces the byte/time bound by terminating this
// process; a serial log file alone is never treated as a bound.
//
// Guest filesystem parsing happens only inside the collector guest. The host
// never mounts or interprets a guest filesystem.

import Foundation
import Virtualization

enum RunnerError: Error, CustomStringConvertible {
    case usage(String)
    case invalidConfig(String)
    case unsupported(String)
    case ioFailure(String)
    case vmFailure(String)

    var description: String {
        switch self {
        case .usage(let message): return "usage: \(message)"
        case .invalidConfig(let message): return "invalid config: \(message)"
        case .unsupported(let message): return "unsupported: \(message)"
        case .ioFailure(let message): return "io failure: \(message)"
        case .vmFailure(let message): return "vm failure: \(message)"
        }
    }
}

struct BootConfig: Codable {
    let kernel: String
    let initrd: String
    let kernel_cmdline: String
}

struct DiskConfig: Codable {
    let name: String
    let path: String
    let read_only: Bool
}

struct RunConfig: Codable {
    let schema_version: Int
    let topology: String
    let mode: String
    let cpu_count: Int
    let memory_bytes: Int
    let deadline_ms: Int
    let boot: BootConfig
    let disks: [DiskConfig]
    let serial_fd: Int
}

let allowedTopology = "apple-vz-direct-arm64"
let allowedModes: Set<String> = ["start", "collect"]
let maxCpuCount = 4
let maxMemoryBytes = 8 * 1024 * 1024 * 1024
let maxDisks = 4

func requireAbsolute(_ value: String, _ field: String) throws -> URL {
    guard value.hasPrefix("/"), !value.contains("\0") else {
        throw RunnerError.invalidConfig("\(field) must be an absolute path")
    }
    let components = value.split(separator: "/", omittingEmptySubsequences: true)
    guard !components.contains(".."), !components.contains(".") else {
        throw RunnerError.invalidConfig("\(field) must not contain traversal components")
    }
    return URL(fileURLWithPath: value).standardizedFileURL
}

func requireExactKeys(_ value: Any, _ expected: Set<String>, _ context: String) throws {
    guard let object = value as? [String: Any], Set(object.keys) == expected else {
        throw RunnerError.invalidConfig("\(context) has missing or unknown keys")
    }
}

func validateConfigShape(_ raw: Any) throws {
    try requireExactKeys(raw, ["schema_version", "topology", "mode", "cpu_count", "memory_bytes", "deadline_ms", "boot", "disks", "serial_fd"], "config")
    guard let root = raw as? [String: Any], let boot = root["boot"] else {
        throw RunnerError.invalidConfig("config.boot is missing")
    }
    try requireExactKeys(boot, ["kernel", "initrd", "kernel_cmdline"], "config.boot")
    guard let disks = root["disks"] as? [[String: Any]] else {
        throw RunnerError.invalidConfig("config.disks must be an array of objects")
    }
    for (index, disk) in disks.enumerated() {
        try requireExactKeys(disk, ["name", "path", "read_only"], "config.disks[\(index)]")
    }
}

func rejectSymlinkComponents(_ url: URL, _ field: String) throws {
    var current = URL(fileURLWithPath: "/")
    for component in url.pathComponents.dropFirst() {
        current.appendPathComponent(component)
        if current.path == "/var" || current.path == "/tmp" || current.path == "/etc" {
            continue
        }
        var info = stat()
        if lstat(current.path, &info) == 0 {
            guard (info.st_mode & S_IFMT) != S_IFLNK else {
                throw RunnerError.invalidConfig("\(field) contains a symlink component: \(current.path)")
            }
        }
    }
}

func validateDiskLayout(_ config: RunConfig) throws {
    let expected: [(String, Bool)]
    if config.mode == "start" {
        expected = [("root", false), ("state", false), ("input", true)]
    } else {
        expected = [("collector", false), ("state", true)]
    }
    guard config.disks.count == expected.count else {
        throw RunnerError.invalidConfig("disk count does not match the fixed \(config.mode) layout")
    }
    let parent = URL(fileURLWithPath: config.disks[0].path).standardizedFileURL.deletingLastPathComponent()
    for (disk, rule) in zip(config.disks, expected) {
        let url = try requireAbsolute(disk.path, "disk \(disk.name)")
        guard disk.name == rule.0, disk.read_only == rule.1,
              url.lastPathComponent == "\(rule.0).img",
              url.deletingLastPathComponent() == parent else {
            throw RunnerError.invalidConfig("disk does not match the fixed owned \(config.mode) layout")
        }
        try rejectSymlinkComponents(url, "disk \(disk.name)")
    }
}

func loadConfig(_ path: String) throws -> RunConfig {
    let url = try requireAbsolute(path, "config")
    try rejectSymlinkComponents(url, "config")
    let data: Data
    do {
        data = try Data(contentsOf: url)
    } catch {
        throw RunnerError.ioFailure("cannot read config: \(error.localizedDescription)")
    }
    let raw: Any
    do {
        raw = try JSONSerialization.jsonObject(with: data)
    } catch {
        throw RunnerError.invalidConfig("config is not valid JSON")
    }
    try validateConfigShape(raw)
    let config: RunConfig
    do {
        config = try JSONDecoder().decode(RunConfig.self, from: data)
    } catch {
        throw RunnerError.invalidConfig("\(error)")
    }
    guard config.schema_version == 1 else {
        throw RunnerError.invalidConfig("schema_version must be 1")
    }
    guard config.topology == allowedTopology else {
        throw RunnerError.invalidConfig("topology must be \(allowedTopology)")
    }
    guard allowedModes.contains(config.mode) else {
        throw RunnerError.invalidConfig("mode must be start|collect")
    }
    guard config.cpu_count > 0, config.cpu_count <= maxCpuCount else {
        throw RunnerError.invalidConfig("cpu_count must be 1...\(maxCpuCount)")
    }
    guard config.memory_bytes > 0, config.memory_bytes <= maxMemoryBytes else {
        throw RunnerError.invalidConfig("memory_bytes must be within the VM ceiling")
    }
    guard config.deadline_ms > 0, config.deadline_ms <= 600_000 else {
        throw RunnerError.invalidConfig("deadline_ms must be positive and bounded")
    }
    guard config.serial_fd >= 3 else {
        throw RunnerError.invalidConfig("serial_fd must be an inherited descriptor >= 3")
    }
    guard !config.disks.isEmpty, config.disks.count <= maxDisks else {
        throw RunnerError.invalidConfig("disks must contain 1...\(maxDisks) entries")
    }
    var seen = Set<String>()
    for disk in config.disks {
        guard !seen.contains(disk.name) else {
            throw RunnerError.invalidConfig("duplicate disk name \(disk.name)")
        }
        seen.insert(disk.name)
    }
    try validateDiskLayout(config)
    _ = try requireAbsolute(config.boot.kernel, "boot.kernel")
    _ = try requireAbsolute(config.boot.initrd, "boot.initrd")
    return config
}


func emitStatus(_ object: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(object),
          let data = try? JSONSerialization.data(withJSONObject: object, options: []),
          let text = String(data: data, encoding: .utf8)
    else { return }
    FileHandle.standardOutput.write(Data((text + "\n").utf8))
}

private var signalSources: [DispatchSourceSignal] = []

func installStopHandlers() {
    for number in [SIGTERM, SIGINT] {
        signal(number, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: number, queue: .global())
        source.setEventHandler { VmController.requestStop() }
        source.resume()
        signalSources.append(source)
    }
}

final class VmController: NSObject, VZVirtualMachineDelegate {
    private let configuration: VZVirtualMachineConfiguration
    private let deadlineMs: Int
    private let queue = DispatchQueue(label: "l3.vz.serial")
    private var finished = false
    private var failure: String?
    private static let stopLock = NSLock()
    private static var stopRequested = false

    init(configuration: VZVirtualMachineConfiguration, deadlineMs: Int) {
        self.configuration = configuration
        self.deadlineMs = deadlineMs
    }

    static func requestStop() {
        stopLock.lock()
        stopRequested = true
        stopLock.unlock()
    }

    private static func shouldStop() -> Bool {
        stopLock.lock()
        defer { stopLock.unlock() }
        return stopRequested
    }

    func run() throws {
        let machine = VZVirtualMachine(configuration: configuration, queue: queue)
        let started = DispatchSemaphore(value: 0)
        var startError: Error?
        queue.sync {
            machine.delegate = self
            machine.start { result in
                if case let .failure(error) = result { startError = error }
                started.signal()
            }
        }
        guard started.wait(timeout: .now() + 30) == .success else {
            throw RunnerError.vmFailure("VM start timed out; state unknown")
        }
        if let startError {
            throw RunnerError.vmFailure("VM start failed: \(startError)")
        }
        emitStatus(["event": "started"])

        let deadline = DispatchTime.now() + .milliseconds(deadlineMs)
        var stopReason = "guest_stopped"
        while !queue.sync(execute: { finished }) {
            if Self.shouldStop() {
                stopReason = "host_stop_requested"
                break
            }
            if DispatchTime.now() >= deadline {
                stopReason = "deadline_exceeded"
                break
            }
            Thread.sleep(forTimeInterval: 0.05)
        }
        if stopReason != "guest_stopped" {
            emitStatus(["event": stopReason])
        }

        var stopWasNeeded = false
        queue.sync {
            if machine.state == .running || machine.state == .paused {
                stopWasNeeded = true
                if machine.canRequestStop {
                    _ = try? machine.requestStop()
                }
            }
        }
        if stopWasNeeded {
            let graceDeadline = DispatchTime.now() + .seconds(5)
            while !queue.sync(execute: { finished }) && DispatchTime.now() < graceDeadline {
                Thread.sleep(forTimeInterval: 0.05)
            }
            let stopResult = DispatchSemaphore(value: 0)
            var forceStopError: Error?
            var forceStopNeeded = false
            queue.sync {
                if machine.state == .running || machine.state == .paused {
                    forceStopNeeded = true
                    machine.stop { error in
                        forceStopError = error
                        stopResult.signal()
                    }
                }
            }
            if forceStopNeeded {
                guard stopResult.wait(timeout: .now() + 10) == .success else {
                    throw RunnerError.vmFailure("VM stop timed out; stopped state unknown")
                }
                if let forceStopError {
                    throw RunnerError.vmFailure("VM stop failed; stopped state unknown: \(forceStopError)")
                }
            }
        }
        if let failure = queue.sync(execute: { failure }) {
            throw RunnerError.vmFailure("guest stopped with error: \(failure)")
        }
        if stopReason == "deadline_exceeded" {
            throw RunnerError.vmFailure("guest exceeded VM deadline")
        }
        let finalState = queue.sync { machine.state }
        guard finalState == .stopped else {
            throw RunnerError.vmFailure("VM failed to reach stopped state (final state: \(finalState.rawValue)); stopped state unknown")
        }
        emitStatus(["event": "stopped"])
    }

    func guestDidStop(_ virtualMachine: VZVirtualMachine) {
        finished = true
    }

    func virtualMachine(_ virtualMachine: VZVirtualMachine, didStopWithError error: Error) {
        failure = "\(error)"
        finished = true
    }
}

func buildConfiguration(_ config: RunConfig) throws -> VZVirtualMachineConfiguration {
    let configuration = VZVirtualMachineConfiguration()
    configuration.cpuCount = config.cpu_count
    configuration.memorySize = UInt64(config.memory_bytes)

    let boot = try requireAbsolute(config.boot.kernel, "boot.kernel")
    let initrd = try requireAbsolute(config.boot.initrd, "boot.initrd")
    let loader = VZLinuxBootLoader(kernelURL: boot)
    loader.initialRamdiskURL = initrd
    loader.commandLine = config.boot.kernel_cmdline
    configuration.bootLoader = loader

    var disks: [VZStorageDeviceConfiguration] = []
    for disk in config.disks {
        let url = try requireAbsolute(disk.path, "disk \(disk.name)")
        let attachment = try VZDiskImageStorageDeviceAttachment(url: url, readOnly: disk.read_only)
        disks.append(VZVirtioBlockDeviceConfiguration(attachment: attachment))
    }
    configuration.storageDevices = disks

    let console = VZVirtioConsoleDeviceSerialPortConfiguration()
    let nullHandle = FileHandle(forReadingAtPath: "/dev/null")
    guard let readHandle = nullHandle else {
        throw RunnerError.ioFailure("/dev/null is not readable")
    }
    let writeHandle = FileHandle(fileDescriptor: Int32(config.serial_fd), closeOnDealloc: false)
    console.attachment = VZFileHandleSerialPortAttachment(
        fileHandleForReading: readHandle,
        fileHandleForWriting: writeHandle
    )
    configuration.serialPorts = [console]

    configuration.entropyDevices = [VZVirtioEntropyDeviceConfiguration()]
    configuration.memoryBalloonDevices = [VZVirtioTraditionalMemoryBalloonDeviceConfiguration()]

    // Explicitly empty communication-capable device sets.
    configuration.networkDevices = []
    configuration.socketDevices = []
    configuration.directorySharingDevices = []

    do {
        try configuration.validate()
    } catch {
        throw RunnerError.invalidConfig("configuration validation failed: \(error)")
    }
    return configuration
}

func runMain(_ arguments: [String]) throws {
    guard arguments.count == 4 else {
        throw RunnerError.usage("l3vz <validate|start|collect> --config <path>")
    }
    let command = arguments[1]
    guard ["validate", "start", "collect"].contains(command), arguments[2] == "--config" else {
        throw RunnerError.usage("l3vz <validate|start|collect> --config <path>")
    }
    let config = try loadConfig(arguments[3])
    if command != "validate", config.mode != command {
        throw RunnerError.invalidConfig("mode \(config.mode) does not match subcommand \(command)")
    }
    emitStatus([
        "event": "validated",
        "mode": config.mode,
        "cpu_count": config.cpu_count,
        "memory_bytes": config.memory_bytes,
        "disk_count": config.disks.count,
        "read_only_disks": config.disks.filter { $0.read_only }.count,
        "network_devices": 0,
        "socket_devices": 0,
        "directory_sharing_devices": 0,
    ])
    if command == "validate" { return }
    let configuration = try buildConfiguration(config)
    installStopHandlers()
    let controller = VmController(configuration: configuration, deadlineMs: config.deadline_ms)
    try controller.run()
}

do {
    try runMain(CommandLine.arguments)
} catch {
    emitStatus(["event": "error", "detail": "\(error)"])
    exit(2)
}
