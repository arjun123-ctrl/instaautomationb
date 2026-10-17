import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

const benefits = [
  "Bring customer conversations into one organised workspace.",
  "Help teams respond consistently and follow up on customer enquiries.",
  "Keep account access permission-based and under the user’s control.",
];

export const metadata = {
  title: "bharattapp | Customer communication made simpler",
  description: "bharattapp helps businesses organise customer conversations and manage connected business workflows.",
};

export default function Home() {
  return (
    <main className="brand-site min-h-screen overflow-hidden text-slate-900">
      <div className="brand-glow brand-glow-left" />
      <div className="brand-glow brand-glow-right" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between py-6 sm:py-8">
          <Link href="/" className="rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" aria-label="bharattapp home"><Image src="/unnamed.png" alt="Bharat Tapp" width={512} height={169} priority className="h-auto w-36 sm:w-44" /></Link>
          <a href="mailto:arjunbharattapp@gmail.com" className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700"><Mail size={16} /> Contact support</a>
        </header>
        <section className="grid items-center gap-12 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700"><Sparkles size={16} /> Built for growing businesses</p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl">Customer communication, kept simple.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">bharattapp is a business communication platform that helps teams organise conversations, respond thoughtfully, and stay connected with their customers.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="mailto:arjunbharattapp@gmail.com" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800">Get in touch <ArrowRight size={18} /></a><Link href="/policies/privacy-policy" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"><ShieldCheck size={18} /> Privacy first</Link></div>
          </div>
          <div className="relative"><div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-2xl shadow-orange-950/10 backdrop-blur sm:p-8"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white"><MessageCircle size={21} /></div><div><p className="font-bold text-slate-950">One clear workspace</p><p className="text-sm text-slate-500">For the conversations that matter</p></div></div><div className="space-y-4 py-6">{benefits.map((benefit) => <div key={benefit} className="flex gap-3 rounded-2xl bg-slate-50 p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={19} /><p className="text-sm leading-6 text-slate-700">{benefit}</p></div>)}</div><div className="rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-4 text-white"><p className="text-sm font-semibold text-orange-50">Support</p><a className="mt-1 block font-bold hover:underline" href="mailto:arjunbharattapp@gmail.com">arjunbharattapp@gmail.com</a></div></div></div>
        </section>
        <section className="border-t border-slate-200/80 py-9 text-sm text-slate-600 sm:flex sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} bharattapp. All rights reserved.</p><nav className="mt-4 flex gap-5 sm:mt-0" aria-label="Legal links"><Link href="/policies/privacy-policy" className="font-semibold hover:text-orange-700">Privacy Policy</Link><Link href="/policies/terms-of-service" className="font-semibold hover:text-orange-700">Terms of Service</Link></nav></section>
      </div>
    </main>
  );
}
