# Mobile — appium-mcp Context

Project-specific reference for the Mobile Flutter app on LambdaTest.

## Project Facts

| Property                | Value                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| App package (Android)   | `com.androidapp.uat`                                                                              |
| App activity (Android)  | `com.androidapp.MainActivity`                                                                     |
| UI framework            | Flutter (renders to one `FlutterSurfaceView`)                                                                 |

## Default device — Galaxy S26+ / Android 16

Lock to one device per run. **Galaxy ships One UI**, not stock Android — system dialogs differ in position and text (e.g. "Allow" vs "While using the app").

## App-id resolution

```bash
./scripts/lambdatest-app-upload.sh --source pipeline
# → emits lt://APP... on stdout
```

## Common overlays after launch (cold-start)

| #   | Overlay                               | How to dismiss                                          |
| --- | ------------------------------------- | ------------------------------------------------------- |
| 1   | Notification permission dialog        | `find_element(uiautomator, text("Allow"))` → tap.       |
| 2   | Onboarding splash carousel            | Tap CTA centered near bottom of screen (~y=2180).       |
| 3   | Promo banner modal                    | Top-right `×` close button.                             |
| 4   | eZpoint reminder modal                | Modal CTA y ≈ 2050 on 1080×2340.                        |

### Gesture-inset gotcha (Samsung One UI)

Samsung's gesture-nav reserves the bottom **~150px**. Simple `tap` events at `y > 2200` are intercepted by the OS.
- **Bottom-nav tabs**: target `y ≤ 2150`.
- **Modal CTA buttons**: target `y ≈ 2050`, not `y ≥ 2100`.

## Fast login macro (Indonesia market)

1. tap(x=540, y=800)              # username field
2. set_value(text=<username>, w3cActions=true)
3. tap(x=540, y=1080)             # password field
4. set_value(text=<password>, w3cActions=true)
5. keyboard(action=hide)
6. tap(x=540, y=1370)             # Masuk button

## App language ≠ market

**Country selection at login sets the _market_ (backend region) — it does NOT set the UI language.** UI language is an account preference.

To switch app language:
1. Open bottom-nav `More` tab.
2. Tap `Profile`.
3. Find `Language` dropdown and select target.

## Screenshot discipline

Screenshots are expensive. Use lower-resolution for navigation checks; full-res only for the final verdict.

| Purpose                  | Resolution      | When to use                                   |
| ------------------------ | --------------- | --------------------------------------------- |
| Navigation check         | `maxWidth=300`  | After taps to confirm screen identity.        |
| Find element / read text | `maxWidth=540`  | When agent needs to read text or count items. |
| Verdict evidence         | full resolution | One per AC pass / fail.                       |
