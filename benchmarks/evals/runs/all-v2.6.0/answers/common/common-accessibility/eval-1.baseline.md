# Accessible React custom dropdown

Use the ARIA `listbox` pattern and manage focus deliberately. The trigger should be a real `<button>`, expose whether the popup is open, and point to the popup with `aria-controls`. The popup should have `role="listbox"`; each option should have `role="option"` and an `aria-selected` state.

```jsx
import { useEffect, useId, useRef, useState } from "react";

export function Dropdown({ label, options, value, onChange }) {
  const id = useId();
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function openMenu(index = selectedIndex) {
    setActiveIndex(index);
    setOpen(true);
  }

  function select(index) {
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleButtonKeyDown(event) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu(event.key === "ArrowUp" ? options.length - 1 : selectedIndex);
    }
  }

  function handleOptionKeyDown(event) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        select(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const selected = options[selectedIndex];

  return (
    <div>
      <span id={`${id}-label`}>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleButtonKeyDown}
      >
        <span id={`${id}-value`}>{selected?.label ?? "Choose an option"}</span>
      </button>

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          onKeyDown={handleOptionKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="option"
              tabIndex={index === activeIndex ? 0 : -1}
              aria-selected={option.value === value}
              onClick={() => select(index)}
              onFocus={() => setActiveIndex(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

In production, also close the popup when focus leaves the component or when the user clicks outside it, keep the popup positioned without obscuring content, and ensure the focus indicator has sufficient contrast. For a simple single-choice field, prefer a native `<select>` because it supplies robust keyboard and screen-reader behavior with much less custom code. Test the actual component with keyboard-only navigation and a screen reader; ARIA attributes do not compensate for broken focus behavior.

