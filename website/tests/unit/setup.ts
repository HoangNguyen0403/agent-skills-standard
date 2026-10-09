import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
// Automatically clean up the DOM after each unit test.
afterEach(() => {
  cleanup();
});

expect.extend(matchers);
