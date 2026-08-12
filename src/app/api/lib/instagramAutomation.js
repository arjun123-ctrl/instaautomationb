import crypto from "crypto";
import {
  claimEvent,
  finishEvent,
  getContact,
  saveComment,
  saveContact,
  saveMessage,
  updateComment,
} from "@/app/api/lib/instagramStore";

const VERSION = process.env.IG_API_VERSION || "v25.0";
const BASE = `https://graph.instagram.com/${VERSION}`;
let schemaPromise;
let profilePromise;

export function ensureInstagramSchema() {
  if (!schemaPromise) schemaPromise = Promise.resolve();
  return schemaPromise;
}

export function verifyMetaSignature(raw, signature) {
  const secret = process.env.IG_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function profile() {
  if (!profilePromise) profilePromise = fetch(`${BASE}/me?fields=id,username`, {
    headers: { Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` }, cache: "no-store",
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) throw new Error(data?.error?.message || "Instagram profile unavailable");
    return { id: String(data.id), username: String(data.username || "").toLowerCase() };
  }).catch((error) => { profilePromise = null; throw error; });
  return profilePromise;
}

async function graphPost(path, payload) {
  const response = await fetch(`${BASE}/${path}`, {
    method: "POST", headers: { Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload), cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  console.info("[Instagram API] Response", { path, status: response.status, ok: response.ok, error: data?.error?.message || null });
  if (!response.ok) throw new Error(data?.error?.message || `Instagram API ${response.status}`);
  return data;
}

async function claim(key, type) {
  return claimEvent(key, type);
}
async function finish(key, status, error = null) {
  finishEvent(key, status, error ? String(error).slice(0, 2000) : null);
}
function timeMs(value) {
  const n = Number(value); if (Number.isFinite(n)) return n < 1e10 ? n * 1000 : n;
  const parsed = new Date(value).getTime(); return Number.isFinite(parsed) ? parsed : Date.now();
}
function phoneFrom(text) {
  for (const match of String(text).match(/(?:\+?91[\s-]?)?0?[6-9]\d(?:[\s-]?\d){8}/g) || []) {
    let digits = match.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  }
  return null;
}
function language(text) {
  const value = String(text).toLowerCase();
  if (/[\u0900-\u097f]/.test(value)) return "hi";
  if (/\b(hai|main|me|mera|meri|mujhe|aap|apna|kya|kab|tak|chahiye|karo|karna|thik|theek)\b/.test(value)) return "hinglish";
  return "en";
}
function shouldStopReplying(text, hasPhone) {
  const value = String(text).trim().toLowerCase().replace(/[.!?,]+/g, " ").replace(/\s+/g, " ");
  const explicitlyStopped = /\b(don'?t|do not|dont|stop|band)\s+(msg|message|text|reply|karna|karo|kijiye|bhejna|bhejo)\b/.test(value)
    || /\b(msg|message|text|reply)\s+(mat|nahi|nahin)\b/.test(value);
  if (explicitlyStopped) return true;
  if (!hasPhone) return false;
  return /^(ok+|oh+k+|okay|k|hm+|hmm+|yes|done|fine|alright|thik|thik hai|theek|theek hai|acha|achha|accha|thanks|thank you|dhanyavad|dhanyawad)$/.test(value);
}
function replyFor(text, hasPhone, justFound) {
  if (shouldStopReplying(text, hasPhone)) return null;
  const lang = language(text);
  if (!hasPhone) return lang === "hi" ? "कृपया अपना 10 अंकों का संपर्क नंबर साझा करें।" : lang === "hinglish" ? "Please apna 10-digit contact number share kar dijiye." : "Please share your 10-digit contact number.";
  if (justFound) return lang === "hi" ? "धन्यवाद! आपका नंबर मिल गया है। हमारी टीम जल्द आपसे संपर्क करेगी।" : lang === "hinglish" ? "Thank you! Aapka number mil gaya hai. Hamari team jaldi connect karegi." : "Thank you! We received your number. Our team will contact you shortly.";
  if (/^(ok+|okay|ohk|thik hai|theek hai|ठीक है|thanks|thank you)[.!\s]*$/i.test(String(text).trim())) return lang === "hi" ? "धन्यवाद! हमारी टीम जल्द आपसे संपर्क करेगी।" : lang === "hinglish" ? "Thank you! Hamari team jaldi connect karegi." : "Thank you for your patience. Our team will be in touch shortly.";
  return lang === "hi" ? "आपकी जानकारी टीम के पास है। वे जल्द आपसे संपर्क करेंगे।" : lang === "hinglish" ? "Aapki details team ke paas hain. Woh jaldi connect karenge." : "Your details are with our team. They will contact you shortly.";
}

export async function handleComment(value) {
  const id = String(value?.id || value?.comment_id || "");
  const senderId = String(value?.from?.id || value?.user_id || "");
  const username = value?.from?.username || value?.username || "";
  const parentId = String(value?.parent_id || value?.parent?.id || "");
  if (!id || parentId) return console.info("[Instagram] Comment ignored", { id, parentId });
  const own = await profile();
  if ([own.id, String(process.env.IG_USER_ID || ""), String(process.env.IG_WEBHOOK_ACCOUNT_ID || "")].includes(senderId) || username.toLowerCase() === own.username) return console.info("[Instagram] Own comment ignored", { id });
  if (!(await claim(`comment:${id}`, "comment"))) return console.info("[Instagram] Duplicate comment ignored", { id });
  if (senderId && username) saveContact(senderId, { username });
  console.info("[Instagram] Processing comment", { id, senderId, username, text: value?.text || "" });
  const publicReply = process.env.IG_COMMENT_REPLY || "Kindly check DM";
  const privateReply = process.env.IG_CONTACT_REQUEST || "Please share your contact number.";
  try {
    saveComment({ comment_id:id, media_id:value?.media?.id || value?.media_id || null, instagram_user_id:senderId || null, username:username || null, comment_text:value?.text || "", public_reply:publicReply, private_reply:privateReply, public_reply_status:"pending", private_reply_status:"pending", commented_at:new Date(timeMs(value?.created_time)) });
    await graphPost(`${encodeURIComponent(id)}/replies`, { message: publicReply });
    updateComment(id, { public_reply_status: "sent" });
    await graphPost(`${encodeURIComponent(own.id)}/messages`, { recipient: { comment_id: id }, message: { text: privateReply } });
    updateComment(id, { private_reply_status: "sent" });
    if (senderId) saveMessage({ message_id:`private:${id}`, instagram_user_id:senderId, direction:"outbound", message_text:privateReply, related_event_id:id, sent_status:"sent", sent_at:new Date() });
    await finish(`comment:${id}`, "complete");
    console.info("[Instagram] Comment complete", { id });
  } catch (error) { await finish(`comment:${id}`, "failed", error); console.error("[Instagram] Comment failed",{id,error:String(error)}); throw error; }
}

export async function handleMessage(event) {
  const message = event?.message; const mid = String(message?.mid || ""); const sender = String(event?.sender?.id || "");
  if (!mid || !sender || message?.is_echo || sender === String(process.env.IG_WEBHOOK_ACCOUNT_ID || "")) return;
  if (!(await claim(`message:${mid}`, "message"))) return console.info("[Instagram] Duplicate message ignored", { mid });
  const text = message?.text || "";
  console.info("[Instagram] Processing inbound message", { mid, sender, text });
  try {
    saveContact(sender);
    saveMessage({ message_id:mid, instagram_user_id:sender, direction:"inbound", message_text:text, sent_status:"received", sent_at:new Date(timeMs(event?.timestamp)) });
    if (!text.trim()) { await finish(`message:${mid}`, "complete"); return console.info("[Instagram] Non-text companion ignored", { mid }); }
    const contact = getContact(sender);
    const found = phoneFrom(text); const existing = Boolean(contact?.phone_number);
    if (found && !existing) saveContact(sender, { phone_number:found, phone_collected_at:new Date() });
    const reply = replyFor(text, existing || Boolean(found), Boolean(found && !existing));
    if (!reply) {
      await finish(`message:${mid}`, "complete");
      return console.info("[Instagram] Conversation acknowledged; automatic reply skipped", { mid, sender });
    }
    const own = await profile();
    const result = await graphPost(`${encodeURIComponent(own.id)}/messages`, { recipient: { id: sender }, message: { text: reply } });
    saveMessage({ message_id:String(result?.message_id || `reply:${mid}`), instagram_user_id:sender, direction:"outbound", message_text:reply, related_event_id:mid, sent_status:"sent", sent_at:new Date() });
    await finish(`message:${mid}`, "complete");
  } catch (error) { await finish(`message:${mid}`, "failed", error); throw error; }
}
