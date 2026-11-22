import { Suspense } from "react";
import {
  changeEmailAction,
  deleteAccountAction,
  revokeConsentAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/app/actions/auth";
import { PasswordForm } from "@/components/simple-forms";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { getSessionToken, requireUser } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { listUserConsents } from "@/lib/legal";
import { listUserSessions } from "@/lib/sessions";

export const metadata = { title: "Безопасность" };

export default function SecurityPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем безопасность…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const token = await getSessionToken();
  const sessions = listUserSessions(user.id, token);
  const consents = listUserConsents(user.id);

  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Безопасность</h1>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Email</h2>
        <p className="mt-2 text-sm text-muted">
          Текущий: {user.email}. Статус: {user.emailVerified ? "подтверждён" : "не подтверждён"}.
        </p>
        <form action={changeEmailAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input name="email" type="email" placeholder="Новый email" className={fieldClass} required />
          <button type="submit" className={secondaryButton}>
            Сменить и подтвердить
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Пароль</h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-navy">Сессии</h2>
          <form action={revokeOtherSessionsAction}>
            <button type="submit" className={secondaryButton}>
              Завершить другие
            </button>
          </form>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
              <span>
                {formatDateRu(session.createdAt)} → {formatDateRu(session.expiresAt)}
                {session.current ? " · текущая" : ""}
              </span>
              {!session.current ? (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button type="submit" className="text-accent underline">
                    Завершить
                  </button>
                </form>
              ) : null}
            </li>
          ))}
          {sessions.length === 0 ? <li className="text-muted">Активных сессий нет.</li> : null}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Согласия</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {consents.map((item, index) => (
            <li key={`${item.consent_type}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
              <span>
                {item.consent_type} · v{item.document_version} · {item.consent_status}
                {item.accepted_at ? ` · ${formatDateRu(item.accepted_at)}` : ""}
              </span>
              {item.consent_status === "accepted" ? (
                <form action={revokeConsentAction}>
                  <input type="hidden" name="consentType" value={item.consent_type} />
                  <button type="submit" className="text-accent underline">
                    Отозвать
                  </button>
                </form>
              ) : null}
            </li>
          ))}
          {consents.length === 0 ? <li className="text-muted">Записей согласий пока нет.</li> : null}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Удаление аккаунта</h2>
        <p className="mt-2 text-sm text-muted">Действие необратимо. Введите пароль и слово УДАЛИТЬ.</p>
        <form action={deleteAccountAction} className="mt-4 grid gap-3">
          <input name="password" type="password" autoComplete="current-password" placeholder="Пароль" className={fieldClass} />
          <input name="confirm" placeholder="УДАЛИТЬ" className={fieldClass} />
          <button type="submit" className={primaryButton}>
            Удалить аккаунт
          </button>
        </form>
      </section>
    </div>
  );
}
