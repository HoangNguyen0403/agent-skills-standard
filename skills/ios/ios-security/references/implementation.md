# iOS Security Implementation

## Using Keychain (Wrapper Recommendation)

```swift
import Valet

let valet = Valet.valet(with: Identifier(nonEmpty: "com.app.secrets")!, accessibility: .whenUnlocked)

// Save
valet.setString("secret_token", forKey: "authToken")

// Get
let token = valet.string(forKey: "authToken")
```

## Biometric Authentication

```swift
import LocalAuthentication

func authenticateUser() {
    let context = LAContext()
    var error: NSError?

    if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
        let reason = "Authenticate to access your profile"
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authenticationError in
            DispatchQueue.main.async {
                if success {
                    // Success
                } else {
                    // Handle failure (e.g., fallback to PIN)
                }
            }
        }
    }
}
```

## Secure Data Save

```swift
let secretData = "Top Secret".data(using: .utf8)!
let fileURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("secret.txt")

try secretData.write(to: fileURL, options: .completeFileProtection)
```

## Keychain Storage (Raw SecItem)

```swift
func storeToken(_ token: String, for account: String) throws {
    let data = Data(token.utf8)
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecValueData as String: data,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else { throw KeychainError.unhandledError(status) }
}
```

## Biometric Authentication

```swift
let context = LAContext()
var error: NSError?
guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
    // Handle unavailable biometrics
    return
}
context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                       localizedReason: "Authenticate to access your account") { success, error in
    // Handle result on MainActor
}
```
