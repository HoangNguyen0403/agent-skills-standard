import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Augment @vitest/expect: Vitest's Assertion is declared by this package,
// even though tests import the expect function through the vitest re-export.
declare module '@vitest/expect' {
  interface Assertion<T> extends TestingLibraryMatchers<HTMLElement, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<HTMLElement, unknown> {}
}
