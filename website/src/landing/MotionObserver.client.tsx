"use client";

import { useEffect } from "react";

export type MotionKind = "hero" | "divider" | "skill" | "workflow" | "routing";
export type MotionState = "idle" | "running" | "complete";
interface ActiveMotionRun {
  animations: CSSAnimation[];
}

const MAX_SIMULTANEOUS = 3;

/**
 * MotionObserver mounts once on LandingPage.
 * Uses a single IntersectionObserver to manage bounded, one-shot CSS/SVG animations
 * on elements with declarative [data-motion] hooks.
 * Retains visibility tracking while running/queued to support active offscreen cancellation.
 */
export function MotionObserver(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let disposed = false;
    const activeRuns = new Map<HTMLElement, ActiveMotionRun>();
    const activeRafs = new Map<HTMLElement, number>();
    const queuedElements: HTMLElement[] = [];
    const queuedReplays = new Set<HTMLElement>();
    const completedElements = new Set<HTMLElement>();
    // Pending RAF starts and active native runs own slots; queued targets do not.
    const slotOwners = new Set<HTMLElement>();

    const isElementInViewport = (el: HTMLElement): boolean => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    const drainQueue = () => {
      if (disposed) return;
      while (
        queuedElements.length > 0 &&
        slotOwners.size < MAX_SIMULTANEOUS &&
        !reducedMotionQuery.matches &&
        document.visibilityState !== "hidden"
      ) {
        const next = queuedElements.shift();
        if (!next) break;

        if (!isElementInViewport(next)) {
          next.setAttribute("data-motion-state", "complete");
          completedElements.add(next);
          queuedReplays.delete(next);
          observer.unobserve(next);
          continue;
        }

        const isReplay = queuedReplays.delete(next);
        startElement(next, isReplay);
      }
    };

    const cancelActiveRun = (el: HTMLElement) => {
      const run = activeRuns.get(el);
      if (!run) return;

      // Drop ownership before cancellation settles the run's finished promises.
      activeRuns.delete(el);
      run.animations.forEach((animation) => animation.cancel());
    };

    const completeElement = (
      el: HTMLElement,
      finishedRun?: ActiveMotionRun,
    ) => {
      if (disposed) return;
      const activeRun = activeRuns.get(el);
      if (finishedRun && activeRun !== finishedRun) return;
      if (activeRun) {
        activeRuns.delete(el);
        if (activeRun !== finishedRun) {
          activeRun.animations.forEach((animation) => animation.cancel());
        }
      }

      const raf = activeRafs.get(el);
      if (typeof raf === "number") {
        window.cancelAnimationFrame(raf);
        activeRafs.delete(el);
      }
      const queueIndex = queuedElements.indexOf(el);
      if (queueIndex !== -1) queuedElements.splice(queueIndex, 1);
      queuedReplays.delete(el);

      el.setAttribute("data-motion-state", "complete");
      completedElements.add(el);
      slotOwners.delete(el);
      observer.unobserve(el);
      drainQueue();
    };

    const cancelAllActive = (finalState: MotionState = "complete") => {
      for (const el of activeRuns.keys()) {
        cancelActiveRun(el);
        if (!disposed) {
          el.setAttribute("data-motion-state", finalState);
          completedElements.add(el);
          observer.unobserve(el);
        }
      }

      for (const [el, raf] of activeRafs) {
        window.cancelAnimationFrame(raf);
        activeRafs.delete(el);
        if (!disposed) {
          el.setAttribute("data-motion-state", finalState);
          completedElements.add(el);
          observer.unobserve(el);
        }
      }

      for (const el of queuedElements) {
        if (!disposed) {
          el.setAttribute("data-motion-state", finalState);
          completedElements.add(el);
          observer.unobserve(el);
        }
      }
      queuedElements.length = 0;
      queuedReplays.clear();
      slotOwners.clear();
    };

    const startElement = (el: HTMLElement, isReplay = false) => {
      if (
        disposed ||
        activeRuns.has(el) ||
        activeRafs.has(el) ||
        queuedElements.includes(el)
      )
        return;

      if (reducedMotionQuery.matches || document.visibilityState === "hidden") {
        el.setAttribute("data-motion-state", "complete");
        completedElements.add(el);
        observer.unobserve(el);
        return;
      }

      if (!isElementInViewport(el)) {
        el.setAttribute("data-motion-state", "complete");
        completedElements.add(el);
        observer.unobserve(el);
        return;
      }

      if (!slotOwners.has(el) && slotOwners.size >= MAX_SIMULTANEOUS) {
        queuedElements.push(el);
        if (isReplay) queuedReplays.add(el);
        return;
      }

      slotOwners.add(el);
      completedElements.delete(el);

      const startAnimation = () => {
        if (disposed) return;
        el.setAttribute("data-motion-state", "running");
        const animations = el
          .getAnimations({ subtree: true })
          .filter(
            (animation): animation is CSSAnimation =>
              animation instanceof CSSAnimation,
          );

        if (animations.length === 0) {
          completeElement(el);
          return;
        }

        const run: ActiveMotionRun = { animations };
        activeRuns.set(el, run);
        void Promise.all(
          animations.map((animation) =>
            animation.finished.then(
              () => true,
              () => false,
            ),
          ),
        ).then((finished) => {
          if (disposed || activeRuns.get(el) !== run) return;
          completeElement(
            el,
            finished.every((animationFinished) => animationFinished)
              ? run
              : undefined,
          );
        });
      };

      if (isReplay) {
        el.setAttribute("data-motion-state", "idle");
        const raf = window.requestAnimationFrame(() => {
          if (disposed) return;
          activeRafs.delete(el);
          if (
            reducedMotionQuery.matches ||
            document.visibilityState === "hidden" ||
            !isElementInViewport(el)
          ) {
            completeElement(el);
            return;
          }
          startAnimation();
        });
        activeRafs.set(el, raf);
        return;
      }

      startAnimation();
    };

    const targets = document.querySelectorAll<HTMLElement>("[data-motion]");
    targets.forEach((el) => {
      if (reducedMotionQuery.matches) {
        el.setAttribute("data-motion-state", "complete");
        completedElements.add(el);
      } else if (!el.getAttribute("data-motion-state")) {
        el.setAttribute("data-motion-state", "idle");
      }
    });

    // Single IntersectionObserver for all declarative motion elements.
    // Retains observation while elements are pending/running to support offscreen cancellation.
    const observer = new IntersectionObserver(
      (entries) => {
        if (disposed) return;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            if (
              !completedElements.has(el) &&
              el.getAttribute("data-motion-state") === "idle"
            ) {
              startElement(el);
            }
            continue;
          }

          if (
            activeRuns.has(el) ||
            activeRafs.has(el) ||
            queuedElements.includes(el)
          ) {
            completeElement(el);
          }
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    targets.forEach((el) => {
      const state = el.getAttribute("data-motion-state");
      if (state !== "complete") {
        observer.observe(el);
      } else {
        completedElements.add(el);
      }
    });

    // Replay handler: coordinates user-initiated Replay walkthrough through the same
    // local capacity, visibility, dynamic reduced-motion, and cancellation lifecycle.
    const handleReplayEvent = (event: Event) => {
      if (disposed) return;
      const target = event.target as HTMLElement;
      if (!target || typeof target.getAttribute !== "function") return;

      const kind = target.getAttribute("data-motion");
      if (!kind) return;

      event.preventDefault();

      if (reducedMotionQuery.matches) {
        completeElement(target);
        return;
      }
      if (
        document.visibilityState === "hidden" ||
        !isElementInViewport(target)
      ) {
        completeElement(target);
        return;
      }

      cancelActiveRun(target);
      const existingRaf = activeRafs.get(target);
      if (typeof existingRaf === "number") {
        window.cancelAnimationFrame(existingRaf);
        activeRafs.delete(target);
      }
      const queueIndex = queuedElements.indexOf(target);
      if (queueIndex !== -1) queuedElements.splice(queueIndex, 1);
      queuedReplays.delete(target);

      target.setAttribute("data-motion-state", "idle");
      completedElements.delete(target);
      observer.observe(target);
      startElement(target, true);
    };

    document.addEventListener("motion-replay", handleReplayEvent);

    // Dynamic prefers-reduced-motion listener
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      if (disposed || !e.matches) return;
      cancelAllActive("complete");
      observer.takeRecords();
      observer.disconnect();
      document.querySelectorAll<HTMLElement>("[data-motion]").forEach((el) => {
        el.setAttribute("data-motion-state", "complete");
      });
    };
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    // Document visibility change listener: cancel decorations when hidden (no burst on return)
    const handleVisibilityChange = () => {
      if (!disposed && document.visibilityState === "hidden") {
        cancelAllActive("complete");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      observer.takeRecords();
      observer.disconnect();
      document.removeEventListener("motion-replay", handleReplayEvent);
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAllActive("complete");
    };
  }, []);

  return null;
}
