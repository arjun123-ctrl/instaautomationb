import { replaceInstagramInbox } from "@/app/api/lib/instagramStore";

const VERSION = process.env.IG_API_VERSION || "v25.0";
const BASE = `https://graph.instagram.com/${VERSION}`;

async function graphGet(url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Instagram API ${response.status}`);
  return body;
}

async function getAllPages(url, field = "data") {
  const items = [];
  let next = url;
  while (next) {
    const body = await graphGet(next);
    items.push(...(body?.[field]?.data || body?.[field] || body?.data || []));
    next = body?.[field]?.paging?.next || body?.paging?.next || null;
    if (next && !next.startsWith("https://graph.instagram.com/")) throw new Error("Invalid Instagram paging URL");
  }
  return items;
}

export async function syncInstagramInbox() {
  if (!process.env.IG_ACCESS_TOKEN) throw new Error("IG_ACCESS_TOKEN is missing");
  const me = await graphGet(`${BASE}/me?fields=id,username`);
  const accountId = String(me.id);
  const conversationUrl = `${BASE}/${encodeURIComponent(accountId)}/conversations?platform=instagram&fields=id,participants&limit=100`;
  const conversations = await getAllPages(conversationUrl);
  const contacts = [];
  const messages = [];

  for (const conversation of conversations) {
    const participants = conversation?.participants?.data || [];
    const other = participants.find((participant) => String(participant.id) !== String(accountId));
    const detailUrl = `${BASE}/${encodeURIComponent(conversation.id)}?fields=messages.limit(100){id,message,from,to,created_time}`;
    const conversationMessages = await getAllPages(detailUrl, "messages");
    const participantId = String(other?.id || conversationMessages
      .flatMap((message) => [message.from, ...(message.to?.data || message.to || [])])
      .find((participant) => participant?.id && String(participant.id) !== String(accountId))?.id || "");
    if (!participantId) continue;

    contacts.push({ instagram_user_id: participantId, username: other?.username || other?.name });
    for (const message of conversationMessages) {
      const senderId = String(message?.from?.id || "");
      messages.push({
        message_id: String(message.id),
        instagram_user_id: participantId,
        direction: senderId === String(accountId) ? "outbound" : "inbound",
        message_text: message.message || "",
        sent_status: "sent",
        sent_at: message.created_time ? new Date(message.created_time) : new Date(),
        created_at: message.created_time ? new Date(message.created_time) : new Date(),
      });
    }
  }

  replaceInstagramInbox({ contacts, messages });
  return { conversations: conversations.length, messages: messages.length };
}
