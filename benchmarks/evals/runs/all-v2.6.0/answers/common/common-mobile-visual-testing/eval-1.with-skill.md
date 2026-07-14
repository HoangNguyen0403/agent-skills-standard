Assumption: the app has a list screen with a seeded long dataset and supports iOS and Android test devices.

1. Capture a baseline with `appium_screenshot` and inspect hierarchy using `appium_get_source`.
2. Verify Loading, populated, Empty, and Error states before scrolling.
3. Start `appium_mobile_performance_data` monitoring.
4. Scroll from the top to the bottom repeatedly—at least 5 full passes—using normal and rapid gestures.
5. Verify:

   - Smooth scrolling with no visible freezes, dropped frames, blank cells, or incorrect item order.
   - No crash, ANR, memory growth, or excessive CPU usage.
   - Correct pagination/infinite loading, including duplicate/missing-item checks.
   - Scroll position remains stable while new pages load.
   - Pull-to-refresh and returning to the screen preserve correct data.
   - No unexpected system alerts; inspect hierarchy first, then use `appium_alert` → `accept` or `dismiss` if required.
   - Layout remains correct on the smallest and largest supported screen sizes.

6. Stop monitoring and report QoS from `appium_mobile_performance_data`, including CPU, memory, frame/scroll latency, loading time per page, crashes, and ANRs.

Pass criteria: all scroll passes complete without crashes or ANRs; pagination is accurate; no visible rendering defects occur; and CPU/memory/QoS remain within the project’s agreed thresholds. Record device, OS, dataset size, test duration, gestures per second, metrics, and screenshots for any failure.
