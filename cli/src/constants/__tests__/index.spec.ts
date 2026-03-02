import { describe, expect, it } from 'vitest';
import {
  BACKEND_FRAMEWORKS,
  COMMON_SKILL_EXCLUDES,
  FRONTEND_FRAMEWORKS,
  getFrameworkType,
  MOBILE_FRAMEWORKS,
} from '../index';

describe('getFrameworkType', () => {
  it('should return "backend" for all backend frameworks', () => {
    for (const fw of BACKEND_FRAMEWORKS) {
      expect(getFrameworkType(fw)).toBe('backend');
    }
  });

  it('should return "frontend" for all frontend frameworks', () => {
    for (const fw of FRONTEND_FRAMEWORKS) {
      expect(getFrameworkType(fw)).toBe('frontend');
    }
  });

  it('should return "mobile" for all mobile frameworks', () => {
    for (const fw of MOBILE_FRAMEWORKS) {
      expect(getFrameworkType(fw)).toBe('mobile');
    }
  });

  it('should return null for an unknown framework', () => {
    expect(getFrameworkType('unknown-framework')).toBeNull();
    expect(getFrameworkType('')).toBeNull();
  });

  it('should map to the correct COMMON_SKILL_EXCLUDES entry', () => {
    expect(COMMON_SKILL_EXCLUDES[getFrameworkType('nestjs')!]).toEqual(
      COMMON_SKILL_EXCLUDES.backend,
    );
    expect(COMMON_SKILL_EXCLUDES[getFrameworkType('react')!]).toEqual(
      COMMON_SKILL_EXCLUDES.frontend,
    );
    expect(COMMON_SKILL_EXCLUDES[getFrameworkType('flutter')!]).toEqual(
      COMMON_SKILL_EXCLUDES.mobile,
    );
  });
});
