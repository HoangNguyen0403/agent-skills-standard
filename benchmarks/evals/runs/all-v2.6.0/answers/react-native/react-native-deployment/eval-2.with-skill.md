Create separate development, preview or staging, and production configurations. With EAS, define matching profiles in eas.json and provide environment variables through the profile or CI secret store. With a bare app, use separate Android product flavors and iOS schemes.

Keep environment files such as .env.dev, .env.staging, and .env.production out of version control when they contain secrets; react-native-config or the EAS environment facility can expose non-secret configuration at build time. Verify that the selected profile points to the intended API and never hardcode credentials in JavaScript.



