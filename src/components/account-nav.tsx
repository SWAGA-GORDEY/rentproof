"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountLinks } from "@/lib/navigation";

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...accountLinks, { href: "/admin", label: "Админ" }] : accountLinks;
  return (
    <nav aria-label="Кабинет" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-navy text-white" : "text-graphite hover:bg-mist"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
