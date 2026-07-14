Assumptions: the list contains 10,000 items, scrolling is performed on representative low-, mid-, and high-end iOS/Android devices, and the target display refresh rate is 60 Hz.

Test procedure:

1. Launch the app with a cold start and open the long list.
2. Scroll slowly from top to bottom.
3. Perform repeated fast flings for 5 minutes.
4. Repeat after returning from background and after loading additional data.
5. Record FPS, frame time, dropped/janky frames, touch-to-scroll latency, CPU, memory, battery drain, crashes, and ANRs.
6. Repeat with images, dynamic content, pagination, and offline mode enabled where applicable.

Acceptance criteria:

- Sustained performance of approximately 60 FPS.
- Frame time ≤16.7 ms on 60-Hz devices.
- No visible blank rows, layout jumps, scroll-position loss, or delayed touch response.
- No crashes or ANRs.
- Memory remains stable without continuous growth or observable leaks.
- No progressive FPS degradation during the 5-minute test.
- Data loads without blocking scrolling.

Recommended diagnostics:

- Android: `adb shell dumpsys gfxinfo`, Android Studio Profiler, and Macrobenchmark.
- iOS: Instruments Core Animation, Time Profiler, Allocations, and Leaks.

Report results by device, OS version, list size, scroll mode, average/p95 FPS, janky-frame percentage, peak memory, CPU usage, battery impact, and observed defects.
