Use the platform conventions first.

- Keep navigation shallow and predictable.
- Use standard containers like `UINavigationController`, `UITabBarController`, and split view where they fit.
- Make back behavior consistent and gesture-friendly.
- Give every destination a clear title and obvious primary action.
- Pass only the data a screen needs; avoid coupling screens tightly.
- Centralize route creation/coordinator logic if flows are getting complex.
- Support deep links and state restoration if navigation matters across launches.
- Keep transitions simple unless custom motion adds real clarity.
- Make navigation accessible: labels, focus order, large titles, dynamic type, and hit targets.
- Test happy paths, back navigation, modal dismissal, interrupted flows, and deep-link entry points.

If you want, I can also show a good UIKit or SwiftUI navigation structure.

