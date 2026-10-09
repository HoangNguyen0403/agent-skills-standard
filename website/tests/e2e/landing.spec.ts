import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const commands = {
  init: 'npx agent-skills-standard@latest init',
  sync: 'npx agent-skills-standard@latest sync',
};

async function animationCount(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const running = element.getAnimations({ subtree: true }).filter((animation) =>
      animation instanceof CSSAnimation && animation.playState === 'running',
    );
    if (running.some((animation) => animation.effect?.getComputedTiming().iterations === Infinity)) {
      throw new Error('A decorative animation is running without a finite iteration bound.');
    }
    return running.length;
  });
}

async function trackAnimationLifecycle(
  locator: Locator,
  key: string,
  requireViewportIntersection = false,
): Promise<number> {
  return locator.evaluate((element, options) => new Promise<number>((resolve, reject) => {
    const maximumCaptureFrames = 30;
    let capturedFrames = 0;
    const captureRunningAnimation = () => {
      capturedFrames += 1;
      const bounds = element.getBoundingClientRect();
      if (options.requireViewportIntersection && (bounds.bottom <= 0 || bounds.top >= innerHeight)) {
        reject(new Error('The observed animation target must currently intersect the browser viewport.'));
        return;
      }
      const running = element.getAnimations({ subtree: true }).filter((animation): animation is CSSAnimation =>
        animation instanceof CSSAnimation && animation.playState === 'running',
      );
      if (running.some((animation) => animation.effect?.getComputedTiming().iterations === Infinity)) {
        reject(new Error('A decorative animation is running without a finite iteration bound.'));
        return;
      }
      if (running.length > 0) {
        const observations = (window as Window & {
          __motionObservations?: Record<string, Promise<string>[]>;
        }).__motionObservations ?? {};
        observations[options.key] = running.map((animation) =>
          animation.finished.then(() => 'finished', () => 'canceled'),
        );
        (window as Window & {
          __motionObservations?: Record<string, Promise<string>[]>;
        }).__motionObservations = observations;
        resolve(running.length);
        return;
      }
      if (capturedFrames >= maximumCaptureFrames) {
        reject(new Error(
          `No active CSSAnimation was captured within ${maximumCaptureFrames} native animation frames; ` +
          'the finite animation may have completed before capture.',
        ));
        return;
      }
      requestAnimationFrame(captureRunningAnimation);
    };
    requestAnimationFrame(captureRunningAnimation);
  }), { key, requireViewportIntersection });
}

async function expectObservedCancellation(page: Page, key: string): Promise<void> {
  const outcomes = await page.evaluate(async (observationKey) => {
    const observations = (window as Window & { __motionObservations?: Record<string, Promise<string>[]> }).__motionObservations;
    const tracked = observations?.[observationKey];
    if (!tracked?.length) throw new Error(`No active animation references were captured for ${observationKey}.`);
    return Promise.all(tracked);
  }, key);
  expect(outcomes.length).toBeGreaterThan(0);
  expect(outcomes).toEqual(outcomes.map(() => 'canceled'));
}

async function prepareMotionPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const browser = window as Window & {
      __motionCapacity?: Record<string, { raf: number; frames: MotionCapacityObservation[] }>;
      __motionEvidence?: MotionBrowserEvidence;
    };
    const measureMotionTarget = (target: HTMLElement): MotionTargetMeasurement => {
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      return {
        bounds: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
        display: style.display,
        visibility: style.visibility,
        state: target.getAttribute('data-motion-state'),
        eligible: document.visibilityState === 'visible' && style.display !== 'none' &&
          style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 &&
          rect.left < innerWidth && rect.right > 0 && rect.top < innerHeight - 40 && rect.bottom > 0,
      };
    };
    const evidence: MotionBrowserEvidence = {
      targets: new Map(),
      animationOwners: new Map(),
      targetIds: new WeakMap(),
      animations: new Map(),
      animationEffectTargets: new Map(),
      animationIds: new WeakMap(),
      outcomes: new Map(),
      events: [],
      measureTarget: measureMotionTarget,
      targetId(target) {
        let id = evidence.targetIds.get(target);
        if (!id) {
          id = `target-${evidence.targets.size}`;
          evidence.targetIds.set(target, id);
          evidence.targets.set(id, target);
        }
        return id;
      },
      animationId(target, animation) {
        const targetId = evidence.targetId(target);
        let id = evidence.animationIds.get(animation);
        if (!id) {
          id = `animation-${evidence.animations.size}`;
          evidence.animationIds.set(animation, id);
          evidence.animations.set(id, animation);
          evidence.animationEffectTargets.set(
            id,
            animation.effect instanceof KeyframeEffect ? animation.effect.target : null,
          );
          evidence.animationOwners.set(id, targetId);
          evidence.outcomes.set(id, animation.finished.then(
            () => ({ outcome: 'finished' as const, time: performance.now() }),
            () => ({ outcome: 'canceled' as const, time: performance.now() }),
          ));
        }
        return id;
      },
      capturePhase() {
        const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-motion]'));
        return {
          time: performance.now(),
          scrollY: window.scrollY,
          innerHeight: window.innerHeight,
          maxScrollY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
          targets: targets.map((target) => {
            const measurement = measureMotionTarget(target);
            const animations = target.getAnimations({ subtree: true })
              .filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation);
            return {
              id: evidence.targetId(target),
              kind: target.getAttribute('data-motion') ?? '',
              ...measurement,
              animationIds: animations.map((animation) => evidence.animationId(target, animation)),
              runningAnimationIds: animations.filter((animation) => animation.playState === 'running')
                .map((animation) => evidence.animationId(target, animation)),
            };
          }),
        };
      },
    };
    browser.__motionEvidence = evidence;
    const recordLifecycleEvent = (event: AnimationEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-motion]')
        : null;
      if (!target) return;
      const targetId = evidence.targetId(target);
      evidence.events.push({
        type: event.type as MotionLifecycleEvent['type'],
        targetId,
        animationName: event.animationName,
        time: performance.now(),
      });
    };
    document.addEventListener('animationstart', recordLifecycleEvent, true);
    document.addEventListener('animationend', recordLifecycleEvent, true);
    document.addEventListener('animationcancel', recordLifecycleEvent, true);

    const record = { raf: 0, frames: [] as MotionCapacityObservation[] };
    const sample = (frame: number) => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-motion]'));
      const targetMeasurementsById = Object.fromEntries(targets.map((target) => {
        const targetId = evidence.targetId(target);
        return [targetId, measureMotionTarget(target)] as const;
      }));
      const eligibleTargetIds = Object.entries(targetMeasurementsById)
        .flatMap(([targetId, measurement]) => measurement.eligible ? [targetId] : []);
      const activeAnimationsByTarget = new Map<HTMLElement, string[]>();
      let invalid: string | undefined;
      const activeTargets = targets.flatMap((target, index) => {
        const animations = target.getAnimations({ subtree: true })
          .filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation);
        const running = animations.filter((animation) => animation.playState === 'running');
        if (running.some((animation) => animation.effect?.getComputedTiming().iterations === Infinity)) {
          invalid = 'A decorative animation is running without a finite iteration bound.';
        }
        if (running.length) {
          activeAnimationsByTarget.set(target, running.map((animation) => evidence.animationId(target, animation)));
        }
        return running.length ? [index] : [];
      });
      const activeTargetIds = Array.from(activeAnimationsByTarget.keys()).map((target) => evidence.targetId(target));
      const animationIdsByTarget = Object.fromEntries(Array.from(activeAnimationsByTarget, ([target, ids]) =>
        [evidence.targetId(target), ids] as const,
      ));
      const routingTarget = targets.find((target) => target.getAttribute('data-motion') === 'routing');
      record.frames.push({
        frame,
        time: performance.now(),
        documentVisibilityState: document.visibilityState,
        activeTargets,
        activeTargetIds,
        eligibleTargetIds,
        targetMeasurementsById,
        animationIdsByTarget,
        routingActive: routingTarget ? activeAnimationsByTarget.has(routingTarget) : false,
        invalid,
      });
      record.raf = requestAnimationFrame(sample);
    };
    browser.__motionCapacity ??= {};
    browser.__motionCapacity.startup = record;
    record.raf = requestAnimationFrame(sample);
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

