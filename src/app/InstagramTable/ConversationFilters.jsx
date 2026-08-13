"use client";

import Link from "next/link";
import { CalendarDays, Filter, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ConversationFilters({ initialFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const firstRender = useRef(true);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value.trim()) params.set(key, value.trim());
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 350);

    return () => clearTimeout(timeout);
  }, [filters, pathname, router]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="mb-6 rounded-3xl border border-white/70 bg-white/45 p-5 shadow-xl shadow-indigo-100/50 backdrop-blur-2xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
        <Filter className="h-4 w-4 text-pink-600" /> Filter conversations
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Instagram username</span><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="username" value={filters.username} onChange={updateFilter} placeholder="e.g. arjunxrajput_exe" className="w-full rounded-xl border border-white/80 bg-white/65 py-3 pl-10 pr-3 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/70" /></div></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Contact number</span><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="phone" value={filters.phone} onChange={updateFilter} inputMode="tel" placeholder="e.g. 7354436777" className="w-full rounded-xl border border-white/80 bg-white/65 py-3 pl-10 pr-3 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/70" /></div></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">From date</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" name="from" value={filters.from} onChange={updateFilter} className="w-full rounded-xl border border-white/80 bg-white/65 py-3 pl-10 pr-3 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/70" /></div></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">To date</span><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" name="to" value={filters.to} onChange={updateFilter} className="w-full rounded-xl border border-white/80 bg-white/65 py-3 pl-10 pr-3 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/70" /></div></label>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Link href="/InstagramTable" onClick={() => setFilters({ username: "", phone: "", from: "", to: "" })} className="rounded-xl border border-white/80 bg-white/60 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-white">Clear all</Link>
        <span className="text-xs text-slate-500">Filters update automatically</span>
      </div>
    </div>
  );
}
