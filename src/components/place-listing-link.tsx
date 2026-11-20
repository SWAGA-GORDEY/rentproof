"use client";

import type { ReactNode } from "react";
import { primaryButton } from "@/components/styles";

type PlaceListingLinkProps = {
  className?: string;
  children?: ReactNode;
  onNavigate?: () => void;
};

export function PlaceListingLink({
  className,
  children = "Разместить объявление",
  onNavigate,
}: PlaceListingLinkProps) {
  return (
    <a
      href="#razmestit"
      className={className ?? primaryButton}
      onClick={() => {
        onNavigate?.();
        if (window.location.hash === "#razmestit") {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      }}
    >
      {children}
    </a>
  );
}
