import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { getInstagramConversations } from "@/app/api/lib/instagramConversation";
import ConversationFilters from "./ConversationFilters";

export const dynamic = "force-dynamic";

function one(value) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function formatDateTime(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" && !value.includes("T")
    ? `${value.replace(" ", "T")}+05:30`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(date);
}

function pageHref(filters, page) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  params.set("page", String(page));
  return `/InstagramTable?${params.toString()}`;
}

export default async function InstagramTablePage({ searchParams }) {
  const query = await searchParams;
  const filters = {
    username: one(query.username).trim(),
    phone: one(query.phone).trim(),
    from: one(query.from),
    to: one(query.to),
  };
  const requestedPage = Math.max(1, Number(one(query.page)) || 1);
  let result = { rows: [], total: 0, page: 1, totalPages: 1 };
  let error = null;

  try {
    const data = await getInstagramConversations({ ...filters, page: requestedPage });
    result = Array.isArray(data)
      ? {
          rows: data,
          total: data.length,
          page: 1,
          totalPages: 1,
        }
      : data;
  } catch (databaseError) {
    console.error("Unable to load Instagram conversations", databaseError);
    error = "Instagram conversation data could not be loaded.";
  }

  const conversations = Array.isArray(result?.rows) ? result.rows : [];
  const total = Number(result?.total) || 0;
  const currentPage = Math.max(1, Number(result?.page) || 1);
  const totalPages = Math.max(1, Number(result?.totalPages) || 1);

  const firstRow = total ? (currentPage - 1) * 50 + 1 : 0;
  const lastRow = Math.min(currentPage * 50, total);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#fff7fb] via-[#eef6ff] to-[#f5f0ff] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-pink-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-64 h-96 w-96 rounded-full bg-indigo-300/35 blur-3xl" />
      <section className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-pink-600">Instagram leads</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Customer conversations</h1>
            <p className="mt-2 text-slate-600">Search, filter and review your Instagram customer leads.</p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/70 bg-white/45 px-5 py-3 shadow-lg shadow-indigo-100/50 backdrop-blur-xl">
            <Users className="h-5 w-5 text-pink-600" />
            <div><p className="text-xs text-slate-500">Filtered leads</p><p className="font-bold">{total.toLocaleString("en-IN")}</p></div>
          </div>
        </div>

        <ConversationFilters initialFilters={filters} />

        <div className="overflow-hidden rounded-3xl border border-white/75 bg-white/45 shadow-2xl shadow-indigo-100/60 backdrop-blur-2xl">
          {error ? <p className="p-8 text-center text-red-600">{error}</p> : conversations.length === 0 ? <p className="p-14 text-center text-slate-500">No conversations match these filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left"><thead className="border-b border-white/60 bg-white/35 text-xs uppercase tracking-wider text-slate-600"><tr><th className="px-6 py-5">ID</th><th className="px-6 py-5">Phone number</th><th className="px-6 py-5">Customer name</th><th className="px-6 py-5">Conversation started</th><th className="px-6 py-5">Number shared</th></tr></thead><tbody className="divide-y divide-white/70">{conversations.map((conversation) => <tr key={conversation.id} className="transition hover:bg-white/45"><td className="px-6 py-5 text-sm text-slate-500">{conversation.id}</td><td className="whitespace-nowrap px-6 py-5 font-semibold">{conversation.phone_number || "Pending"}</td><td className="whitespace-nowrap px-6 py-5 font-medium">{conversation.username ? `@${conversation.username}` : "Instagram user"}</td><td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">{formatDateTime(conversation.start_conversation_date)}</td><td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">{formatDateTime(conversation.number_issue_date)}</td></tr>)}</tbody></table></div>}
          {!error && <div className="flex flex-col gap-4 border-t border-white/70 bg-white/25 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Showing <strong>{firstRow}–{lastRow}</strong> of <strong>{total}</strong> · 50 rows per page</p><div className="flex items-center gap-2"><Link aria-disabled={currentPage === 1} href={pageHref(filters, Math.max(1, currentPage - 1))} className={`flex items-center gap-1 rounded-xl border border-white/80 bg-white/55 px-3 py-2 text-sm font-semibold ${currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-white"}`}><ChevronLeft className="h-4 w-4" /> Previous</Link><span className="rounded-xl bg-slate-900/85 px-4 py-2 text-sm font-bold text-white">{currentPage} / {totalPages}</span><Link aria-disabled={currentPage === totalPages} href={pageHref(filters, Math.min(totalPages, currentPage + 1))} className={`flex items-center gap-1 rounded-xl border border-white/80 bg-white/55 px-3 py-2 text-sm font-semibold ${currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-white"}`}>Next <ChevronRight className="h-4 w-4" /></Link></div></div>}
        </div>
      </section>
    </main>
  );
}
