"use client";

import React, { useCallback } from "react";
import { useGA4 } from "./GA4Context";
import type { RawEventInput } from "./ga4-client";

export interface GA4LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly event: RawEventInput;
  readonly children: React.ReactNode;
}

export function GA4Link({
  event,
  onClick,
  children,
  ...rest
}: GA4LinkProps): React.JSX.Element {
  const { trackEvent } = useGA4();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Dispatch non-blocking analytics event; never prevent default or delay navigation
      trackEvent(event).catch(() => {});
      onClick?.(e);
    },
    [event, trackEvent, onClick],
  );

  return (
    <a {...rest} onClick={handleClick}>
      {children}
    </a>
  );
}
