# Long-list scroll performance test

Run the test on representative small and large phone form factors, using a realistic long-form dataset rather than placeholders.

1. Capture the initial list screenshot and hierarchy. Confirm the first items, loading indicators, and scroll container are rendered correctly.
2. Start `appium_mobile_performance_data` monitoring before interaction. Record CPU, memory, frame rate/jank, dropped frames, and any crashes or ANRs.
3. Scroll through the list continuously and at normal user speed. At pagination boundaries, verify loading indicators, that newly loaded items appear once, and that there are no duplicates or gaps.
4. Scroll farther, then back to the top. Check that content remains accurate, the scroll position behaves correctly, and cells do not visually corrupt, overlap, truncate, or lose images/text. Take screenshots at the initial, pagination, deep-scroll, and return-to-top states.
5. Exercise empty, loading, and error states where applicable, including recovery after a failed page load. Watch telemetry during the heaviest scroll and image-loading period.

Pass when scrolling remains responsive without sustained frame drops, excessive CPU or memory growth, crashes, ANRs, or visible jank; pagination is correct and idempotent; and all captured states remain visually/layout correct. Compare telemetry against the app's agreed performance budgets and attach screenshots, hierarchy dumps, device/configuration, dataset size, and the performance trace as evidence.
