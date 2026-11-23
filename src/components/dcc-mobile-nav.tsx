"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type DccNavLink = { href: string; label: string };

/** Full DCC section list for viewports below `lg` (desktop keeps the aside). */
export function DccMobileNav({ links, dark = false }: { links: DccNavLink[]; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter((item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q));
  }, [links, query]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className={
          dark
            ? "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100"
            : "rounded-lg border border-line bg-mist px-3 py-1.5 text-xs font-semibold text-navy"
        }
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
          className={
            dark
              ? "absolute left-0 right-0 top-full z-20 border-b border-white/10 bg-[#0b1220] shadow-lg"
              : "absolute left-0 right-0 top-full z-20 border-b border-line bg-white shadow-sm"
          }
        >
          <div className="mx-auto max-w-[1400px] px-4 pt-3 sm:px-6">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск раздела…"
              className={
                dark
                  ? "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400"
                  : "w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-navy"
              }
              aria-label="Поиск раздела"
            />
          </div>
          <ul className="mx-auto grid max-h-[70vh] max-w-[1400px] gap-0.5 overflow-y-auto px-4 py-3 sm:px-6">
            {filtered.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={
                      dark
                        ? `block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                            active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`
                        : `block rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-mist hover:text-navy ${
                            active ? "bg-mist text-navy" : "text-ink/85"
                          }`
                    }
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className={`px-3 py-2 text-sm ${dark ? "text-slate-400" : "text-muted"}`}>Ничего не найдено</li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
