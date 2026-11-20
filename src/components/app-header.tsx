import { Suspense } from "react";
import { Header, type HeaderUser } from "@/components/header";
import { getCurrentUser } from "@/lib/current-user";

export function AppHeader() {
  return (
    <Suspense fallback={<Header user={null} />}>
      <HeaderSession />
    </Suspense>
  );
}

async function HeaderSession() {
  const user = await getCurrentUser();
  const headerUser: HeaderUser = user ? { name: user.name, isAdmin: user.isAdmin } : null;
  return <Header user={headerUser} />;
}
