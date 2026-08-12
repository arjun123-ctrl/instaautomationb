// app/api/instagram/profile/route.js
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // no caching by Next

const DEFAULT_PROFILE_FIELDS = [
  "id",
  "username",
  "name",
  "biography",
  "website",
  "profile_picture_url",
  "followers_count",
  "follows_count",
  "media_count",
].join(",");

// Media fields we can safely show with graph.instagram.com token
const DEFAULT_MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "permalink",
  "thumbnail_url",
  "timestamp",
  "like_count",
  "comments_count",
].join(",");

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // ✅ You can pass ig_user_id as query param, otherwise take from env
    const igUserId = searchParams.get("ig_user_id") || process.env.IG_USER_ID;
    const accessToken = process.env.IG_ACCESS_TOKEN;
    const apiVersion = process.env.IG_API_VERSION || "v24.0";

    if (!igUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing ig_user_id. Provide ?ig_user_id=... or set IG_USER_ID in env.",
        },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Missing IG_ACCESS_TOKEN in env." },
        { status: 500 }
      );
    }

    // Optional query controls
    const fields = searchParams.get("fields") || DEFAULT_PROFILE_FIELDS;

    // include_media=true => recent media list bhi aayegi
    const includeMedia =
      (searchParams.get("include_media") || "").toLowerCase() === "true" ||
      searchParams.get("include_media") === "1";

    const mediaLimit = Math.max(
      1,
      Math.min(Number(searchParams.get("media_limit") || 12), 50)
    );
    const mediaFields = searchParams.get("media_fields") || DEFAULT_MEDIA_FIELDS;

    // 1) Fetch profile
    const profileUrl =
      `https://graph.instagram.com/${apiVersion}/${encodeURIComponent(igUserId)}` +
      `?fields=${encodeURIComponent(fields)}` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    const profileResp = await fetch(profileUrl, { cache: "no-store" });
    const profileData = await profileResp.json();

    if (!profileResp.ok) {
      return NextResponse.json(
        { success: false, message: "Instagram API error (profile)", error: profileData },
        { status: profileResp.status }
      );
    }

    // 2) Fetch media list (optional)
    let media = [];
    if (includeMedia) {
      const mediaUrl =
        `https://graph.instagram.com/${apiVersion}/${encodeURIComponent(igUserId)}/media` +
        `?fields=${encodeURIComponent(mediaFields)}` +
        `&limit=${encodeURIComponent(String(mediaLimit))}` +
        `&access_token=${encodeURIComponent(accessToken)}`;

      const mediaResp = await fetch(mediaUrl, { cache: "no-store" });
      const mediaJson = await mediaResp.json();

      if (mediaResp.ok) {
        media = Array.isArray(mediaJson?.data) ? mediaJson.data : [];
      } else {
        // media fail ho jaye to profile still return karo (no breaking)
        media = [];
      }
    }

    // Help text: “iss API se kya-kya show ho sakta hai”
    const canShow = {
      profile: [
        "id",
        "username",
        "name",
        "biography",
        "website",
        "profile_picture_url",
        "followers_count",
        "follows_count",
        "media_count",
      ],
      media: includeMedia
        ? [
            "caption",
            "media_type",
            "media_url",
            "thumbnail_url",
            "permalink",
            "timestamp",
            "like_count",
            "comments_count",
          ]
        : [],
      notes: [
        "Followers list (names/IDs) generally API se nahi milti — only followers_count.",
        "Messaging/Comments management + webhooks live/published & advanced access ke baad stable hota hai.",
      ],
    };

    return NextResponse.json({
      success: true,
      fetched_at: new Date().toISOString(),
      data: profileData, // ✅ existing logic compatible
      media, // ✅ new
      can_show: canShow, // ✅ new (UI me show karenge)
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Server error", error: String(err) },
      { status: 500 }
    );
  }
}