async function prepareCapacityMotionPage(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 4000 });
  await prepareMotionPage(page);
}

type MotionLifecycleOutcome = {
  outcome: 'finished' | 'canceled';
  time: number;
};

type MotionLifecycleEvent = {
  type: 'animationstart' | 'animationend' | 'animationcancel';
  targetId: string;
  animationName: string;
  time: number;
};

type MotionBrowserEvidence = {
  targets: Map<string, HTMLElement>;
  animationOwners: Map<string, string>;
  targetIds: WeakMap<HTMLElement, string>;
  animations: Map<string, CSSAnimation>;
  animationEffectTargets: Map<string, Element | null>;
  animationIds: WeakMap<CSSAnimation, string>;
  outcomes: Map<string, Promise<MotionLifecycleOutcome>>;
  events: MotionLifecycleEvent[];
  measureTarget: (target: HTMLElement) => MotionTargetMeasurement;
  targetId: (target: HTMLElement) => string;
  animationId: (target: HTMLElement, animation: CSSAnimation) => string;
  capturePhase: () => MotionPhaseReceipt;
};

type MotionBounds = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
};

type MotionTargetMeasurement = {
  bounds: MotionBounds;
  display: string;
  visibility: string;
  state: string | null;
  eligible: boolean;
};

type MotionCapacityObservation = {
  frame: number;
  time: number;
  documentVisibilityState: string;
  activeTargets: number[];
  activeTargetIds: string[];
  eligibleTargetIds: string[];
  targetMeasurementsById: Record<string, MotionTargetMeasurement>;
  animationIdsByTarget: Record<string, string[]>;
  routingActive: boolean;
  invalid: string | undefined;
};

type MotionTargetReceipt = {
  id: string;
  kind: string;
  bounds: MotionBounds;
  display: string;
  visibility: string;
  state: string | null;
  animationIds: string[];
  runningAnimationIds: string[];
  eligible: boolean;
};


type MotionPhaseReceipt = {
  time: number;
  scrollY: number;
  innerHeight: number;
  maxScrollY: number;
  targets: MotionTargetReceipt[];
};

type PendingReplayClickReceipt = {
  click: number;
  trusted: boolean;
  time: number;
  before: MotionPhaseReceipt;
  after: MotionPhaseReceipt;
  routeRunningAtBoundary: boolean;
  routeStateAtBoundary: string | null;
  eligibleOwnerIds: string[];
  candidateIds: string[];
  evidenceEventCursor: number;
  capacityFrameCursor: number;
  scrollDelta: number | null;
};


type PendingReplaySequence = {
  clicks: PendingReplayClickReceipt[];
};
 
async function startMotionCapacityObservation(page: Page, key: string): Promise<void> {
  await page.evaluate((observationKey) => {
    const observations = window as Window & {
      __motionCapacity?: Record<string, { raf: number; frames: MotionCapacityObservation[] }>;
    };
    const record = observations.__motionCapacity?.startup ?? { raf: 0, frames: [] as MotionCapacityObservation[] };
    const sample = (frame: number) => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-motion]'));
      const activeAnimationsByTarget = new Map<HTMLElement, string[]>();
      const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
      if (!evidence) throw new Error('Browser-local target measurement evidence disappeared.');
      const targetId = (target: HTMLElement) => evidence.targetId(target);
      const targetMeasurementsById = Object.fromEntries(targets.map((target) =>
        [targetId(target), evidence.measureTarget(target)] as const,
      ));
      const eligibleTargetIds = Object.entries(targetMeasurementsById)
        .flatMap(([id, measurement]) => measurement.eligible ? [id] : []);
      let invalid: string | undefined;
      const activeTargets = targets.flatMap((target, index) => {
        const animations = target.getAnimations({ subtree: true })
          .filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation);
        const running = animations.filter((animation) => animation.playState === 'running');
        if (running.some((animation) => animation.effect?.getComputedTiming().iterations === Infinity)) {
          invalid = 'A decorative animation is running without a finite iteration bound.';
        }
        if (running.length) {
          activeAnimationsByTarget.set(target, running.map((animation) => evidence.animationId(target, animation)));
        }
        return running.length ? [index] : [];
      });
      const activeTargetIds = Array.from(activeAnimationsByTarget.keys()).map(targetId);
      const animationIdsByTarget = Object.fromEntries(Array.from(activeAnimationsByTarget, ([target, ids]) =>
        [targetId(target), ids] as const,
      ));
      const routingTarget = targets.find((target) => target.getAttribute('data-motion') === 'routing');
      record.frames.push({
        frame,
        time: performance.now(),
        documentVisibilityState: document.visibilityState,
        activeTargets,
        activeTargetIds,
        eligibleTargetIds,
        targetMeasurementsById,
        animationIdsByTarget,
        routingActive: routingTarget ? activeAnimationsByTarget.has(routingTarget) : false,
        invalid,
      });
      record.raf = requestAnimationFrame(sample);
    };
    observations.__motionCapacity ??= {};
    observations.__motionCapacity[observationKey] = record;
    if (!observations.__motionCapacity.startup) record.raf = requestAnimationFrame(sample);
    delete observations.__motionCapacity.startup;
  }, key);
}


async function stopMotionCapacityObservation(page: Page, key: string): Promise<MotionCapacityObservation[]> {
  return page.evaluate((observationKey) => {
    const observations = window as Window & {
      __motionCapacity?: Record<string, { raf: number; frames: MotionCapacityObservation[] }>;
    };
    const observation = observations.__motionCapacity?.[observationKey];
    if (!observation) throw new Error(`No motion capacity observations exist for ${observationKey}.`);
    cancelAnimationFrame(observation.raf);
    return observation.frames;
  }, key);
}

function expectMotionCapacityAtMostThree(frames: MotionCapacityObservation[]): void {
  expect(frames.length).toBeGreaterThan(0);
  for (const frame of frames) {
    expect(frame.activeTargets.length, `At most three decorations may animate at frame ${frame.frame}.`).toBeLessThanOrEqual(3);
  }
}

