import "server-only";
import db from "@/app/api/lib/mysql";

let schemaPromise;

async function ensureUsernameColumn() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const [columns] = await db.execute(
        "SHOW COLUMNS FROM instagram_conversation LIKE 'username'"
      );
      if (!columns.length) {
        await db.execute(
          "ALTER TABLE instagram_conversation ADD COLUMN username VARCHAR(100) NULL AFTER insta_id"
        );
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function fetchUsername(instaId) {
  if (!process.env.IG_ACCESS_TOKEN) return null;

  const version = process.env.IG_API_VERSION || "v25.0";
  const response = await fetch(
    `https://graph.instagram.com/${version}/${encodeURIComponent(instaId)}?fields=username,name`,
    {
      headers: { Authorization: `Bearer ${process.env.IG_ACCESS_TOKEN}` },
      cache: "no-store",
    }
  );
  if (!response.ok) return null;

  const profile = await response.json().catch(() => ({}));
  return profile.username || profile.name || null;
}

export async function recordConversationStart(
  instaId,
  startedAt = new Date(),
  username = null
) {
  if (!instaId) return;
  await ensureUsernameColumn();

  const [rows] = await db.execute(
    `SELECT id, start_conversation_date, username
       FROM instagram_conversation
      WHERE insta_id = ?
      ORDER BY id ASC
      LIMIT 1`,
    [String(instaId)]
  );

  if (rows.length) {
    if (!rows[0].start_conversation_date || (username && !rows[0].username)) {
      await db.execute(
        `UPDATE instagram_conversation
            SET start_conversation_date = COALESCE(start_conversation_date, ?),
                username = COALESCE(username, ?)
          WHERE id = ?`,
        [startedAt, username, rows[0].id]
      );
    }
    return;
  }

  await db.execute(
    `INSERT INTO instagram_conversation
      (phone_number, insta_id, username, start_conversation_date, number_issue_date)
     VALUES (?, ?, ?, ?, ?)`,
    ["", String(instaId), username, startedAt, null]
  );
}

export async function recordSharedPhone(instaId, phoneNumber, sharedAt = new Date()) {
  if (!instaId || !phoneNumber) return;
  await ensureUsernameColumn();

  const [rows] = await db.execute(
    `SELECT id
       FROM instagram_conversation
      WHERE insta_id = ?
      ORDER BY id ASC
      LIMIT 1`,
    [String(instaId)]
  );

  if (rows.length) {
    await db.execute(
      `UPDATE instagram_conversation
          SET phone_number = ?, number_issue_date = COALESCE(number_issue_date, ?)
        WHERE id = ?`,
      [phoneNumber, sharedAt, rows[0].id]
    );
    return;
  }

  await db.execute(
    `INSERT INTO instagram_conversation
      (phone_number, insta_id, username, start_conversation_date, number_issue_date)
     VALUES (?, ?, ?, ?, ?)`,
    [phoneNumber, String(instaId), null, null, sharedAt]
  );
}

export async function getInstagramConversations({
  username = "",
  phone = "",
  from = "",
  to = "",
  page = 1,
  pageSize = 50,
} = {}) {
  await ensureUsernameColumn();
  const conditions = [];
  const values = [];

  if (username) {
    conditions.push("username LIKE ?");
    values.push(`%${username.replace(/^@/, "")}%`);
  }
  if (phone) {
    conditions.push("REPLACE(REPLACE(phone_number, ' ', ''), '-', '') LIKE ?");
    values.push(`%${phone.replace(/[\s-]/g, "")}%`);
  }
  if (from) {
    conditions.push("COALESCE(number_issue_date, start_conversation_date) >= ?");
    values.push(`${from} 00:00:00`);
  }
  if (to) {
    conditions.push("COALESCE(number_issue_date, start_conversation_date) < DATE_ADD(?, INTERVAL 1 DAY)");
    values.push(`${to} 00:00:00`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 50));
  const offset = (safePage - 1) * safePageSize;
  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM instagram_conversation ${where}`,
    values
  );
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const currentOffset = (currentPage - 1) * safePageSize;
  const [rows] = await db.execute(
    `SELECT id, phone_number, insta_id, username, start_conversation_date, number_issue_date
       FROM instagram_conversation
       ${where}
      ORDER BY COALESCE(number_issue_date, start_conversation_date) DESC, id DESC
      LIMIT ${safePageSize} OFFSET ${currentOffset}`,
    values
  );

  await Promise.all(
    rows
      .filter((row) => !row.username)
      .map(async (row) => {
        const username = await fetchUsername(row.insta_id).catch(() => null);
        if (!username) return;
        row.username = username;
        await db.execute(
          "UPDATE instagram_conversation SET username = ? WHERE id = ?",
          [username, row.id]
        );
      })
  );

  return { rows, total, page: currentPage, totalPages };
}
