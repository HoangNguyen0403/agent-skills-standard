# T10 local landing verification acceptance

Accepted: final local implementation and exercised accessibility/disabled-collection behavior, not deployment/publication or full initiative release readiness.

Independent reviewer `0a7a3a0b` accepted final player `a39ab7ff5f68d49dbf9fe26402ad91355321cb7b96918d6e91905e5a824cd68b` and tests `e4de111460908d810c0f6e55167589c6356f6abf6c697472ebcb4cd81132efbf`. Fabricated runtime range, incomplete scorecard command and raw/unedited transcript claims are removed. Visible candidate/tree/context, edited-pacing disclosure and open release gate remain. The full sanitized video transcript is linked prominently; scene summaries are labeled accurately.

Worker evidence (not parent execution): typecheck and fresh SITE_URL-bound production build pass; focused 12/12 browser cases pass; full browser suite initially 69 pass/3 document-versus-viewport geometry failures, then 72/72 after preserving the unchanged document-position invariant. Same-origin fetch/XHR/beacon instrumentation, clipboard, actual playback/caption transition, transcript keyboard navigation and no-JS resource/disclosure cases pass. The known preflight Vitest/undici failure remains unrelated and unmodified.

Parent final actual Chromium browser smoke against production static export, both 1280×800 and 390×844:
- Trusted Get started click and init-copy button: exact clipboard command.
- Real playback time advances; seek completion awaited at 20s, readyState 4, 1920×1080 decoded, no media error.
- Seven loaded captions; active cue 15.5–22s corresponds to native directories/lockfile and disabled MCP. Cue count is a fixture observation, not a permanent wording/default test.
- Enter on native details summary opens it; page has no horizontal overflow and no page errors or external HTTP requests during the observed actions.
- Located the actual browser-native “enter full screen” control through the accessibility tree; dispatched trusted mouse clicks to its native box. `document.fullscreenElement === VIDEO` at both widths. Escape exercised after capture.
- Parent inspected actual mobile normal-player and fullscreen screenshots. Native mobile caption is readable/wrapped; terminal text remains small, with the linked transcript as text alternative. Portrait fullscreen is not evidence of landscape rotation, Safari, or physical-device behavior.

Evidence screenshots retained under `website/.playwright-cli/parent-playing-{1280,390}.png` and `parent-fullscreen-{1280,390}.png`. Parent disposable observer scripts removed and parent static server stopped after proof.

Local T10 surface evidence supports AC-23's observed-page grounding, AC-27's evidenced captioned demo and disabled-path AC-31 through combined worker runtime evidence, independent source review and parent actual surface observations. The durable tutorial link is supporting usability evidence, not AC-28; qualified measurement recommendations are covered separately by T02 synthetic evidence. No claim of arbitrary collector absence beyond inspected code/exercised actions. T08 intentionally deferred per user choice; enabled AC-29/30/32 not implemented or passed. Full G4 still needs covering initiative verification; formal numeric evidence bridge, remote AC-16, live outcomes, human UAT and all publication/collection/deployment/release permissions remain open. Delivery is not causal growth or ROI evidence.
