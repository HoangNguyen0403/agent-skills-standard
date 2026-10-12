import React from "react";

export type ActionIconName = "forward" | "copy" | "check";

export interface ActionIconProps {
  name: ActionIconName;
  className?: string;
}

export function ActionIcon({
  name,
  className,
}: ActionIconProps): React.JSX.Element {
  if (name === "forward") {
    return (
      <svg
        viewBox="0 0 18 18"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
        className={className}
      >
        <path
          d="M3.75 9h10.5M9 3.75l5.25 5.25L9 14.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "copy") {
    return (
      <svg
        viewBox="0 0 18 18"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
        className={className}
      >
        <rect
          x="6"
          y="6"
          width="9"
          height="9.75"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 3.75H3.75v9.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // check
  return (
    <svg
      viewBox="0 0 18 18"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M3.75 9l3.75 3.75 7.5-7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
