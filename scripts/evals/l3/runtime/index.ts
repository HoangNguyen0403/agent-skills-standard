/**
 * scripts/evals/l3/runtime/index.ts
 *
 * Public surface of the D2 runtime slice, consumed by D4 integration.
 *
 * Backend: minimal direct Apple Virtualization.framework runner. No host/guest
 * control channel exists at any stage; guest applications are delivered as
 * source and are packaged into the approved image by provisioning (D5).
 *
 * No live containment or candidate-efficacy claim is made by this module.
 */

export * from "./types";
export * from "./process-io";
export * from "./process-identity";
export * from "./authority";
export * from "./vz";
export * from "./bundle";
export * from "./session";
export * from "./guest/protocol";
export * from "./guest/channel";
export * from "./guest/auxiliary";
export * from "./guest/invocation";
export * from "./guest/inputs";
export * from "./guest/runtime";
export * from "./guest/controller";
export * from "./guest/collector";
export * from "./collector";
export * from "./runtime";
export * from "./guest/queue-observer";
export * from "./guest/stubs-server";
export * from "./guest/trust";
export * from "./guest/evidence";
export * from "./guest/safe-fs";
export * from "./guest/stage-reader";
export * from "./guest/build-policy";
