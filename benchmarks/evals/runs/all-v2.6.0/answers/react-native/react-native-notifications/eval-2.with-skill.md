Do not request permission during the first render. Show an in-app explanation at a useful point in the user journey, explain the benefit, and request system authorization only after the user opts in. Persist enough state to avoid repeatedly showing the rationale, while still honoring the platform's denied or restricted result.

Configure the Android channel and iOS APNs settings separately, and handle foreground, background, and quit notification lifecycles. If permission is denied, keep the app usable and provide a deliberate settings path rather than repeatedly opening the system dialog.



