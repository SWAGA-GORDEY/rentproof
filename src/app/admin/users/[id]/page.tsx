import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  dccAddAdminNoteAction,
  dccAssignBadgeAction,
  dccBanUserAction,
  dccExtendSubscriptionAction,
  dccGrantSubscriptionAction,
  dccRevokeBadgeAction,
  dccRevokeSubscriptionAction,
  dccUnbanUserAction,
} from "@/app/actions/dcc";
import { OwnerBadge } from "@/components/owner-badge";
import { UserBadgeList } from "@/components/user-badge-list";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { adminErrorMessage, adminSavedMessage } from "@/lib/admin-action-feedback";
import { activeBan, listBans } from "@/lib/bans";
import { requireStaff } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { formatDateRu } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";
import { currentSubscriptionCard, GRANT_DURATIONS_DAYS } from "@/lib/admin-subscriptions";
import { listSubscriptionHistory } from "@/lib/subscriptions";
import { listRecentAudit } from "@/lib/audit";
import { listUserBadges, MANUAL_BADGE_KINDS, ownerAssignedAt } from "@/lib/user-badges";
import { formatKopecks } from "@/lib/money";
import { enforceSubscriptionExpiry } from "@/lib/subscription-lifecycle";

type FlashQuery = { saved?: string; error?: string; plan?: string };

