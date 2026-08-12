"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, RefreshCw, Send, Smartphone } from "lucide-react";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

export default function Home() {
  const [data, setData] = useState({ comments: [], messages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Instagram activity");
    } finally {
      setLoading(false);
    }
  }

  // Initial client-side synchronization with the activity endpoint.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const conversations = useMemo(() => {
    const grouped = new Map();
    const usernames = new Map(
      data.comments
        .filter((comment) => comment.instagram_user_id && comment.username)
        .map((comment) => [comment.instagram_user_id, comment.username]),
    );

    for (const message of [...data.messages].reverse()) {
      const id = message.instagram_user_id;
      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          username: message.username || usernames.get(id),
          phone: message.phone_number,
          messages: [],
        });
      }
      const conversation = grouped.get(id);
      conversation.username ||= message.username || usernames.get(id);
      conversation.phone ||= message.phone_number;
      conversation.messages.push(message);
    }
    return [...grouped.values()].reverse();
  }, [data]);

  const activeId = selectedId || conversations[0]?.id;
  const selected = conversations.find((conversation) => conversation.id === activeId);
  const phones = conversations.filter((conversation) => conversation.phone).length;

  return <main className="min-h-screen bg-slate-50 text-slate-900"><div className="mx-auto max-w-7xl p-6">
    <div className="mb-6 flex items-center justify-between gap-4"><div><p className="font-semibold text-orange-600">Instagram automation</p><h1 className="text-3xl font-bold">Instagram inbox</h1></div><button onClick={load} disabled={loading} className="flex gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/>Refresh</button></div>
    {error && <p className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <div className="mb-7 grid gap-4 sm:grid-cols-3">{[[MessageCircle, "Conversations", conversations.length], [Send, "Messages", data.messages.length], [Smartphone, "Numbers collected", phones]].map(([Icon, label, number]) => <div key={label} className="rounded-2xl border bg-white p-5"><Icon className="text-orange-500"/><p className="mt-3 text-slate-500">{label}</p><p className="text-3xl font-bold">{number}</p></div>)}</div>

    <section className="grid min-h-[560px] overflow-hidden rounded-2xl border bg-white md:grid-cols-[320px_1fr]">
      <aside className="border-b md:border-b-0 md:border-r"><h2 className="border-b p-5 text-xl font-bold">Chats</h2><div className="max-h-[500px] overflow-auto">{conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`w-full border-b p-4 text-left transition ${activeId === conversation.id ? "bg-orange-50" : "hover:bg-slate-50"}`}><p className="font-bold">@{conversation.username || "Instagram user"}</p><p className="mt-1 truncate text-sm text-slate-500">{conversation.messages.at(-1)?.message_text || "[Media]"}</p></button>)}{!loading && !conversations.length && <p className="p-6 text-sm text-slate-500">No conversations yet.</p>}</div></aside>

      <div className="flex min-h-[560px] flex-col">{selected ? <><header className="border-b p-5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-pink-600 font-bold text-white">{(selected.username || "I")[0].toUpperCase()}</div><div><h2 className="font-bold">@{selected.username || "Instagram user"}</h2>{selected.phone && <p className="text-sm text-emerald-600">{selected.phone}</p>}</div></div></header><div className="flex-1 space-y-3 overflow-auto bg-slate-50 p-5">{selected.messages.map((message) => <div key={message.message_id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-2xl px-4 py-3 ${message.direction === "outbound" ? "bg-orange-500 text-white" : "border bg-white"}`}><p>{message.message_text || "[Media]"}</p><small className={message.direction === "outbound" ? "text-orange-100" : "text-slate-400"}>{formatDate(message.sent_at || message.created_at)}</small></div></div>)}</div></> : <div className="grid flex-1 place-items-center text-slate-500">Select a chat from the left</div>}</div>
    </section>
  </div></main>;
}
