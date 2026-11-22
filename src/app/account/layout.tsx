import { Suspense, type ReactNode } from "react";
import { AccountNav } from "@/components/account-nav";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import { requireUser } from "@/lib/current-user";

export const metadata = {
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Suspense fallback={<p className="text-sm text-muted">Кабинет…</p>}>
          <Menu />
        </Suspense>
        <div className="min-w-0">{children}</div>
      </div>
      <Footer />
    </div>
  );
}

async function Menu() {
  const user = await requireUser();
  return <AccountNav isAdmin={user.isAdmin} />;
}
