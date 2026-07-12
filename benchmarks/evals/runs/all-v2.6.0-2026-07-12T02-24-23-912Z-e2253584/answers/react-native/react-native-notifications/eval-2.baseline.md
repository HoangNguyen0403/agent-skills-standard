# Avoiding an immediate permission denial

Do not request permission during the first render or app bootstrap. First show a short, contextual explanation of what notifications provide, then request permission when the user reaches a feature that benefits from it or taps an enable action. Make the prompt optional and do not block core app usage.

On iOS, request authorization only after the explanation; on Android 13+, request the runtime notification permission at the same contextual point. Track the permission status and distinguish `notDetermined`, granted, denied, and permanently blocked. If the user denies, respect the choice, provide useful in-app alternatives, and offer a settings link later without repeatedly prompting. On subsequent launches, check status rather than calling request blindly.

Test fresh install, upgrade, denial, re-enable from settings, device-level disabled notifications, and both platforms. Keep notification registration/token upload conditional on permission and handle token refresh independently.

