# Baseline answer

Measure scrolling performance under a realistic long-list workload and verify both smoothness and visual correctness.

1. Start from a clean, repeatable state with the same device model, OS version, build, data set, network conditions, and app configuration. Record whether the list uses images, pagination, ads, or dynamic content.
2. Capture a baseline before scrolling: launch time, initial memory, CPU/GPU utilization, rendered frame rate, and any visible layout or loading issues.
3. Scroll from the top to the bottom using a consistent gesture pattern and duration. Repeat at slow, normal, and fast speeds, and include direction changes, pauses, and any infinite-scroll or pagination boundaries. Run enough repetitions to expose intermittent jank, not just one pass.
4. Monitor frame timing while scrolling. Look for dropped frames, long frames, unstable frame pacing, blank cells, delayed image loading, flicker, jumps caused by cell height changes, accidental taps, touch latency, and scroll-position loss. A 60 Hz device generally has about 16.7 ms per frame; a 120 Hz device has about 8.3 ms, so use the device's refresh rate when interpreting frame deadlines.
5. Monitor resource behavior over the entire run: CPU/GPU spikes, memory growth, garbage-collection pauses, battery/thermal throttling, network bursts, and disk activity. Check that memory returns or stabilizes after leaving the list and that repeated visits do not progressively degrade performance.
6. Validate functional and visual states at the same time: loading placeholders, empty and error states, newly appended items, image aspect ratios, text truncation, sticky headers, accessibility text scaling, dark mode, and landscape/portrait layouts. Compare screenshots at deterministic checkpoints if visual regression is part of the test.
7. Repeat on representative low-, mid-, and high-tier devices and with slow or unavailable network conditions. Test long text and large images because they often reveal cell-measurement and recycling problems.

Pass criteria should be agreed in advance, for example: no unacceptable interaction failures, no visible blanking or layout jumps, frame-time and jank thresholds within the product target, bounded memory growth, successful pagination, and no crash or thermal shutdown. Save the device/build/test-data details, performance traces, screenshots or video, metrics, reproduction steps, and comparison with the baseline. A failure should identify the exact scroll segment and state so it can be reproduced and profiled.
