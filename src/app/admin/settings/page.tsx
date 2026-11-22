import { Suspense } from "react";
import { dccSaveSettingAction } from "@/app/actions/dcc";
import { fieldClass, primaryButton } from "@/components/styles";
import { requireStaff } from "@/lib/current-user";
import { listSettings } from "@/lib/platform-settings";
import { hasPermission } from "@/lib/rbac";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Settings…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const { staff } = await requireStaff("settings.view");
  const settings = listSettings();
  const canManage = hasPermission(staff, "settings.manage");

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">System Settings</h1>
      <p className="text-sm text-muted">Секреты (API keys, SMTP passwords) через эту форму не редактируются.</p>
      <ul className="grid gap-4">
        {Object.entries(settings).map(([key, value]) => (
          <li key={key} className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs uppercase text-accent">{key}</p>
            {canManage ? (
              <form action={dccSaveSettingAction} className="mt-3 flex flex-wrap gap-3">
                <input type="hidden" name="key" value={key} />
                <input name="value" defaultValue={value} className={`${fieldClass} max-w-xl`} />
                <button type="submit" className={primaryButton}>
                  Сохранить
                </button>
              </form>
            ) : (
              <p className="mt-2 text-sm">{value || "—"}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
