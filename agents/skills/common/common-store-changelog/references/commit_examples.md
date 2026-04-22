# Commit-to-Bullet Mapping Examples

## ✅ User-Facing Commits → Keep

| Raw Commit | App Store Bullet |
|---|---|
| `fix(auth): resolve token refresh race condition on iOS 17` | Fixed a login issue that could unexpectedly sign users out. |
| `feat(search): add voice input to search bar` | Search your library hands-free with the new voice input option. |
| `perf(timeline): lazy-load images to reduce scroll jank` | Scrolling through your timeline is now smoother and faster. |
| `feat(settings): add dark mode support` | Added dark-mode support to the settings screen. |
| `fix(cart): incorrect total when discount applied` | Fixed an issue where cart totals were calculated incorrectly with discounts. |
| `feat(checkout): save address for faster repeat orders` | Save your delivery address for faster checkout on future orders. |

## ❌ Internal-Only Commits → Drop (No User Bullet)

| Raw Commit | Reason to Drop |
|---|---|
| `chore: upgrade fastlane to 2.219` | Build tooling — no user impact |
| `refactor(network): extract URLSession wrapper into module` | Code organisation — invisible to users |
| `ci: add nightly build job` | CI/CD — no user impact |
| `deps: bump retrofit from 2.9.0 to 2.10.0` | Dependency bump — no user-visible change |
| `test: add unit tests for PaymentViewModel` | Testing only — no user impact |
| `build(gradle): migrate to version catalog` | Build config — no user impact |

## Google Play Compression Example

**App Store draft (5 bullets, ~320 chars):**
```
• Search your library hands-free with the new voice input option.
• Scrolling through your timeline is now smoother and faster.
• Fixed a login issue that could leave some users unexpectedly signed out.
• Added dark-mode support to the settings screen.
• Improved load times when opening large photo albums.
```

**Google Play compressed (≤ 500 chars, ~230 chars):**
```
• New voice search in library.
• Smoother timeline scrolling.
• Fixed unexpected sign-outs on iOS 17.
• Dark mode in settings.
Bug fixes and performance improvements.
```
