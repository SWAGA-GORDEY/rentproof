import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  dccAddAdminNoteAction,
  dccBanUserAction,
  dccExtendSubscriptionAction,
  dccGrantSubscriptionAction,
  dccRevokeSubscriptionAction,
  dccUnbanUserAction,
} from "@/app/actions/dcc";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { listBans } from "@/lib/bans";
import { requireStaff } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { formatDateRu } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";
import { currentSubscriptionCard, GRANT_DURATIONS_DAYS } from "@/lib/admin-subscriptions";
import { listSubscriptionHistory } from "@/lib/subscriptions";
import { listRecentAudit } from "@/lib/audit";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Карточка пользователя…</p>}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { staff } = await requireStaff("users.view");
  const { id } = await params;
  const user = getDb()
    .prepare(
      `SELECT id, email, name, role, plan, staff_role, display_name, blocked_at, email_verified, email_verified_at,
              created_at, last_login_at, city, phone, account_status
       FROM users WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        email: string;
        name: string;
        role: string;
        plan: string;
        staff_role: string | null;
        display_name: string | null;
        blocked_at: string | null;
        email_verified: number;
        email_verified_at: string | null;
        created_at: string;
        last_login_at: string | null;
        city: string | null;
        phone: string | null;
        account_status: string;
      }
    | undefined;
  if (!user) notFound();

  const listings = Number(
    (getDb().prepare(`SELECT COUNT(*) AS c FROM listings WHERE owner_id = ?`).get(id) as { c: number }).c,
  );
  const sub = currentSubscriptionCard(id);
  const history = listSubscriptionHistory(id, 20);
  const bans = listBans(id);
  const notes = getDb()
    .prepare(`SELECT id, body, created_at, author_id FROM admin_notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`)
    .all(id) as Array<{ id: string; body: string; created_at: string; author_id: string }>;
  const audit = listRecentAudit(100).filter((entry) => entry.entityId === id || entry.actorId === id).slice(0, 30);
  const canBan = hasPermission(staff, "users.ban");
  const canGrant = hasPermission(staff, "subscriptions.grant");

  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <p className="text-xs font-semibold uppercase text-accent">User</p>
        <h1 className="font-display text-3xl font-semibold text-navy">{user.name}</h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
      </div>

      <section className="grid gap-2 rounded-3xl border border-line bg-white p-5 text-sm sm:grid-cols-2">
        <p>ID: {user.id}</p>
        <p>Роль продукта: {user.role}</p>
        <p>Staff: {user.staff_role ?? "—"}</p>
        <p>Тариф: {user.plan}</p>
        <p>Email: {user.email_verified ? "verified" : "unverified"}</p>
        <p>Статус: {user.account_status}{user.blocked_at ? " · blocked" : ""}</p>
        <p>Регистрация: {formatDateRu(user.created_at)}</p>
        <p>Последний вход: {user.last_login_at ? formatDateRu(user.last_login_at) : "—"}</p>
        <p>Объявлений: {listings}</p>
        <p>Телефон / город: {user.phone ?? "—"} / {user.city ?? "—"}</p>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Подписка</h2>
        {sub ? (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            <li>Тариф: {sub.plan} · статус {sub.status}</li>
            <li>Тип: {sub.source_kind}</li>
            <li>Начало: {sub.started_at ? formatDateRu(sub.started_at) : "—"}</li>
            <li>Окончание: {sub.expires_at ? formatDateRu(sub.expires_at) : "бессрочно"}</li>
            <li>Осталось дней: {sub.daysLeft ?? "∞"}</li>
            <li>Выдал: {sub.granted_by ?? "—"}</li>
            <li>Причина: {sub.grant_reason ?? "—"}</li>
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Записей подписки нет (по умолчанию FREE).</p>
        )}

        {canGrant ? (
          <div className="mt-6 grid gap-4">
            <form action={dccGrantSubscriptionAction} className="grid gap-3 rounded-2xl bg-mist/50 p-4 md:grid-cols-2">
              <input type="hidden" name="userId" value={user.id} />
              <label className="grid gap-1 text-sm">
                Тариф
                <select name="plan" className={fieldClass}>
                  <option value="plus">PLUS 299 ₽</option>
                  <option value="pro">PRO 799 ₽</option>
                  <option value="free">FREE</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Тип
                <select name="sourceKind" className={fieldClass}>
                  <option value="admin_granted">ADMIN_GRANTED</option>
                  <option value="promotional">PROMOTIONAL</option>
                  <option value="referral">REFERRAL</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Срок
                <select name="duration" className={fieldClass}>
                  {GRANT_DURATIONS_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d} дней
                    </option>
                  ))}
                  {staff.staffRole === "owner" ? <option value="indefinite">Бессрочно</option> : null}
                </select>
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                Причина
                <input name="reason" required className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                Комментарий
                <input name="note" className={fieldClass} />
              </label>
              {staff.staffRole === "owner" ? (
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" name="confirmIndefinite" value="1" /> Подтверждаю бессрочную выдачу
                </label>
              ) : null}
              <button type="submit" className={primaryButton}>
                Выдать подписку
              </button>
            </form>

            <form action={dccExtendSubscriptionAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <label className="grid gap-1 text-sm">
                Продлить (дней)
                <input name="days" defaultValue="30" className={fieldClass} />
              </label>
              <input type="hidden" name="reason" value="extend" />
              <button type="submit" className={secondaryButton}>
                Продлить
              </button>
            </form>

            <form action={dccRevokeSubscriptionAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <input name="reason" placeholder="Причина отзыва" className={fieldClass} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirm" value="1" /> Подтверждаю отзыв
              </label>
              <button type="submit" className={secondaryButton}>
                Отозвать → FREE
              </button>
            </form>
          </div>
        ) : null}

        <ul className="mt-4 space-y-2 text-sm">
          {history.map((item) => (
            <li key={item.id} className="border-b border-line py-2">
              {item.plan} · {item.status} · {item.mode} · {formatDateRu(item.created_at)}
            </li>
          ))}
        </ul>
      </section>

      {canBan && user.staff_role !== "owner" ? (
        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold text-navy">Блокировки</h2>
          <form action={dccBanUserAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />
            <select name="kind" className={fieldClass}>
              <option value="permanent">Постоянная</option>
              <option value="temporary">Временная</option>
              <option value="feature">Ограничение функций</option>
            </select>
            <input name="days" defaultValue="7" className={fieldClass} placeholder="Дней (для temporary)" />
            <input name="reason" required className={`${fieldClass} md:col-span-2`} placeholder="Причина" />
            <div className="flex flex-wrap gap-3 text-xs md:col-span-2">
              {(["listings", "bookings", "ai", "crm"] as const).map((feature) => (
                <label key={feature} className="flex items-center gap-2">
                  <input type="checkbox" name={`feature_${feature}`} defaultChecked /> {feature}
                </label>
              ))}
            </div>
            <button type="submit" className={primaryButton}>
              Заблокировать
            </button>
          </form>
          <form action={dccUnbanUserAction} className="mt-3">
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className={secondaryButton}>
              Разблокировать
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {bans.map((ban) => (
              <li key={ban.id}>
                {ban.kind} · {ban.reason} · {formatDateRu(ban.createdAt)}
                {ban.liftedAt ? ` · снята ${formatDateRu(ban.liftedAt)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Внутренние заметки</h2>
        {hasPermission(staff, "users.edit") ? (
          <form action={dccAddAdminNoteAction} className="mt-3 grid gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <textarea name="body" className={fieldClass} rows={3} required />
            <button type="submit" className={secondaryButton}>
              Добавить заметку
            </button>
          </form>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-line py-2">
              {note.body}
              <span className="block text-xs text-muted">{formatDateRu(note.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">История действий</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 border-b border-line py-2">
              <span>{entry.action}</span>
              <span className="text-muted">{formatDateRu(entry.createdAt)}</span>
            </li>
          ))}
          {audit.length === 0 ? <li className="text-muted">Пока пусто.</li> : null}
        </ul>
      </section>
    </div>
  );
}
