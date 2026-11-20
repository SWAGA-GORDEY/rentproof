import { Suspense } from "react";
import { connection } from "next/server";
import { blockUserAction } from "@/app/actions/admin";
import { listUsers } from "@/lib/admin";
import { secondaryButton } from "@/components/styles";

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем пользователей…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await connection();
  const users = listUsers();
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Пользователи</h1>
      <p className="text-sm text-muted">Публичной регистрации администратора нет. Блокировка снимает сессии.</p>
      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-muted">
            <tr><th className="p-4">Имя</th><th>Почта</th><th>Роль</th><th>Тариф</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="p-4">{user.name}{user.isAdmin ? " · админ" : ""}{user.blockedAt ? " · блокировка" : ""}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.plan}</td>
                <td className="p-4">
                  {user.isAdmin ? null : (
                    <form action={blockUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="blocked" value={user.blockedAt ? "0" : "1"} />
                      <button className={secondaryButton} type="submit">{user.blockedAt ? "Разблокировать" : "Заблокировать"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
