"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, MessageCircle, RefreshCw, Search, Send, Smartphone, Sparkles } from "lucide-react";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export default function Home() {
  const [data, setData] = useState({ comments: [], messages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/instagram/activity", { cache: "no-store" });
      const isJson = (response.headers.get("content-type") || "").includes("application/json");
      const body = isJson ? await response.json() : null;
      if (!response.ok) throw new Error(body?.error || `Activity API failed (${response.status})`);
      if (!body) throw new Error("Activity API returned an unexpected response.");
      setData(body);
      if (body.syncWarning) setError(`Instagram sync failed: ${body.syncWarning}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Instagram activity");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const conversations = useMemo(() => {
    const grouped = new Map();
    const usernames = new Map(data.comments.filter((comment) => comment.instagram_user_id && comment.username).map((comment) => [comment.instagram_user_id, comment.username]));
    for (const message of [...data.messages].reverse()) {
      const id = message.instagram_user_id;
      if (!grouped.has(id)) grouped.set(id, { id, username: message.username || usernames.get(id), phone: message.phone_number, messages: [] });
      const conversation = grouped.get(id);
      conversation.username ||= message.username || usernames.get(id);
      conversation.phone ||= message.phone_number;
      conversation.messages.push(message);
    }
    return [...grouped.values()].reverse();
  }, [data]);

  const visibleConversations = conversations.filter((conversation) => `${conversation.username || ""} ${conversation.phone || ""}`.toLowerCase().includes(search.toLowerCase()));
  const activeId = selectedId || conversations[0]?.id;
  const selected = conversations.find((conversation) => conversation.id === activeId);
  const phones = conversations.filter((conversation) => conversation.phone).length;
  const stats = [[MessageCircle, "Conversations", conversations.length, "from-orange-400 to-pink-500"], [Send, "Messages", data.messages.length, "from-violet-500 to-indigo-500"], [Smartphone, "Numbers collected", phones, "from-cyan-400 to-blue-500"]];

  return (
    <main className="inbox-canvas relative min-h-screen overflow-hidden px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-9">
      <div className="orb orb-one" /><div className="orb orb-two" /><div className="orb orb-three" />
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div><div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[.2em] text-fuchsia-600"><Sparkles size={16} /> Instagram automation</div><h1 className="text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl">Instagram inbox</h1><p className="mt-2 text-slate-600">Every lead and conversation, in one beautiful place.</p></div>
          <button onClick={load} disabled={loading} className="glass-button flex w-fit items-center gap-2 rounded-2xl px-5 py-3.5 font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60"><RefreshCw size={19} className={loading ? "animate-spin" : ""} />{loading ? "Syncing..." : "Refresh"}</button>
        </header>

        {error && <p className="glass-panel mb-5 rounded-2xl border-red-200/70 p-4 text-red-700">{error}</p>}

        <section className="mb-7 grid gap-4 sm:grid-cols-3">
          {stats.map(([Icon, label, number, gradient]) => <article key={label} className="glass-panel stat-card group rounded-[26px] p-5 sm:p-6"><div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition group-hover:scale-105`}><Icon size={22} /></div><div className="mt-5 flex items-end justify-between"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-4xl font-black tracking-tight text-slate-950">{number}</p></div><span className="mb-1 rounded-full bg-emerald-100/70 px-2.5 py-1 text-[11px] font-bold text-emerald-700">LIVE</span></div></article>)}
        </section>

        <section className="glass-panel inbox-shell grid min-h-[590px] overflow-hidden rounded-[30px] lg:grid-cols-[360px_1fr]">
          <aside className="border-b border-white/50 bg-white/20 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/50 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Chats</h2><span className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-bold text-slate-600">{conversations.length}</span></div><label className="relative block"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="glass-input w-full rounded-2xl py-3 pl-11 pr-4 text-sm outline-none" /></label></div>
            <div className="max-h-[510px] overflow-auto p-2">
              {visibleConversations.map((conversation) => { const last = conversation.messages.at(-1); return <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`chat-row mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${activeId === conversation.id ? "active" : ""}`}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 font-black text-white shadow-md">{(conversation.username || "I")[0].toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-bold">@{conversation.username || "Instagram user"}</p><span className="text-[10px] text-slate-400">{last ? formatDate(last.sent_at || last.created_at).split(",").at(-1) : ""}</span></div><p className="mt-0.5 truncate text-sm text-slate-500">{last?.message_text || "[Media]"}</p></div></button>; })}
              {!loading && !visibleConversations.length && <div className="grid place-items-center px-6 py-14 text-center"><MessageCircle className="mb-3 text-slate-300" size={34} /><p className="text-sm text-slate-500">{search ? "No matching conversations." : "No conversations yet."}</p></div>}
            </div>
          </aside>

          <div className="flex min-h-[590px] flex-col bg-white/10">{selected ? <><header className="flex items-center justify-between border-b border-white/50 bg-white/20 p-5"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-violet-600 font-black text-white shadow-lg">{(selected.username || "I")[0].toUpperCase()}</div><div><h2 className="font-black">@{selected.username || "Instagram user"}</h2><p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {selected.phone || "Active conversation"}</p></div></div><span className="hidden rounded-xl bg-white/50 px-3 py-2 text-xs font-semibold text-slate-500 sm:block">Instagram DM</span></header><div className="message-area flex-1 space-y-3 overflow-auto p-5 sm:p-7">{selected.messages.map((message) => <div key={message.message_id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`message-bubble max-w-[82%] px-4 py-3 sm:max-w-[70%] ${message.direction === "outbound" ? "outbound text-white" : "inbound"}`}><p className="leading-relaxed">{message.message_text || "[Media]"}</p><small className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${message.direction === "outbound" ? "text-pink-100" : "text-slate-400"}`}>{formatDate(message.sent_at || message.created_at)}{message.direction === "outbound" && <CheckCheck size={13} />}</small></div></div>)}</div></> : <div className="grid flex-1 place-items-center p-8 text-center"><div><div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-white/40 shadow-xl shadow-indigo-200/30"><Send className="text-violet-500" size={31} /></div><h2 className="mt-5 text-xl font-black">Your conversations live here</h2><p className="mt-2 text-sm text-slate-500">Select a chat from the left to view messages.</p></div></div>}</div>
        </section>
      </div>
    </main>
  );
}
