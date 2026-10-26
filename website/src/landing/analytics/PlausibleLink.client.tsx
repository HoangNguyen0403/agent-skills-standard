"use client";

import React, { useCallback } from "react";
import { usePlausible } from "./PlausibleContext";
import type { RawEventInput } from "./plausible-client";

export interface PlausibleLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly event: RawEventInput;
  readonly children: React.ReactNode;
}

export function PlausibleLink({
  event,
  onClick,
  children,
  ...rest
}: PlausibleLinkProps): React.JSX.Element {
  const { trackEvent } = usePlausible();

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
