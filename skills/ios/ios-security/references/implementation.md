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
