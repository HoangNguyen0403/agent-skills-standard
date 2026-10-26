import { CategoryConfig } from '../models/config';

/**
 * Product Management ships a shared planning foundation. Selecting the
 * category without customization must enable exactly these skills, not every
 * optional skill in the category.
 */
export const PRODUCT_MANAGEMENT_FOUNDATION_SKILLS = [
  'product-business-requirements',
  'product-requirements',
] as const;

/**
 * Builds the selection used when a category is enabled without advanced
 * customization. Kept shared so `init` and the skill manager cannot drift.
 */
export function defaultCategorySelection(
  category: string,
  ref: string,
): CategoryConfig {
  if (category === 'product-management') {
    return {
      ref,
      include: [...PRODUCT_MANAGEMENT_FOUNDATION_SKILLS],
    };
  }

  return { ref };
}
