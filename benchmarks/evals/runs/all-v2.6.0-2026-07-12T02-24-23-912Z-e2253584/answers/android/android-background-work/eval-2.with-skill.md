# Background music

Use a **Foreground Service** for music playback. Playback is a user-visible, ongoing task, so it is one of the cases where a foreground service is appropriate. It keeps playback alive when the app UI is no longer visible and must show a persistent media notification with playback controls.

WorkManager is not suitable for the playback loop: its work is deferrable and is not intended for continuous, latency-sensitive audio. Use WorkManager for related deferrable jobs such as uploading listening history or downloading non-urgent artwork.

Start the service from an explicit user action, promote it to the foreground immediately, and declare the media-playback foreground-service type and required foreground-service permissions for the Android versions you support. A media-session-based service, such as Media3's `MediaSessionService`, is a suitable implementation for the player and notification integration.

