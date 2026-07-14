# Use a media foreground service

Use a `MediaSessionService` (typically from AndroidX Media3) for continuous music playback. A foreground service is designed for ongoing, user-visible work such as playback and can keep the player running after the app UI is closed. `WorkManager` is for deferrable, finite work; it is not a playback engine and should not be used to keep music playing.

With Media3, put the `ExoPlayer` and `MediaSession` in a `MediaSessionService`, return the session from `onGetSession()`, and release both in `onDestroy()`. Start playback in response to an allowed user action, and let Media3 manage the playback notification and service promotion. Declare the service with the `mediaPlayback` foreground-service type and the corresponding manifest permissions for the Android versions and target SDK you support. Request notification permission where required.

Also handle audio focus, noisy-audio events (for example, headphones unplugged), media-button controls, interruptions, and notification actions. Android background-start restrictions still apply, so do not expect to start arbitrary playback silently from the background. For a short, user-initiated operation, an ordinary bound service may be enough; for music that continues while the UI is gone, use the media foreground-service pattern.

