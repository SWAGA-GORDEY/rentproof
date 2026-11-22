"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { quietButton } from "@/components/styles";

export type DccNavLink = { href: string; label: string };

/** Full DCC section list for viewports below `lg` (desktop keeps the aside). */
export function DccMobileNav({ links }: { links: DccNavLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className={`${quietButton} rounded-lg border border-line bg-mist px-3 py-1.5 text-xs`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Закрыть меню разделов" : "Открыть меню разделов"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Закрыть" : `Разделы (${links.length})`}
      </button>
      {open ? (
        <nav
          id={panelId}
          aria-label="Разделы Control Center"
          className="absolute left-0 right-0 top-full z-20 border-b border-line bg-white shadow-sm"
        >
          <ul className="mx-auto grid max-h-[70vh] max-w-[1400px] gap-0.5 overflow-y-auto px-4 py-3 sm:px-6">
            {links.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-mist hover:text-navy ${
                      active ? "bg-mist text-navy" : "text-ink/85"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
