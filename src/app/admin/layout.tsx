import { Suspense, type ReactNode } from "react";
import { DccShell } from "@/components/dcc-shell";
import { requireStaff } from "@/lib/current-user";

export const metadata = {
  title: "Developer Control Center",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Загрузка Control Center…</p>}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}

async function Guard({ children }: { children: ReactNode }) {
  const { staff } = await requireStaff();
  return <DccShell staff={staff}>{children}</DccShell>;
}
