import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import 'vitest';

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends TestingLibraryMatchers<T, R> {}
  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<HTMLElement, unknown> {}
}
