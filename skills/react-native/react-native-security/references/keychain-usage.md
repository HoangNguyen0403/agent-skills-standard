# React Native Security Reference

Keychain usage, SSL pinning, and secure deep linking examples.

## Keychain/Keystore Usage

```tsx
import * as Keychain from 'react-native-keychain';

// Save credentials
async function saveToken(token: string) {
  await Keychain.setGenericPassword('auth', token, {
    service: 'com.myapp.token',
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
}

// Retrieve credentials
async function getToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({
    service: 'com.myapp.token',
  });
  return credentials ? credentials.password : null;
}

// Delete credentials
async function clearToken() {
  await Keychain.resetGenericPassword({
    service: 'com.myapp.token',
  });
}

// Biometric authentication
async function saveBiometricToken(token: string) {
  await Keychain.setGenericPassword('auth', token, {
    service: 'com.myapp.token',
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
  });
}
```

## Biometric Authentication

```tsx
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

async function authenticateWithBiometrics() {
  // Check if biometrics available
  const { available, biometryType } = await rnBiometrics.isSensorAvailable();

  if (!available) {
    throw new Error('Biometric authentication not available');
  }

  // Prompt for biometric
  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: 'Authenticate to continue',
    cancelButtonText: 'Cancel',
  });

  if (success) {
    // Success - proceed with sensitive operation
    return true;
  }

  return false;
}
```

## Deep Link Validation

```tsx
import { Linking } from 'react-native';

const ALLOWED_SCHEMES = ['myapp'];
const ALLOWED_HOSTS = ['myapp.com', 'www.myapp.com'];

function validateDeepLink(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Check scheme
    if (!ALLOWED_SCHEMES.includes(parsed.protocol.replace(':', ''))) {
      console.warn('Invalid deep link scheme:', parsed.protocol);
      return false;
    }

    // Check host (for https links)
    if (
      parsed.protocol === 'https:' &&
      !ALLOWED_HOSTS.includes(parsed.hostname)
    ) {
      console.warn('Invalid deep link host:', parsed.hostname);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Invalid URL:', url);
    return false;
  }
}

// Usage in navigation linking
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url && validateDeepLink(url)) {
      return url;
    }
    return null;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => {
      if (validateDeepLink(url)) {
        listener(url);
      }
    };

    const subscription = Linking.addEventListener('url', onReceiveURL);
    return () => subscription.remove();
  },
};
```

## SSL Certificate Pinning

```tsx
import { fetch } from 'react-native-ssl-pinning';

// Certificate pinning configuration
const sslPinningConfig = {
  'api.myapp.com': {
    includeSubdomains: true,
    publicKeyHashes: [
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup
    ],
  },
};

async function secureFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...options,
      sslPinning: sslPinningConfig,
      timeoutInterval: 10000,
    });
    return await response.json();
  } catch (error) {
    if (error.message.includes('SSL')) {
      // Certificate pinning failed - possible MITM attack
      console.error('SSL Pinning failed:', error);
      // Alert user or log to monitoring service
    }
    throw error;
  }
}
```

**Get Certificate Hash**:

```bash
# For iOS (OpenSSL)
openssl s_client -connect api.myapp.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# For Android
keytool -printcert -jarfile app-release.apk
```

## Environment Variables

```bash
# .env
API_BASE_URL=https://api-dev.myapp.com
API_KEY=dev_key_12345
SENTRY_DSN=https://...

# .env.production
API_BASE_URL=https://api.myapp.com
API_KEY=prod_key_67890
SENTRY_DSN=https://...
```

```tsx
// Setup react-native-config
import Config from 'react-native-config';

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  headers: {
    'X-API-Key': Config.API_KEY,
  },
});
```

**.gitignore**:

```
.env
.env.local
.env.*.local
```

## Screenshot Prevention

```tsx
import ScreenGuardModule from 'react-native-screen-guard';

// Prevent screenshots on sensitive screens
useEffect(() => {
  ScreenGuardModule.register({
    backgroundColor: '#000000',
    timeAfterResume: 2000,
  });

  return () => {
    ScreenGuardModule.unregister();
  };
}, []);
```

## PII Masking

```tsx
// Mask sensitive data in logs
function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  const maskedUsername = username.slice(0, 2) + '***';
  return `${maskedUsername}@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, '*');
}

// Usage in analytics
analytics.track('User Login', {
  email: maskEmail(user.email),
  phone: maskPhone(user.phone),
});
```
