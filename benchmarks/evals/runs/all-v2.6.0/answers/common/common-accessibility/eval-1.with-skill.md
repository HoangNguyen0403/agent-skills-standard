Prefer a native `<select>` if the requirement is only single-option selection; it already provides reliable keyboard, screen-reader, and mobile behavior. If a custom menu is necessary, implement the ARIA menu pattern deliberately:

- Use a real `<button type="button">` as the trigger, with an accessible name, `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` pointing to the menu.
- Render a menu container with `role="menu"` and a stable `id`. Use `role="menuitem"` for ordinary actions, or `role="menuitemradio"` plus `aria-checked` for a single selected option. Do not use a clickable `div`.
- On open, move focus to the selected option (or the first option). Use roving `tabIndex` (`0` for the active option and `-1` for the others) or `aria-activedescendant`, rather than positive `tabIndex` values.
- Support `ArrowUp`/`ArrowDown` with wraparound, `Home`, `End`, `Enter`/`Space` to choose, and `Escape` to close. After choosing or pressing Escape, close the menu and return focus to the trigger. Tab should leave the widget in normal document order.
- Keep the focus indicator visible with at least a 2px replacement style if the browser outline is changed. Ensure the trigger and options have adequate target size and contrast, and do not communicate selection by color alone; expose it with text and/or `aria-checked`.
- Close on an outside pointer interaction without stealing focus unexpectedly, and make sure the menu remains usable at 200% zoom.

A minimal React structure looks like this (the state and refs must implement the behavior above):

```tsx
<button
  ref={triggerRef}
  id="country-trigger"
  type="button"
  aria-haspopup="menu"
  aria-expanded={open}
  aria-controls="country-menu"
  onClick={() => setOpen((isOpen) => !isOpen)}
>
  {selectedCountry.label}
</button>

{open && (
  <ul id="country-menu" role="menu" aria-labelledby="country-trigger">
    {countries.map((country, index) => (
      <li key={country.value} role="none">
        <button
          type="button"
          role="menuitemradio"
          aria-checked={country.value === value}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => {
            onChange(country.value);
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          {country.label}
        </button>
      </li>
    ))}
  </ul>
)}
```

Test the finished component with axe-core in CI, then complete the entire flow using only the keyboard and with NVDA or VoiceOver. Confirm that focus never disappears, the selected value is announced, Escape restores focus to the trigger, and the visual order matches the tab order.

