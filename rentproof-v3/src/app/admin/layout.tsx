import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
      <aside className="h-fit rounded-[1.6rem] bg-[#112b31] p-4 text-white shadow-card lg:sticky lg:top-24"><p className="px-3 py-3 text-[10px] font-black tracking-[.17em] text-teal-300 uppercase">RentProof Control</p><nav className="grid gap-1" aria-label="Навигация админ-панели">{[{href:"/owner",label:"Обзор",icon:"▦"},{href:"/owner/listings",label:"Объявления",icon:"▤"},{href:"/owner/bookings",label:"Заявки",icon:"↙"},{href:"/owner/users",label:"Пользователи",icon:"◎"}].map((item)=><Link key={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white" href={item.href}><span className="grid size-7 place-items-center rounded-lg bg-white/10 text-xs">{item.icon}</span>{item.label}</Link>)}</nav><div className="mt-6 border-t border-white/10 px-3 pt-4"><p className="truncate text-xs font-bold text-white">{admin.name}</p><p className="mt-1 text-[10px] text-slate-400">Администратор</p><Link className="mt-4 inline-flex text-xs font-bold text-teal-300" href="/">← На сайт</Link></div></aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
