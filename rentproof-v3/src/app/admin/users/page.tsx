import { allUsers } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await allUsers();
  return <div><p className="eyebrow">Аккаунты</p><h1 className="section-title">Пользователи</h1><p className="mt-2 text-sm text-slate-500">Персональные данные доступны только администратору. Пароли никогда не отображаются.</p><div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-card"><div className="hidden grid-cols-[1.3fr_1.4fr_.8fr_1fr] gap-4 bg-slate-50 px-5 py-3 text-[10px] font-black tracking-[.12em] text-slate-400 uppercase sm:grid"><span>Имя</span><span>Email</span><span>Тип</span><span>Создан</span></div>{users.length ? users.map((user)=><div key={user.id} className="grid gap-1 border-t border-slate-100 px-5 py-4 text-sm sm:grid-cols-[1.3fr_1.4fr_.8fr_1fr] sm:items-center sm:gap-4"><span className="font-extrabold text-slate-900">{user.name}</span><span className="text-slate-600">{user.email}</span><span className="text-xs font-bold text-teal-800">{user.role === "admin" ? "Администратор" : user.role === "owner" ? "Арендодатель" : "Арендатор"}</span><time className="text-xs text-slate-400" dateTime={user.created_at}>{new Date(user.created_at).toLocaleDateString("ru-RU")}</time></div>) : <p className="p-6 text-sm text-slate-500">Пользователей пока нет.</p>}</div></div>;
}