test.describe('Agent Skills Standard landing page', () => {
  test('Get started navigates to the command destination', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /get started/i }).first().click();

    await expect(page).toHaveURL(/#quick-start/);
    const quickStart = page.locator('#quick-start');
    await expect(quickStart).toBeVisible();
    await expect(quickStart.getByText(commands.init)).toBeVisible();
    await expect(quickStart.getByText(commands.sync)).toBeVisible();
  });

  test('Clipboard grants write the exact command and keep feedback isolated by row', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    const quickStart = page.locator('#quick-start');
    await quickStart.scrollIntoViewIfNeeded();

    const initRow = quickStart.locator('[data-command]').filter({ hasText: commands.init });
    const syncRow = quickStart.locator('[data-command]').filter({ hasText: commands.sync });
    const initCopy = initRow.getByRole('button', { name: /^copy init command$/i });
    const syncCopy = syncRow.getByRole('button', { name: /^copy sync command$/i });
    await initCopy.click();
    await expect(initRow.getByRole('button', { name: /^copy init command$/i })).toHaveText(/copied/i);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(commands.init);
    await expect(syncRow.getByRole('button', { name: /^copy sync command$/i })).toBeVisible();
    await expect(syncRow.getByRole('status')).toBeEmpty();

    await syncCopy.click();
    await expect(syncRow.getByRole('button', { name: /^copy sync command$/i })).toHaveText(/copied/i);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(commands.sync);
  });
  test('Clipboard failure supports exact manual selection and successful retry without shifting the other row', async ({ page }) => {
    await page.addInitScript(() => {
      let attempts = 0;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (value: string) => {
            attempts += 1;
            return attempts === 1 ? Promise.reject(new Error('Permission denied')) : Promise.resolve(value);
          },
        },
      });
    });
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const quickStart = page.locator('#quick-start');
    await quickStart.scrollIntoViewIfNeeded();
    const initRow = quickStart.locator('[data-command]').filter({ hasText: commands.init });
    const syncRow = quickStart.locator('[data-command]').filter({ hasText: commands.sync });
    const initCopy = initRow.getByRole('button', { name: /^copy init command$/i });
    const syncCopy = syncRow.getByRole('button', { name: /^copy sync command$/i });
    const idleControl = await initCopy.boundingBox();
    const followingRow = await syncCopy.boundingBox();
    if (!idleControl || !followingRow) throw new Error('Quick Start rows must have layout boxes.');
    expect(idleControl.width).toBe(120);
    expect(idleControl.height).toBe(48);

    await initCopy.click();
    const retry = initRow.getByRole('button', { name: /retry copy init command/i });
    const select = initRow.getByRole('button', { name: /select init command text/i });
    await expect(retry).toBeVisible();
    await expect(initRow.getByRole('alert')).toContainText(/copy failed|select the command|retry/i);
    await expect(initRow.getByRole('status')).toHaveCount(0);
    await expect(initRow.getByText(/copied/i)).toHaveCount(0);
    const selectedText = await page.evaluate(() => window.getSelection()?.toString().trim());
    expect(selectedText).not.toBe(commands.init);
    await select.click();
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString().trim())).toBe(commands.init);

    const errorControl = await retry.boundingBox();
    const recoveryRow = await syncCopy.boundingBox();
    if (!errorControl || !recoveryRow) throw new Error('Recovery rows must have layout boxes.');
    expect(errorControl.width).toBe(idleControl.width);
    expect(errorControl.height).toBe(idleControl.height);
    expect(recoveryRow.y).toBe(followingRow.y);

    await retry.click();
    await expect(initRow.getByRole('button', { name: /^copy init command$/i })).toHaveText(/copied/i);
    await expect(syncRow.getByRole('button', { name: /^copy sync command$/i })).toBeVisible();
    const successControl = await initRow.getByRole('button', { name: /^copy init command$/i }).boundingBox();
    const successRow = await syncCopy.boundingBox();
    if (!successControl || !successRow) throw new Error('Success rows must have layout boxes.');
    expect(successControl.width).toBe(idleControl.width);
    expect(successControl.height).toBe(idleControl.height);
    expect(successRow.y).toBe(followingRow.y);
  });


  test('Clipboard API absence offers an explicit failure state, manual selection, and retry', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
    await page.goto('/');
    const quickStart = page.locator('#quick-start');
    const syncRow = quickStart.locator('[data-command]').filter({ hasText: commands.sync });
    await syncRow.getByRole('button', { name: /^copy sync command$/i }).click();
    await expect(syncRow.getByRole('button', { name: /retry copy sync command/i })).toBeVisible();
    await expect(syncRow.getByRole('alert')).toContainText(/copy failed/i);
    await syncRow.getByRole('button', { name: /select sync command text/i }).click();
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString().trim())).toBe(commands.sync);
    await expect(syncRow.getByText(/copied/i)).toHaveCount(0);
  });

  test('Mobile menu supports Enter, Space, Escape restoration, and focused hash destination', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const summary = page.locator('summary').filter({ hasText: 'Menu' });
    const details = page.locator('details').filter({ has: summary });
    await expect(summary).toBeVisible();

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    const links = details.getByRole('link');
    for (let index = 0; index < await links.count(); index += 1) {
      const box = await links.nth(index).boundingBox();
      if (!box) throw new Error(`Menu link ${index} must have a layout box while open.`);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }

    await page.keyboard.press('Escape');
    await expect(details).not.toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
    await page.keyboard.press('Space');
    await expect(details).toHaveAttribute('open', '');
    await details.getByRole('link', { name: /how it works/i }).click();
    await expect(page).toHaveURL(/#how-it-works/);
    await expect(details).not.toHaveAttribute('open', '');
    await expect(page.locator('#how-it-works')).toBeFocused();
  });

  test('Native FAQ supports keyboard toggles and independent open answers', async ({ page }) => {
    await page.goto('/');
    const faq = page.getByRole('region', { name: /a few things worth knowing/i });
    const items = faq.locator('details');
    const first = items.nth(0);
    const second = items.nth(1);
    const firstSummary = first.locator('summary');
    const secondSummary = second.locator('summary');

    for (const [item, summary] of [[first, firstSummary], [second, secondSummary]] as const) {
      if (await item.getAttribute('open') !== null) {
        await summary.focus();
        await page.keyboard.press('Enter');
        await expect(item).not.toHaveAttribute('open', '');
      }
    }

    await firstSummary.focus();
    await page.keyboard.press('Space');
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator(':scope > :not(summary)')).toBeVisible();

    await secondSummary.focus();
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('open', '');
    await expect(first).toHaveAttribute('open', '');
    await expect(second.locator(':scope > :not(summary)')).toBeVisible();
  });

  test('No-JavaScript mobile page keeps disclosures, commands, and links usable without inert controls', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:4321',
      javaScriptEnabled: false,
      viewport: { width: 375, height: 667 },
    });
    try {
      const page = await context.newPage();
      await page.goto('/');
      const menuSummary = page.locator('summary').filter({ hasText: 'Menu' });
      const menu = page.locator('details').filter({ has: menuSummary });
      await expect(menuSummary).toBeVisible();
      await menuSummary.click();
      await expect(menu).toHaveAttribute('open', '');
      await expect(menu.getByRole('link', { name: /how it works/i })).toBeVisible();

      const faq = page.getByRole('region', { name: /a few things worth knowing/i });
      const faqItem = faq.locator('details').first();
      const faqSummary = faqItem.locator('summary');
      if (await faqItem.getAttribute('open') !== null) {
        await faqSummary.click();
        await expect(faqItem).not.toHaveAttribute('open', '');
      }
      await faqSummary.click();
      await expect(faqItem).toHaveAttribute('open', '');
      await expect(faqItem.locator(':scope > :not(summary)')).toBeVisible();

      const quickStart = page.locator('#quick-start');
      await expect(quickStart.getByText(commands.init)).toBeVisible();
      await expect(quickStart.getByText(commands.sync)).toBeVisible();
      await expect(quickStart.getByRole('link').first()).toBeVisible();
      const visibleInertActions = await page.locator('button').filter({ hasText: /copy|replay/i }).evaluateAll((buttons) =>
        buttons.filter((button) => {
          const style = getComputedStyle(button);
          return button.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        }).length,
      );
      expect(visibleInertActions).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('Responsive fit includes open menu and clipboard recovery at required widths', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: () => Promise.reject(new Error('Permission denied')) },
    }));
    for (const width of [320, 375, 720, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const menuSummary = page.locator('summary').filter({ hasText: 'Menu' });
      if (await menuSummary.isVisible()) {
        await menuSummary.click();
        const menu = page.locator('details').filter({ has: menuSummary });
        const links = menu.getByRole('link');
        for (let index = 0; index < await links.count(); index += 1) {
          await expect(links.nth(index)).toBeVisible();
          const box = await links.nth(index).boundingBox();
          if (!box) throw new Error(`Menu link ${index} must have a layout box at ${width}px.`);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
      }
      const root = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
      expect(root.scroll, `Root must not overflow at ${width}px`).toBeLessThanOrEqual(root.width);

      const quickStart = page.locator('#quick-start');
      await quickStart.scrollIntoViewIfNeeded();
      const initRow = quickStart.locator('[data-command]').filter({ hasText: commands.init });
      const syncRow = quickStart.locator('[data-command]').filter({ hasText: commands.sync });
      await initRow.getByRole('button', { name: /^copy init command$/i }).click();
      const retry = initRow.getByRole('button', { name: /retry copy init command/i });
      await expect(retry).toBeVisible();
      const panel = await initRow.locator('pre').boundingBox();
      const row = await initRow.boundingBox();
      const retryBox = await retry.boundingBox();
      const syncBox = await syncRow.boundingBox();
      if (!panel || !row || !retryBox || !syncBox) throw new Error('Quick Start scrollport and recovery rows must have layout boxes.');
      await expect(syncRow.locator('code')).toHaveText(commands.sync);
      expect(panel.x).toBeGreaterThanOrEqual(row.x);
      expect(panel.x + panel.width).toBeLessThanOrEqual(row.x + row.width);
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(width);
      expect(retryBox.x).toBeGreaterThanOrEqual(0);
      expect(retryBox.x + retryBox.width).toBeLessThanOrEqual(width);
      expect(retryBox.width).toBe(120);
      expect(retryBox.height).toBe(48);
      expect(syncBox.y).toBeGreaterThanOrEqual(row.y + row.height);
      if (width <= 375) {
        expect(Number(await initRow.locator('code').evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ))).toBeGreaterThanOrEqual(16);
        const pre = initRow.locator('pre');
        const scrollport = await pre.evaluate((element) => ({
          overflowX: getComputedStyle(element).overflowX,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          tabIndex: element.tabIndex,
          label: element.getAttribute('aria-label'),
        }));
        expect(scrollport.clientWidth).toBeLessThan(scrollport.scrollWidth);
        expect(['auto', 'scroll']).toContain(scrollport.overflowX);
        expect(scrollport.tabIndex).toBeGreaterThanOrEqual(0);
        expect(scrollport.label).toBeTruthy();
        await pre.focus();
        await pre.press('ArrowRight');
        await expect.poll(() => pre.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        await pre.press('ArrowLeft');
        await expect.poll(() => pre.evaluate((element) => element.scrollLeft)).toBe(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });

  test('Motion entrance and Replay each run a real finite animation to completion', async ({ page }) => {
    await prepareMotionPage(page);
    const routing = page.locator('[data-motion="routing"]');
    const replay = routing.getByRole('button', { name: /^replay illustrative routing walkthrough$/i });
    await routing.scrollIntoViewIfNeeded();
    await expect(routing).toHaveAttribute('data-motion-state', 'running');
    await expect.poll(() => animationCount(routing)).toBeGreaterThan(0);
    await expect(routing).toHaveAttribute('data-motion-state', 'complete', { timeout: 3000 });
    await expect.poll(() => animationCount(routing)).toBe(0);

    await replay.click();
    await expect(routing).toHaveAttribute('data-motion-state', 'running');
    await expect.poll(() => animationCount(routing)).toBeGreaterThan(0);
    await expect(routing).toHaveAttribute('data-motion-state', 'complete', { timeout: 3000 });
    await expect.poll(() => animationCount(routing)).toBe(0);
  });

  test('Motion restarts active Replay without exceeding three active decorations', async ({ page }) => {
    await prepareMotionPage(page);
    const routing = page.locator('[data-motion="routing"]');
    const replay = routing.getByRole('button', { name: /^replay illustrative routing walkthrough$/i });
    await routing.scrollIntoViewIfNeeded();
    await expect(routing).toHaveAttribute('data-motion-state', 'running');
    await expect.poll(() => animationCount(routing)).toBeGreaterThan(0);
    await expect(routing).toHaveAttribute('data-motion-state', 'complete', { timeout: 3000 });

    await startMotionCapacityObservation(page, 'active-replay');
    await replay.click();
    await expect(routing).toHaveAttribute('data-motion-state', 'running');
    expect(await trackAnimationLifecycle(routing, 'active-replay-restart')).toBeGreaterThan(0);
    await replay.click();
    await expectObservedCancellation(page, 'active-replay-restart');
    await expect(routing).toHaveAttribute('data-motion-state', 'running');
    await expect.poll(() => animationCount(routing)).toBeGreaterThan(0);

    const frames = await stopMotionCapacityObservation(page, 'active-replay');
    expectMotionCapacityAtMostThree(frames);
    expect(frames.some(({ routingActive }) => routingActive)).toBe(true);
  });

  test('Motion cancels an active offscreen animation and does not replay on re-entry', async ({ page }) => {
    await prepareMotionPage(page);
    const hero = page.locator('[data-motion="hero"]').first();
    expect(await trackAnimationLifecycle(hero, 'offscreen', true)).toBeGreaterThan(0);

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await expect(hero).toHaveAttribute('data-motion-state', 'complete');
    await expectObservedCancellation(page, 'offscreen');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(hero).toHaveAttribute('data-motion-state', 'complete');
    await expect.poll(() => animationCount(hero)).toBe(0);
  });

  test('Motion cancels an active Replay after initially reduced motion is lifted', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareMotionPage(page);
    const routing = page.locator('[data-motion="routing"]');
    await expect(routing).toHaveAttribute('data-motion-state', 'complete');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const replay = page.getByRole('button', { name: /^replay illustrative routing walkthrough$/i });
    await replay.click();
    await expect(routing).toHaveAttribute('data-motion-state', 'running');
    await expect.poll(() => animationCount(routing)).toBeGreaterThan(0);
    await expect(routing).toHaveAttribute('data-motion-state', 'complete', { timeout: 3000 });

    await replay.click();
    await expect(routing).toHaveAttribute('data-motion-state', 'running');
    expect(await trackAnimationLifecycle(routing, 'replay-reduced')).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(routing).toHaveAttribute('data-motion-state', 'complete');
    await expectObservedCancellation(page, 'replay-reduced');
    await expect.poll(() => animationCount(routing)).toBe(0);
  });

  test('Motion cancels active animation at the simulated hidden-document boundary', async ({ page }) => {
    await prepareMotionPage(page);
    const hero = page.locator('[data-motion="hero"]').first();
    expect(await trackAnimationLifecycle(hero, 'simulated-hidden', true)).toBeGreaterThan(0);

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(hero).toHaveAttribute('data-motion-state', 'complete');
    await expectObservedCancellation(page, 'simulated-hidden');
  });

  test('Motion responds to a dynamic reduced-motion preference while active', async ({ page }) => {
    await prepareMotionPage(page);
    const hero = page.locator('[data-motion="hero"]').first();
    expect(await trackAnimationLifecycle(hero, 'dynamic-reduced', true)).toBeGreaterThan(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(hero).toHaveAttribute('data-motion-state', 'complete');
    await expectObservedCancellation(page, 'dynamic-reduced');
    await expect.poll(() => animationCount(hero)).toBe(0);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(hero).toHaveAttribute('data-motion-state', 'complete');
    await expect.poll(() => animationCount(hero)).toBe(0);

    const headings = page.locator('h1, h2');
    for (let index = 0; index < await headings.count(); index += 1) {
      await expect(headings.nth(index)).toBeVisible();
      expect(Number(await headings.nth(index).evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0);
    }
  });

  test.describe('Motion scenarios disable raster capture', () => {

    test('Pending Replay preserves real capacity through exit, admission, and saturated re-entry', async ({ page }) => {
      await prepareCapacityMotionPage(page);
      const routing = page.locator('[data-motion="routing"]');
      const hero = page.locator('[data-motion="hero"]');
      const replay = routing.getByRole('button', { name: /^replay illustrative routing walkthrough$/i });
      await expect.poll(() => page.evaluate(() => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        if (!evidence) return false;
        const phase = evidence.capturePhase();
        const runningKinds = phase.targets
          .filter(({ runningAnimationIds }) => runningAnimationIds.length > 0)
          .map(({ kind }) => kind)
          .sort();
        const idleCandidates = phase.targets.filter(({ kind, eligible, state, runningAnimationIds }) =>
          (kind === 'skill' || kind === 'workflow') && eligible && state === 'idle' &&
          runningAnimationIds.length === 0,
        );
        return phase.targets.length === 5 &&
          runningKinds.join(',') === 'divider,hero,routing' &&
          idleCandidates.length === 2;
      }), { intervals: [1, 5, 10] }).toBe(true);
      const initial = await page.evaluate(() => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        if (!evidence) throw new Error('Browser-local animation identity evidence was not installed.');
        return evidence.capturePhase();
      });
      const targetOfKind = (phase: MotionPhaseReceipt, kind: string): MotionTargetReceipt => {
        const target = phase.targets.find((candidate) => candidate.kind === kind);
        if (!target) throw new Error(`The ${kind} motion target is required.`);
        return target;
      };
      expect(initial.targets.map(({ kind }) => kind).sort()).toEqual([
        'divider', 'hero', 'routing', 'skill', 'workflow',
      ]);
      expect(initial.scrollY).toBe(0);
      expect(initial.targets.map(({ kind }) => kind).length).toBe(new Set(initial.targets.map(({ kind }) => kind)).size);
      const initialHero = targetOfKind(initial, 'hero');
      const initialRouting = targetOfKind(initial, 'routing');
      const initialDivider = targetOfKind(initial, 'divider');
      const initialSkill = targetOfKind(initial, 'skill');
      const initialWorkflow = targetOfKind(initial, 'workflow');
      const initialOwners = [initialHero, initialRouting, initialDivider];
      expect(initialOwners.every(({ runningAnimationIds }) => runningAnimationIds.length > 0)).toBe(true);
      expect([initialSkill, initialWorkflow].every(({ eligible, state, runningAnimationIds }) =>
        eligible && state === 'idle' && runningAnimationIds.length === 0,
      )).toBe(true);

      await startMotionCapacityObservation(page, 'pending-replay-capacity');
      await page.evaluate(() => {
        const browser = window as Window & {
          __motionEvidence?: MotionBrowserEvidence;
          __motionCapacity?: Record<string, { raf: number; frames: MotionCapacityObservation[] }>;
          __pendingReplaySequence?: PendingReplaySequence;
        };
        const evidence = browser.__motionEvidence;
        const capacity = browser.__motionCapacity?.['pending-replay-capacity'];
        if (!evidence || !capacity) throw new Error('The real motion observation streams are required.');
        const sequence: PendingReplaySequence = { clicks: [] };
        browser.__pendingReplaySequence = sequence;
        window.addEventListener('click', (event) => {
          const eventTarget = event.target;
          if (!(eventTarget instanceof Element) ||
              !eventTarget.closest('button[aria-label="Replay illustrative routing walkthrough"]')) return;
          const click = sequence.clicks.length + 1;
          if (click > 2) return;
          const before = evidence.capturePhase();
          const route = before.targets.find(({ kind }) => kind === 'routing');
          if (!route) throw new Error('The routing target is required at each trusted Replay boundary.');
          const eligibleOwnerIds = before.targets
            .filter(({ kind, runningAnimationIds }) => kind !== 'routing' && runningAnimationIds.length > 0)
            .map(({ id }) => id);
          const candidateIds = before.targets
            .filter(({ kind, eligible, state, runningAnimationIds }) =>
              (kind === 'skill' || kind === 'workflow') && eligible && state === 'idle' &&
              runningAnimationIds.length === 0,
            )
            .map(({ id }) => id);
          const evidenceEventCursor = evidence.events.length;
          const capacityFrameCursor = capacity.frames.length;
          let scrollDelta: number | null = null;
          let after = before;
          if (click === 1) {
            const heroTarget = before.targets.find(({ kind }) => kind === 'hero');
            const divider = before.targets.find(({ kind }) => kind === 'divider');
            if (!heroTarget || !divider) throw new Error('The hero and divider targets are required.');
            scrollDelta = Math.max(heroTarget.bounds.bottom, route.bounds.bottom) + 1;
            window.scrollTo({ top: before.scrollY + scrollDelta, behavior: 'instant' });
            after = evidence.capturePhase();
          }
          sequence.clicks.push({
            click,
            trusted: event.isTrusted,
            time: before.time,
            scrollDelta,
            before,
            after,
            routeRunningAtBoundary: route.runningAnimationIds.length > 0,
            routeStateAtBoundary: route.state,
            eligibleOwnerIds,
            candidateIds,
            evidenceEventCursor,
            capacityFrameCursor,
          });
        });
      });

      await replay.click();
      const firstClick = await page.evaluate(() =>
        (window as Window & { __pendingReplaySequence?: PendingReplaySequence })
          .__pendingReplaySequence?.clicks[0] ?? null,
      );
      if (!firstClick) throw new Error('The first trusted Replay action did not produce a same-task receipt.');
      expect(firstClick.trusted).toBe(true);
      expect(firstClick.routeRunningAtBoundary).toBe(false);
      expect(firstClick.routeStateAtBoundary).toBe('idle');
      expect(firstClick.eligibleOwnerIds).toEqual([initialHero.id, initialDivider.id]);
      expect(firstClick.candidateIds).toEqual([initialSkill.id, initialWorkflow.id]);
      expect(firstClick.before.targets.find(({ id }) => id === initialHero.id)?.runningAnimationIds)
        .toEqual(initialHero.runningAnimationIds);
      expect(firstClick.before.targets.find(({ id }) => id === initialDivider.id)?.runningAnimationIds)
        .toEqual(initialDivider.runningAnimationIds);
      expect(firstClick.before.targets.find(({ id }) => id === initialRouting.id)?.runningAnimationIds).toEqual([]);
      expect(firstClick.before.scrollY).toBe(0);
      expect(firstClick.after.targets.find(({ id }) => id === initialHero.id)?.bounds.bottom).toBeLessThanOrEqual(0);
      expect(firstClick.after.targets.find(({ id }) => id === initialRouting.id)?.bounds.bottom).toBeLessThanOrEqual(0);
      for (const owner of [initialDivider, initialSkill, initialWorkflow]) {
        expect(firstClick.after.targets.find(({ id }) => id === owner.id)?.eligible).toBe(true);
      }
      const exitDelta = firstClick.scrollDelta;
      if (exitDelta === null) throw new Error('The trusted first-click task must record its measured scroll delta.');
      expect(exitDelta).toBeGreaterThan(0);
      expect(firstClick.after.scrollY).toBeLessThanOrEqual(firstClick.after.maxScrollY);

      const firstReplayOutcomes = await page.evaluate(async (animationIds) => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        if (!evidence) throw new Error('Animation identity evidence disappeared.');
        const promises = animationIds.map((id) => {
          const outcome = evidence.outcomes.get(id);
          if (!outcome) throw new Error(`Missing lifecycle receipt for ${id}.`);
          return outcome;
        });
        return Promise.all(promises);
      }, initialRouting.runningAnimationIds);
      expect(firstReplayOutcomes.length).toBeGreaterThan(0);
      expect(firstReplayOutcomes.every(({ outcome }) => outcome === 'canceled')).toBe(true);
      const heroOutcomes = await page.evaluate(async (animationIds) => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        if (!evidence) throw new Error('Animation identity evidence disappeared.');
        const promises = animationIds.map((id) => {
          const outcome = evidence.outcomes.get(id);
          if (!outcome) throw new Error(`Missing lifecycle receipt for ${id}.`);
          return outcome;
        });
        return Promise.all(promises);
      }, initialHero.runningAnimationIds);
      expect(heroOutcomes.length).toBeGreaterThan(0);
      expect(heroOutcomes.every(({ outcome }) => outcome === 'canceled')).toBe(true);
      await expect(hero).toHaveAttribute('data-motion-state', 'complete');
      await expect(routing).toHaveAttribute('data-motion-state', 'complete');

      let overlapFrame: MotionCapacityObservation | undefined;
      let overlapDiagnostics: MotionCapacityObservation[] = [];
      const triplet = [initialDivider.id, initialSkill.id, initialWorkflow.id];
      try {
        await expect.poll(async () => {
          const receipt = await page.evaluate((targetIds) => {
            const capacity = (window as Window & {
              __motionCapacity?: Record<string, { raf: number; frames: MotionCapacityObservation[] }>;
            }).__motionCapacity?.['pending-replay-capacity'];
            const frames = capacity?.frames ?? [];
            return {
              frame: frames.find((frame) =>
                targetIds.every((id) => frame.activeTargetIds.includes(id)) &&
                frame.activeTargetIds.length === 3 &&
                targetIds.every((id) => frame.eligibleTargetIds.includes(id)) &&
                targetIds.every((id) => frame.animationIdsByTarget[id]?.length),
              ),
              recentFrames: frames.slice(-3),
            };
          }, triplet);
          overlapFrame = receipt.frame;
          overlapDiagnostics = receipt.recentFrames;
          return overlapFrame;
        }, { intervals: [1, 5, 10] }).toBeTruthy();
      } catch (error) {
        const assertionFailure = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${assertionFailure}\nRecent native capacity measurements: ${JSON.stringify(overlapDiagnostics, null, 2)}`,
          { cause: error },
        );
      }
      if (!overlapFrame) throw new Error('A same-frame divider/skill/workflow ownership receipt is required.');
      expect(overlapFrame.activeTargetIds).toEqual(expect.arrayContaining(triplet));
      expect(overlapFrame.activeTargetIds).toHaveLength(3);
      const dividerAnimationIds = overlapFrame.animationIdsByTarget[initialDivider.id] ?? [];
      const skillAnimationIds = overlapFrame.animationIdsByTarget[initialSkill.id] ?? [];
      const workflowAnimationIds = overlapFrame.animationIdsByTarget[initialWorkflow.id] ?? [];
      expect(dividerAnimationIds).toEqual(initialDivider.runningAnimationIds);
      expect(skillAnimationIds.length).toBeGreaterThan(0);
      expect(workflowAnimationIds.length).toBeGreaterThan(0);
      expect(overlapFrame.routingActive).toBe(false);

      const returnReceipt = await page.evaluate(() => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        if (!evidence) throw new Error('Browser-local animation identity evidence disappeared.');
        const before = evidence.capturePhase();
        window.scrollTo({ top: 0, behavior: 'instant' });
        return { before, after: evidence.capturePhase() };
      });
      const returnDiagnosticContext = JSON.stringify({ returnReceipt, triplet, overlapFrame }, null, 2);
      for (const [phaseName, phase] of [
        ['before', returnReceipt.before],
        ['after', returnReceipt.after],
      ] as const) {
        for (const targetId of triplet) {
          const target = phase.targets.find(({ id }) => id === targetId);
          expect(
            target?.eligible,
            `Expected target ${targetId} to remain eligible in return phase ${phaseName}. ` +
              `Live return receipt and ownership context:\n${returnDiagnosticContext}`,
          ).toBe(true);
          expect(target?.runningAnimationIds).toEqual(
            targetId === initialDivider.id ? dividerAnimationIds :
              targetId === initialSkill.id ? skillAnimationIds : workflowAnimationIds,
          );
        }
      }
      expect(returnReceipt.before.targets.find(({ id }) => id === initialRouting.id)?.eligible).toBe(false);
      expect(returnReceipt.after.scrollY).toBe(0);
      expect(returnReceipt.after.targets.find(({ id }) => id === initialRouting.id)?.eligible).toBe(true);
      expect(returnReceipt.after.targets.find(({ id }) => id === initialRouting.id)?.runningAnimationIds).toEqual([]);
      expect(returnReceipt.after.targets.find(({ id }) => id === initialRouting.id)?.state).toBe('complete');

      await replay.click();
      const secondClick = await page.evaluate(() =>
        (window as Window & { __pendingReplaySequence?: PendingReplaySequence })
          .__pendingReplaySequence?.clicks[1] ?? null,
      );
      if (!secondClick) throw new Error('The second trusted Replay action did not produce a same-task receipt.');
      expect(secondClick.trusted).toBe(true);
      expect(secondClick.routeRunningAtBoundary).toBe(false);
      expect(secondClick.routeStateAtBoundary).toBe('idle');
      expect(secondClick.before.scrollY).toBe(0);
      expect(secondClick.eligibleOwnerIds).toEqual(triplet);
      const secondCapacity = secondClick.before.targets.filter(({ runningAnimationIds }) =>
        runningAnimationIds.length > 0,
      );
      expect(secondCapacity).toHaveLength(3);
      expect(secondCapacity.map(({ id }) => id)).toEqual(triplet);
      for (const targetId of triplet) {
        const target = secondClick.before.targets.find(({ id }) => id === targetId);
        expect(target?.eligible).toBe(true);
        expect(target?.runningAnimationIds).toEqual(
          targetId === initialDivider.id ? dividerAnimationIds :
            targetId === initialSkill.id ? skillAnimationIds : workflowAnimationIds,
        );
      }
      const ownerAnimationIds: Record<string, string[]> = {
        [initialDivider.id]: dividerAnimationIds,
        [initialSkill.id]: skillAnimationIds,
        [initialWorkflow.id]: workflowAnimationIds,
      };
      const ownerReleases = await page.evaluate(async (owners) => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        if (!evidence) throw new Error('Browser-local animation identity evidence disappeared.');
        return Promise.all(Object.entries(owners).map(async ([targetId, animationIds]) => {
          const outcomes = await Promise.all(animationIds.map((id) => {
            const outcome = evidence.outcomes.get(id);
            if (!outcome) throw new Error(`Missing lifecycle receipt for ${id}.`);
            return outcome;
          }));
          return {
            targetId,
            animationIds,
            outcomes,
            time: Math.max(...outcomes.map(({ time }) => time)),
            scrollY: window.scrollY,
            phase: evidence.capturePhase(),
          };
        }));
      }, ownerAnimationIds);
      for (const ownerRelease of ownerReleases) {
        expect(ownerRelease.outcomes.length).toBeGreaterThan(0);
        expect(ownerRelease.outcomes.every(({ outcome }) => outcome === 'finished')).toBe(true);
        expect(ownerRelease.phase.targets.find(({ id }) => id === ownerRelease.targetId)?.eligible).toBe(true);
      }
      const release = ownerReleases.reduce((earliest, current) =>
        current.time < earliest.time ? current : earliest,
      );
      expect(triplet).toContain(release.targetId);
      expect(release.phase.scrollY).toBe(0);

      let routeStartEvents: MotionLifecycleEvent[] = [];
      await expect.poll(async () => {
        routeStartEvents = await page.evaluate(({ routingId, clickTime }) => {
          const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
          if (!evidence) throw new Error('Browser-local animation identity evidence disappeared.');
          return evidence.events.filter((event) =>
            event.type === 'animationstart' && event.targetId === routingId && event.time >= clickTime,
          );
        }, { routingId: initialRouting.id, clickTime: secondClick.time });
        return routeStartEvents.length;
      }).toBeGreaterThan(0);
      expect(Math.min(...routeStartEvents.map(({ time }) => time))).toBeGreaterThanOrEqual(release.time);
      let replayFrame: MotionCapacityObservation | undefined;
      let routeAnimationIds: string[] = [];
      await expect.poll(async () => {
        const receipt = await page.evaluate(({ routingId, oldIds, minimumTime }) => {
          const browser = window as Window & {
            __motionCapacity?: Record<string, { raf: number; frames: MotionCapacityObservation[] }>;
            __motionEvidence?: MotionBrowserEvidence;
          };
          const evidence = browser.__motionEvidence;
          if (!evidence) throw new Error('Browser-local animation identity evidence disappeared.');
          const frames = browser.__motionCapacity?.['pending-replay-capacity']?.frames ?? [];
          const effectBelongsToRoute = (id: string) => {
            const owner = evidence.targets.get(routingId);
            const effectTarget = evidence.animationEffectTargets.get(id);
            return evidence.animationOwners.get(id) === routingId && owner !== undefined &&
              effectTarget instanceof Element && owner.contains(effectTarget);
          };
          const match = frames.find((frame) => {
            const ids = frame.animationIdsByTarget[routingId] ?? [];
            return frame.time >= minimumTime && frame.activeTargetIds.includes(routingId) &&
              ids.some((id) => !oldIds.includes(id) && effectBelongsToRoute(id));
          });
          return {
            frame: match,
            animationIds: match?.animationIdsByTarget[routingId]?.filter((id) =>
              !oldIds.includes(id) && effectBelongsToRoute(id),
            ) ?? [],
          };
        }, {
          routingId: initialRouting.id,
          oldIds: initialRouting.animationIds,
          minimumTime: Math.min(...routeStartEvents.map(({ time }) => time)),
        });
        replayFrame = receipt.frame;
        routeAnimationIds = receipt.animationIds;
        return replayFrame && routeAnimationIds.length > 0;
      }).toBeTruthy();
      expect(routeAnimationIds.length).toBeGreaterThan(0);
      expect(routeAnimationIds.some((id) => initialRouting.runningAnimationIds.includes(id))).toBe(false);
      await expect(routing).toHaveAttribute('data-motion-state', 'complete');
      const replayOutcomes = await page.evaluate(async (animationIds) => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        if (!evidence) throw new Error('Animation identity evidence disappeared.');
        const promises = animationIds.map((id) => {
          const outcome = evidence.outcomes.get(id);
          if (!outcome) throw new Error(`Missing lifecycle receipt for ${id}.`);
          return outcome;
        });
        return Promise.all(promises);
      }, routeAnimationIds);
      expect(replayOutcomes.length).toBeGreaterThan(0);
      expect(replayOutcomes.every(({ outcome }) => outcome === 'finished')).toBe(true);


      const frames = await stopMotionCapacityObservation(page, 'pending-replay-capacity');
      expectMotionCapacityAtMostThree(frames);
      expect(frames.every(({ invalid }) => invalid === undefined)).toBe(true);
      const beforeSecondClickFrames = frames
        .slice(firstClick.capacityFrameCursor)
        .filter(({ time }) => time < secondClick.time);
      expect(beforeSecondClickFrames.length).toBeGreaterThan(0);
      expect(beforeSecondClickFrames.every(({ routingActive }) => !routingActive)).toBe(true);
      expect(beforeSecondClickFrames.some(({ activeTargetIds }) =>
        triplet.every((targetId) => activeTargetIds.includes(targetId)),
      )).toBe(true);
      expect(beforeSecondClickFrames.every(({ activeTargetIds }) => activeTargetIds.length <= 3)).toBe(true);
      const afterSecondClickFrames = frames
        .slice(secondClick.capacityFrameCursor)
        .filter(({ time }) => time < release.time);
      expect(afterSecondClickFrames.every(({ routingActive }) => !routingActive)).toBe(true);
      for (const ownerRelease of ownerReleases) {
        const ownerFrames = frames.filter((frame) =>
          frame.time >= secondClick.time && frame.time < ownerRelease.time,
        );
        expect(ownerFrames.length).toBeGreaterThan(0);
        for (const frame of ownerFrames) {
          const expectedRunningIds = ownerRelease.animationIds.filter((_, index) =>
            (ownerRelease.outcomes[index]?.time ?? 0) > frame.time,
          );
          if (expectedRunningIds.length === 0) continue;
          expect(frame.eligibleTargetIds).toContain(ownerRelease.targetId);
          expect(frame.activeTargetIds).toContain(ownerRelease.targetId);
          expect(frame.animationIdsByTarget[ownerRelease.targetId]).toEqual(expectedRunningIds);
        }
      }
      expect(frames.some(({ frame, time }) =>
        frame === replayFrame?.frame && time === replayFrame.time,
      )).toBe(true);
      const lifecycle = await page.evaluate(({ firstCursor, secondCursor, oldRouteIds, oldHeroIds }) => {
        const evidence = (window as Window & { __motionEvidence?: MotionBrowserEvidence }).__motionEvidence;
        const sequence = (window as Window & { __pendingReplaySequence?: PendingReplaySequence })
          .__pendingReplaySequence;
        if (!evidence || !sequence) throw new Error('Replay lifecycle receipts are required.');
        const routeId = sequence.clicks[0]?.before.targets.find(({ kind }) => kind === 'routing')?.id;
        if (!routeId) throw new Error('The routing target identity is required.');
        const namesFor = (ids: string[]) => ids.flatMap((id) => {
          const name = evidence.animations.get(id)?.animationName;
          return name ? [name] : [];
        });
        return {
          firstIntervalRouteStarts: evidence.events.slice(firstCursor, secondCursor).filter((event) =>
            event.type === 'animationstart' && event.targetId === routeId,
          ),
          secondIntervalRouteStarts: evidence.events.slice(secondCursor).filter((event) =>
            event.type === 'animationstart' && event.targetId === routeId,
          ),
          cancels: evidence.events.filter((event) => event.type === 'animationcancel'),
          oldRouteAnimationNames: namesFor(oldRouteIds),
          oldHeroAnimationNames: namesFor(oldHeroIds),
        };
      }, {
        firstCursor: firstClick.evidenceEventCursor,
        secondCursor: secondClick.evidenceEventCursor,
        oldRouteIds: initialRouting.runningAnimationIds,
        oldHeroIds: initialHero.runningAnimationIds,
      });
      expect(lifecycle.firstIntervalRouteStarts).toEqual([]);
      expect(lifecycle.secondIntervalRouteStarts.length).toBeGreaterThan(0);
      expect(lifecycle.secondIntervalRouteStarts.every(({ time }) => time >= release.time)).toBe(true);
      expect(lifecycle.cancels.some(({ targetId, animationName, time }) =>
        targetId === initialRouting.id && lifecycle.oldRouteAnimationNames.includes(animationName) &&
        time >= firstClick.time && time < secondClick.time,
      )).toBe(true);
      expect(lifecycle.cancels.some(({ targetId, animationName, time }) =>
        targetId === initialHero.id && lifecycle.oldHeroAnimationNames.includes(animationName) &&
        time >= firstClick.time && time < secondClick.time,
      )).toBe(true);
    });

    test('Motion capacity stays at three active decorations across entrance frames', async ({ page }) => {
      await prepareCapacityMotionPage(page);
      await startMotionCapacityObservation(page, 'entrance-capacity');
      await expect.poll(() => page.evaluate(() => {
        const observations = (window as Window & {
          __motionCapacity?: Record<string, { raf: number; frames: MotionCapacityObservation[] }>;
        }).__motionCapacity?.['entrance-capacity'];
        return observations?.frames.length ?? 0;
      })).toBeGreaterThan(35);
      const frames = await stopMotionCapacityObservation(page, 'entrance-capacity');
      expectMotionCapacityAtMostThree(frames);
      expect(frames.some(({ activeTargets }) => activeTargets.length > 0)).toBe(true);
    });
    test('An eligible idle decoration starts after a real active slot exits view', async ({ page }) => {
      await prepareCapacityMotionPage(page);
      await expect.poll(() => page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('[data-motion]')).filter((decoration) =>
          decoration.getAnimations({ subtree: true }).some((animation) =>
            animation instanceof CSSAnimation && animation.playState === 'running',
          ),
        ).length,
      )).toBe(3);

      const plan = await page.evaluate(() => {
        const decorations = Array.from(document.querySelectorAll<HTMLElement>('[data-motion]'));
        const candidates = decorations.filter((decoration) => {
          const bounds = decoration.getBoundingClientRect();
          return bounds.top < innerHeight - 40 && bounds.bottom > 0 &&
            decoration.getAttribute('data-motion-state') === 'idle' &&
            decoration.getAnimations({ subtree: true }).every((animation) =>
              !(animation instanceof CSSAnimation) || animation.playState !== 'running',
            );
        });
        const owners = decorations.filter((decoration) =>
          decoration.getAnimations({ subtree: true }).some((animation) =>
            animation instanceof CSSAnimation && animation.playState === 'running',
          ),
        );
        for (const candidate of candidates) {
          const candidateBounds = candidate.getBoundingClientRect();
          for (const owner of owners) {
            const ownerBounds = owner.getBoundingClientRect();
            const lower = Math.max(ownerBounds.bottom + 1, candidateBounds.top - innerHeight + 1);
            const upper = candidateBounds.bottom - 1;
            if (lower < upper) {
              return {
                candidateIndex: decorations.indexOf(candidate),
                ownerIndex: decorations.indexOf(owner),
                delta: lower,
              };
            }
          }
        }
        throw new Error('No real scroll can move an active owner out while keeping an observer-eligible idle decoration in view.');
      });
      const decorations = page.locator('[data-motion]');
      const candidate = decorations.nth(plan.candidateIndex);
      const owner = decorations.nth(plan.ownerIndex);
      expect(await trackAnimationLifecycle(owner, 'queue-capacity-release')).toBeGreaterThan(0);

      await page.evaluate((delta) => window.scrollTo(0, window.scrollY + delta), plan.delta);
      await expectObservedCancellation(page, 'queue-capacity-release');
      await expect(candidate).toHaveAttribute('data-motion-state', 'running');
      await expect.poll(() => animationCount(candidate)).toBeGreaterThan(0);
    });


    test('An observer-eligible idle decoration completes when it leaves view at capacity', async ({ page }) => {
      await prepareCapacityMotionPage(page);
      await expect.poll(() => page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('[data-motion]')).filter((decoration) =>
          decoration.getAnimations({ subtree: true }).some((animation) =>
            animation instanceof CSSAnimation && animation.playState === 'running',
          ),
        ).length,
      )).toBe(3);

      const queuedIndex = await page.evaluate(() => {
        const decorations = Array.from(document.querySelectorAll<HTMLElement>('[data-motion]'));
        return decorations.findIndex((decoration) => {
          const bounds = decoration.getBoundingClientRect();
          const observerEligible = bounds.top < innerHeight - 40 && bounds.bottom > 0;
          return observerEligible && decoration.getAttribute('data-motion-state') === 'idle' &&
            decoration.getAnimations({ subtree: true }).every((animation) =>
              !(animation instanceof CSSAnimation) || animation.playState !== 'running',
            );
        });
      });
      if (queuedIndex < 0) throw new Error('Expected a real observer-eligible idle decoration while three targets own active animations.');
      const decorations = page.locator('[data-motion]');
      const queued = decorations.nth(queuedIndex);
      await expect(queued).toHaveAttribute('data-motion-state', 'idle');
      expect(await animationCount(queued)).toBe(0);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(queued).toHaveAttribute('data-motion-state', 'complete');
      await expect.poll(() => animationCount(queued)).toBe(0);
      await queued.scrollIntoViewIfNeeded();
      await expect(queued).toHaveAttribute('data-motion-state', 'complete');
      await expect.poll(() => animationCount(queued)).toBe(0);
    });

  });

  test('Initial reduced-motion preference keeps decorations static and readable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const decorations = page.locator('[data-motion]');
    for (let index = 0; index < await decorations.count(); index += 1) {
      await expect(decorations.nth(index)).toHaveAttribute('data-motion-state', 'complete');
      expect(await animationCount(decorations.nth(index))).toBe(0);
    }
    const headings = page.locator('h1, h2');
    for (let index = 0; index < await headings.count(); index += 1) {
      await expect(headings.nth(index)).toBeVisible();
      expect(Number(await headings.nth(index).evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0);
    }
  });

  test('Axe reports no serious or critical violations at mobile and desktop sizes', async ({ page }) => {
    for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
    }
  });

  test('Static origin returns a real 404 for unknown paths', async ({ request }) => {
    expect((await request.get('/')).status()).toBe(200);
    expect((await request.get('/nonexistent-test-path-404')).status()).toBe(404);
  });
});

