import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RentProof — аренда с понятными условиями", template: "%s · RentProof" },
  description: "Находите оборудование для аренды, публикуйте объявления и управляйте сделками в одном месте.",
  applicationName: "RentProof",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><SiteHeader /><main className="min-h-[70vh]">{children}</main><SiteFooter /></body></html>;
}
