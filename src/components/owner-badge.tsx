import type { ReactNode } from "react";

/** Red crown / OWNER identity — identification color, not error accent. */
export function OwnerBadge({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-[#c41e3a]/40 bg-[#c41e3a]/10 px-1.5 py-0.5 font-semibold text-[#c41e3a] ${
        compact ? "text-[10px] uppercase tracking-wide" : "text-xs"
      } ${className}`}
      title="Владелец приложения"
    >
      <span aria-hidden="true">{compact ? "♛" : "♛ OWNER"}</span>
      {compact ? <span className="sr-only">OWNER</span> : null}
    </span>
  );
}

export function OwnerHighlight({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-[#c41e3a]/35 bg-[#c41e3a]/5 px-2 py-0.5 text-[#8b1228]">{children}</span>
  );
}
