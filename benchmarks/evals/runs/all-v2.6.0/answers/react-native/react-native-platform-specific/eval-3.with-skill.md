Wrap the iOS-only module behind a small platform-specific adapter, for example a NativeFeature.ios.ts module, and expose a shared TypeScript interface. Import that adapter from platform-neutral code so callers do not spread Platform.OS checks throughout the app.

Use an Expo module when one provides the capability; in a bare app use the community or custom native module. Provide an Android fallback or explicit unsupported result, guard calls with feature detection, and test the supported and unsupported paths on both platforms.



