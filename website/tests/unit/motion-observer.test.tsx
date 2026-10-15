import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MotionObserver } from '@/landing/MotionObserver.client';
import { HeroSection } from '@/landing/sections/HeroSection';

type QueuedDelivery = () => void;

function createIntersectingEntry(target: Element): IntersectionObserverEntry {
  const bounds = target.getBoundingClientRect();
  return {
    boundingClientRect: bounds,
    intersectionRatio: 1,
    intersectionRect: bounds,
    isIntersecting: true,
    rootBounds: null,
    target,
    time: 0,
  };
}

describe('MotionObserver', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('MotionObserver_WhenQueuedIntersectionArrivesAfterControllerUnmount_KeepsConnectedConsumerMarkupUnchanged', () => {
    let deliverQueuedEntry: QueuedDelivery | undefined;

    class ControlledIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0];

      constructor(
        private readonly callback: IntersectionObserverCallback,
      ) {}

      observe(target: Element): void {
        if (target.getAttribute('data-motion') !== 'hero') return;
        const entry = createIntersectingEntry(target);
        deliverQueuedEntry = () => this.callback([entry], this);
      }

      unobserve(): void {}

      disconnect(): void {}

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    const mediaQuery = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    } satisfies MediaQueryList;

    vi.stubGlobal('IntersectionObserver', ControlledIntersectionObserver);
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));

    const consumer = render(<HeroSection />);
    const heading = screen.getByRole('heading', {
      level: 1,
      name: /your coding agent\. your engineering standards\./i,
    });
    const heroTarget = heading
      .closest('section')
      ?.querySelector('[data-motion="hero"]');
    if (!(heroTarget instanceof HTMLElement)) {
      throw new Error('The rendered HeroSection motion target is required.');
    }
    expect(heroTarget).toHaveAttribute('data-motion-state', 'idle');

    const controller = render(<MotionObserver />);
    const retiredDelivery = deliverQueuedEntry;
    if (!retiredDelivery) {
      throw new Error('The browser observer did not retain the hero notification.');
    }

    controller.unmount();
    expect(consumer.container).toContainElement(heroTarget);
    expect(heroTarget).toHaveAttribute('data-motion-state', 'idle');

    act(() => retiredDelivery());

    expect(consumer.container).toContainElement(heroTarget);
    expect(heroTarget).toHaveAttribute('data-motion-state', 'idle');
  });
});
