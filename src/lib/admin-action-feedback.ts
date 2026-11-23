/** Human-readable flash messages for DCC user-card redirects (?saved= / ?error=). */

const SAVED: Record<string, string> = {
  ban: "Пользователь заблокирован. Сессии сброшены.",
  unban: "Пользователь разблокирован.",
  grant: "Подписка выдана. Тариф обновлён на сервере.",
  revoke: "Подписка отозвана. Тариф FREE.",
  extend: "Срок подписки продлён.",
  note: "Заметка сохранена.",
  badge: "Значок обновлён.",
};

const ERRORS: Record<string, string> = {
  ban: "Не удалось заблокировать пользователя.",
  ban_confirm: "Подтвердите блокировку галочкой.",
  ban_reason: "Укажите причину блокировки (минимум 3 символа).",
  ban_owner: "OWNER нельзя заблокировать через админ-панель.",
  ban_missing: "Пользователь не найден.",
  unban: "Не удалось разблокировать.",
  unban_confirm: "Подтвердите разблокировку галочкой.",
  grant: "Не удалось выдать подписку.",
  grant_reason: "Укажите причину выдачи (минимум 3 символа).",
  grant_forbidden: "Нет прав на эту выдачу или данные некорректны.",
  grant_missing: "Пользователь не найден.",
  owner_grant: "Только OWNER может выдавать OWNER_GRANT.",
  indefinite: "Бессрочная выдача: только OWNER и с галочкой подтверждения.",
  plan: "Некорректный тариф.",
  starts: "Некорректная дата начала.",
  revoke: "Не удалось отозвать подписку.",
  extend: "Не удалось продлить (нет активной платной/ручной подписки).",
  confirm: "Подтвердите отзыв галочкой.",
  badge: "Не удалось обновить значок.",
};

export function adminSavedMessage(code: string | undefined, plan?: string | null): string | null {
  if (!code) return null;
  if (code === "grant" && plan) {
    return `Подписка ${plan.toUpperCase()} выдана. Тариф обновлён на сервере.`;
  }
  return SAVED[code] ?? `Готово: ${code}`;
}

export function adminErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return ERRORS[code] ?? `Ошибка: ${code}`;
}
