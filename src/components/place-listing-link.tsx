"use client";

import type { ReactNode } from "react";
import Link from "next/link";
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
    <Link href="/listings/create" className={className ?? primaryButton} onClick={() => onNavigate?.()}>
      {children}
    </Link>
  );
}
