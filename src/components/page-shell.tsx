import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}
