import { OwnerBadge } from "@/components/owner-badge";
import type { DisplayBadge } from "@/lib/user-badges";

const toneClass: Record<DisplayBadge["tone"], string> = {
  owner: "",
  staff: "border-navy/30 bg-navy/5 text-navy",
  plan: "border-accent/40 bg-accent/10 text-accent",
  ok: "border-emerald-700/30 bg-emerald-50 text-emerald-800",
  manual: "border-line bg-mist text-ink",
};

export function UserBadgeList({ badges }: { badges: DisplayBadge[] }) {
  if (!badges.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {badges.map((badge) =>
        badge.kind === "owner" ? (
          <OwnerBadge key={badge.kind} />
        ) : (
          <span
            key={`${badge.kind}-${"id" in badge ? badge.id : "d"}`}
            className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClass[badge.tone]}`}
          >
            {badge.label}
          </span>
        ),
      )}
    </span>
  );
}
