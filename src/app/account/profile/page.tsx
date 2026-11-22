import { Suspense } from "react";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/current-user";
import { roleLabel } from "@/lib/validation";

export const metadata = { title: "Профиль" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем профиль…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Профиль</h1>
      <p className="text-sm text-muted">{user.email} · {roleLabel(user.role)}. Почту и роль здесь не меняют.</p>
      <div className="rounded-3xl border border-line bg-white p-6">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