export default function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashQuery>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Карточка пользователя…</p>}>
      <Body params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashQuery>;
}) {
  const { staff } = await requireStaff("users.view");
  const { id } = await params;
  const flash = await searchParams;
  enforceSubscriptionExpiry(id);

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
  const currentBan = activeBan(id);
  const notes = getDb()
    .prepare(`SELECT id, body, created_at, author_id FROM admin_notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`)
    .all(id) as Array<{ id: string; body: string; created_at: string; author_id: string }>;
  const audit = listRecentAudit(100).filter((entry) => entry.entityId === id || entry.actorId === id).slice(0, 30);
  const canBan = hasPermission(staff, "users.ban");
  const canUnban = hasPermission(staff, "users.unban");
  const canGrant = hasPermission(staff, "subscriptions.grant");
  const canBadges = hasPermission(staff, "admins.manage");
  const badges = listUserBadges(user.id);
  const ownerSince = user.staff_role === "owner" ? ownerAssignedAt(user.id) : null;
  const payments = getDb()
    .prepare(
      `SELECT id, status, purpose, amount_kopecks, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    )
    .all(id) as Array<{ id: string; status: string; purpose: string; amount_kopecks: number; created_at: string }>;

  const savedMsg = adminSavedMessage(flash.saved, flash.plan);
  const errorMsg = adminErrorMessage(flash.error);
  const isBlocked = Boolean(user.blocked_at) || (currentBan && currentBan.kind !== "feature");

  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <p className="text-xs font-semibold uppercase text-accent">User</p>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-3xl font-semibold text-navy">
          {user.name}
          {user.staff_role === "owner" ? <OwnerBadge /> : null}
        </h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
        <div className="mt-3">
          <UserBadgeList badges={badges} />
        </div>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href="#subscription" className="rounded-xl border border-line bg-white px-3 py-1.5 font-semibold text-navy">
            Выдать / изменить подписку
          </a>
          {canBan && user.staff_role !== "owner" ? (
            <a href="#bans" className="rounded-xl border border-line bg-white px-3 py-1.5 font-semibold text-navy">
              {isBlocked ? "Разблокировать" : "Заблокировать"}
            </a>
          ) : null}
          <a href="#history" className="rounded-xl border border-line bg-white px-3 py-1.5 font-semibold text-navy">
            История
          </a>
          <Link href="/owner/users" className="rounded-xl border border-line bg-white px-3 py-1.5 text-muted">
            ← К списку
          </Link>
        </nav>
      </div>

      {savedMsg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">
          {savedMsg}
        </div>
      ) : null}
      {errorMsg ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900" role="alert">
          {errorMsg}
        </div>
      ) : null}

      {isBlocked ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950" role="status">
          <p className="font-semibold">Статус: ЗАБЛОКИРОВАН</p>
          <p className="mt-1">
            blocked_at: {user.blocked_at ? formatDateRu(user.blocked_at) : "—"}
            {currentBan ? ` · ${currentBan.kind} · ${currentBan.reason}` : ""}
          </p>
          <p className="mt-1 text-xs">Вход и защищённые функции недоступны, пока блокировка не снята.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-mist/40 px-4 py-2 text-sm text-muted">
          Статус блокировки: активен (не заблокирован)
        </div>
      )}

      <section
        className={`grid gap-2 rounded-3xl border p-5 text-sm sm:grid-cols-2 ${
          user.staff_role === "owner" ? "border-[#c41e3a]/40 bg-[#c41e3a]/5" : "border-line bg-white"
        }`}
      >
        <p>ID: {user.id}</p>
        <p>Роль продукта: {user.role}</p>
        <p>Staff: {user.staff_role ?? "—"}</p>
        <p>
          Тариф: <strong className="text-navy">{user.plan.toUpperCase()}</strong>
        </p>
        <p>Email: {user.email_verified ? "verified" : "unverified"}</p>
        <p>
          Аккаунт: {user.account_status}
          {user.blocked_at ? " · blocked" : ""}
        </p>
        <p>Регистрация: {formatDateRu(user.created_at)}</p>
        <p>Последний вход: {user.last_login_at ? formatDateRu(user.last_login_at) : "—"}</p>
        <p>Объявлений: {listings}</p>
        <p>
          Телефон / город: {user.phone ?? "—"} / {user.city ?? "—"}
        </p>
        {ownerSince ? <p className="sm:col-span-2 text-[#8b1228]">OWNER с: {formatDateRu(ownerSince)}</p> : null}
      </section>

      <section id="subscription" className="scroll-mt-24 rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Подписка</h2>
        {sub ? (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            <li>
              Тариф: <strong className="text-navy">{sub.plan.toUpperCase()}</strong> · статус {sub.status}
            </li>
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
              <p className="text-sm font-semibold text-navy md:col-span-2">Выдать / изменить подписку</p>
              <label className="grid gap-1 text-sm">
                Тариф
                <select name="plan" className={fieldClass} defaultValue={user.plan === "free" ? "plus" : user.plan}>
                  <option value="plus">PLUS — 299 ₽/мес</option>
                  <option value="pro">PRO — 799 ₽/мес</option>
                  <option value="free">FREE — 0 ₽ (отзыв)</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Источник
                <select
                  name="sourceKind"
                  className={fieldClass}
                  defaultValue={staff.staffRole === "owner" ? "owner_grant" : "admin_granted"}
                >
                  {staff.staffRole === "owner" ? <option value="owner_grant">OWNER_GRANT</option> : null}
                  <option value="admin_granted">ADMIN_GRANTED</option>
                  <option value="promotional">PROMOTIONAL</option>
                  <option value="referral">REFERRAL</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Дата начала (опц.)
                <input name="startsAt" type="datetime-local" className={fieldClass} />
              </label>
              <label className="grid gap-1 text-sm">
                Срок
                <select name="duration" className={fieldClass} defaultValue="30">
                  {GRANT_DURATIONS_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d} дней
                    </option>
                  ))}
                  {staff.staffRole === "owner" ? <option value="indefinite">Бессрочно</option> : null}
                </select>
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                Причина (обязательно)
                <input name="reason" required minLength={3} className={fieldClass} placeholder="Минимум 3 символа" />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                Комментарий администратора
                <input name="note" className={fieldClass} />
              </label>
              {staff.staffRole === "owner" ? (
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" name="confirmIndefinite" value="1" /> Подтверждаю бессрочную выдачу
                </label>
              ) : null}
              <p className="text-xs text-muted md:col-span-2">
                Ручная выдача не создаёт платёж. OWNER_GRANT / ADMIN_GRANTED ≠ paid. После выдачи users.plan и entitlements
                обновляются сразу.
              </p>
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
                <input type="checkbox" name="confirm" value="1" required /> Подтверждаю отзыв
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
        <section id="bans" className="scroll-mt-24 rounded-3xl border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold text-navy">Блокировки</h2>
          <p className="mt-1 text-xs text-muted">
            Аккаунт не удаляется. Permanent/temporary ставят blocked_at и рвут сессии. Feature — только ограничения функций.
          </p>
          <form action={dccBanUserAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />
            <select name="kind" className={fieldClass} defaultValue="permanent">
              <option value="permanent">Постоянная (полный блок)</option>
              <option value="temporary">Временная</option>
              <option value="feature">Ограничение функций</option>
            </select>
            <input name="days" defaultValue="7" className={fieldClass} placeholder="Дней (для temporary)" />
            <input
              name="reason"
              required
              minLength={3}
              className={`${fieldClass} md:col-span-2`}
              placeholder="Причина (обязательно)"
            />
            <div className="flex flex-wrap gap-3 text-xs md:col-span-2">
              {(["listings", "bookings", "ai", "crm"] as const).map((feature) => (
                <label key={feature} className="flex items-center gap-2">
                  <input type="checkbox" name={`feature_${feature}`} defaultChecked /> {feature}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy md:col-span-2">
              <input type="checkbox" name="confirmBan" value="1" required /> Подтверждаю блокировку
            </label>
            <button type="submit" className={primaryButton}>
              Заблокировать
            </button>
          </form>
          {canUnban ? (
            <form action={dccUnbanUserAction} className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-mist/40 p-3">
              <input type="hidden" name="userId" value={user.id} />
              <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                <input type="checkbox" name="confirmUnban" value="1" required /> Подтверждаю разблокировку
              </label>
              <button type="submit" className={secondaryButton}>
                Разблокировать
              </button>
            </form>
          ) : null}
          <ul className="mt-4 space-y-2 text-sm">
            {bans.map((ban) => (
              <li key={ban.id}>
                {ban.kind} · {ban.reason} · {formatDateRu(ban.createdAt)}
                {ban.expiresAt ? ` · до ${formatDateRu(ban.expiresAt)}` : ""}
                {ban.liftedAt ? ` · снята ${formatDateRu(ban.liftedAt)}` : " · активна"}
              </li>
            ))}
            {bans.length === 0 ? <li className="text-muted">Истории блокировок нет.</li> : null}
          </ul>
        </section>
      ) : user.staff_role === "owner" ? (
        <section className="rounded-3xl border border-[#c41e3a]/30 bg-[#c41e3a]/5 p-5 text-sm text-[#8b1228]">
          OWNER нельзя заблокировать через обычный административный интерфейс.
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">Платежи пользователя</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {payments.map((payment) => (
            <li key={payment.id} className="border-b border-line py-2">
              {payment.status} · {payment.purpose} · {formatKopecks(payment.amount_kopecks)} ·{" "}
              {formatDateRu(payment.created_at)}
            </li>
          ))}
          {payments.length === 0 ? <li className="text-muted">Реальных платежей нет.</li> : null}
        </ul>
      </section>

      {canBadges ? (
        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold text-navy">Значки (ручные)</h2>
          <p className="mt-1 text-xs text-muted">
            OWNER / ADMIN / PLUS / PRO / VERIFIED — производные. Через форму нельзя выдать OWNER.
          </p>
          <form action={dccAssignBadgeAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />
            <select name="kind" className={fieldClass}>
              {MANUAL_BADGE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
            <input name="reason" required placeholder="Причина" className={fieldClass} />
            <button type="submit" className={secondaryButton}>
              Выдать значок
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {badges
              .filter((badge): badge is Extract<typeof badge, { source: "manual" }> => badge.source === "manual")
              .map((badge) => (
                <li key={badge.id} className="flex flex-wrap items-center gap-3">
                  <UserBadgeList badges={[badge]} />
                  <form action={dccRevokeBadgeAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="badgeId" value={badge.id} />
                    <input type="hidden" name="reason" value="revoke" />
                    <button type="submit" className="text-xs font-semibold text-navy underline">
                      Отозвать
                    </button>
                  </form>
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

      <section id="history" className="scroll-mt-24 rounded-3xl border border-line bg-white p-5">
        <h2 className="font-display text-xl font-semibold text-navy">История действий</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {audit.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 border-b border-line py-2">
              <span className={entry.action.startsWith("owner.") ? "font-semibold text-[#c41e3a]" : ""}>
                {entry.action.startsWith("owner.") ? "♛ " : ""}
                {entry.action}
              </span>
              <span className="text-muted">{formatDateRu(entry.createdAt)}</span>
            </li>
          ))}
          {audit.length === 0 ? <li className="text-muted">Пока пусто.</li> : null}
        </ul>
      </section>
    </div>
  );
}
