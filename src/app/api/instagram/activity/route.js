import { NextResponse } from "next/server";
import { getActivity } from "@/app/api/lib/instagramStore";
import { syncInstagramInbox } from "@/app/api/lib/instagramSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let syncWarning = null;
    if (process.env.IG_ENABLE_INBOX_SYNC === "true") {
      try {
        await syncInstagramInbox();
      } catch (error) {
        syncWarning = error instanceof Error ? error.message : "Instagram inbox sync failed";
        console.error("[Instagram sync] Existing local inbox retained", error);
      }
    }
    return NextResponse.json({ ...getActivity(), syncWarning });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load activity." }, { status: 500 });
  }
}
