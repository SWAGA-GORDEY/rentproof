import { Suspense } from "react";
import { dccAssignStaffAction, dccRevokeStaffAction, dccUpdateStaffAction } from "@/app/actions/dcc";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { requireStaff } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { PERMISSIONS } from "@/lib/rbac";
import { listStaff } from "@/lib/staff";

export default function AdminStaffPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Staff…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireStaff("admins.manage");
  const staff = listStaff();

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Admin Management</h1>
      <p className="text-sm text-muted">OWNER назначает сотрудников только из существующих аккаунтов. OWNER через UI не назначается.</p>

      <form action={dccAssignStaffAction} className="grid gap-3 rounded-3xl border border-line bg-white p-5 md:grid-cols-2">
        <h2 className="font-display text-xl font-semibold text-navy md:col-span-2">Назначить администратора</h2>
        <input name="email" type="email" required placeholder="email пользователя" className={fieldClass} />
        <input name="displayName" placeholder="Отображаемое имя" className={fieldClass} />
        <select name="role" className={fieldClass}>
          <option value="admin">ADMIN</option>
          <option value="moderator">MODERATOR</option>
          <option value="support">SUPPORT</option>
        </select>
        <div className="grid gap-2 md:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
          {PERMISSIONS.map((perm) => (
            <label key={perm} className="flex items-center gap-2 text-xs">
              <input type="checkbox" name={`perm_${perm}`} /> {perm}
            </label>
          ))}
        </div>
        <button type="submit" className={primaryButton}>
          Назначить
        </button>
      </form>

      <ul className="grid gap-4">
        {staff.map((member) => (
          <li key={member.id} className="rounded-3xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold text-navy">
                  {member.displayName} · {member.staffRole.toUpperCase()}
                </p>
                <p className="text-sm text-muted">
                  {member.name} · {member.email}
                  {member.staffDisabledAt ? " · DISABLED" : ""}
                </p>
                <p className="mt-1 text-xs text-muted">с {formatDateRu(member.createdAt)}</p>
                <p className="mt-2 text-xs text-muted">{member.permissions.join(", ")}</p>
              </div>
              {member.staffRole !== "owner" ? (
                <div className="grid gap-2">
                  <form action={dccUpdateStaffAction} className="grid gap-2">
                    <input type="hidden" name="userId" value={member.id} />
                    <input name="displayName" defaultValue={member.displayName} className={fieldClass} />
                    <select name="role" defaultValue={member.staffRole} className={fieldClass}>
                      <option value="admin">ADMIN</option>
                      <option value="moderator">MODERATOR</option>
                      <option value="support">SUPPORT</option>
                    </select>
                    <select name="disabled" defaultValue={member.staffDisabledAt ? "1" : "0"} className={fieldClass}>
                      <option value="0">Активен</option>
                      <option value="1">Отключён</option>
                    </select>
                    <div className="grid max-h-40 gap-1 overflow-auto sm:grid-cols-2">
                      {PERMISSIONS.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" name={`perm_${perm}`} defaultChecked={member.permissions.includes(perm)} />
                          {perm}
                        </label>
                      ))}
                    </div>
                    <button type="submit" className={secondaryButton}>
                      Сохранить
                    </button>
                  </form>
                  <form action={dccRevokeStaffAction}>
                    <input type="hidden" name="userId" value={member.id} />
                    <button type="submit" className={secondaryButton}>
                      Снять роль
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-xs font-semibold text-accent">OWNER защищён</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
