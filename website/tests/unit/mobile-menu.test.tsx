import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MobileMenu } from '@/landing/MobileMenu.client';

describe('MobileMenu', () => {
  it('MobileMenu_WhenEscapePressedWhileOpen_ClosesDisclosureAndRestoresFocusToSummary', async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileMenu />);
    const menuSummary = screen.getByLabelText('Menu', { selector: 'summary' });
    const details = container.querySelector('details');

    if (!details) throw new Error('The native Menu disclosure was not rendered.');
    details.open = true;
    const firstLink = screen.getAllByRole('link')[0];
    firstLink.focus();

    await user.keyboard('{Escape}');

    expect(details.open).toBe(false);
    expect(menuSummary).toHaveFocus();
  });
});
