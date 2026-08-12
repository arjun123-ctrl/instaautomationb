const state = globalThis.__instagramAutomationState || {
  comments: new Map(),
  messages: new Map(),
  contacts: new Map(),
  events: new Map(),
};

if (process.env.NODE_ENV !== "production") {
  globalThis.__instagramAutomationState = state;
}

export function claimEvent(key, type) {
  if (state.events.has(key)) return false;
  state.events.set(key, { type, status: "processing", error: null });
  return true;
}

export function finishEvent(key, status, error = null) {
  const event = state.events.get(key) || {};
  state.events.set(key, { ...event, status, error: error ? String(error) : null });
}

export function saveComment(comment) {
  state.comments.set(comment.comment_id, {
    ...state.comments.get(comment.comment_id),
    ...comment,
    created_at: state.comments.get(comment.comment_id)?.created_at || new Date(),
    updated_at: new Date(),
  });
}

export function updateComment(commentId, changes) {
  const current = state.comments.get(commentId);
  if (current) state.comments.set(commentId, { ...current, ...changes, updated_at: new Date() });
}

export function saveMessage(message) {
  if (state.messages.has(message.message_id)) return;
  state.messages.set(message.message_id, { ...message, created_at: new Date() });
}

export function saveContact(instagramUserId, changes = {}) {
  const current = state.contacts.get(instagramUserId) || {
    instagram_user_id: instagramUserId,
    created_at: new Date(),
  };
  state.contacts.set(instagramUserId, { ...current, ...changes, updated_at: new Date() });
}

export function getContact(instagramUserId) {
  return state.contacts.get(instagramUserId);
}

export function getActivity() {
  const comments = [...state.comments.values()]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 300);
  const messages = [...state.messages.values()]
    .map((message) => {
      const contact = state.contacts.get(message.instagram_user_id);
      return { ...message, username: contact?.username, phone_number: contact?.phone_number };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 500);
  return { comments, messages };
}
