import { NextResponse } from "next/server";
import { ensureInstagramSchema, handleComment, handleMessage, verifyMetaSignature } from "@/app/api/lib/instagramAutomation";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

function harmlessReceipt(raw) { try { const b=JSON.parse(raw); const events=(b.entry||[]).flatMap(e=>e.messaging||[]); return events.length>0 && events.every(e=>!e.message && (e.read||e.delivery)); } catch { return false; } }
export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const matches = token === process.env.IG_WEBHOOK_VERIFY_TOKEN;

  console.info("[Instagram webhook] GET verification", {
    mode,
    tokenMatches: matches,
    hasChallenge: challenge !== null,
  });

  if (mode === "subscribe" && matches && challenge !== null) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": String(Buffer.byteLength(challenge)),
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("Verification failed", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
export async function POST(request) {
  const raw=await request.text(); const signature=request.headers.get("x-hub-signature-256");
  console.info("[Instagram webhook] POST",{bytes:Buffer.byteLength(raw),hasSignature:Boolean(signature)});
  if(!verifyMetaSignature(raw,signature)){ if(harmlessReceipt(raw)) return NextResponse.json({received:true,ignored:"receipt"}); return NextResponse.json({error:"Invalid signature"},{status:401}); }
  try { await ensureInstagramSchema(); const body=JSON.parse(raw); console.info("[Instagram webhook] Payload accepted",{object:body.object,entries:body.entry?.length||0,fields:(body.entry||[]).flatMap(e=>(e.changes||[]).map(c=>c.field)),messagingEvents:(body.entry||[]).reduce((n,e)=>n+(e.messaging?.length||0),0)}); const jobs=[]; for(const entry of body.entry||[]){ for(const c of entry.changes||[]){ if(["comments","live_comments"].includes(c.field)&&c.value){console.info("[Instagram webhook] Queue comment",{field:c.field,commentId:c.value.id||c.value.comment_id,senderId:c.value.from?.id||c.value.user_id,text:c.value.text||""});jobs.push(handleComment(c.value,entry.id));} if(c.field==="messages"&&c.value){console.info("[Instagram webhook] Queue message change",{messageId:c.value.message?.mid,senderId:c.value.sender?.id});jobs.push(handleMessage(c.value));} } for(const e of entry.messaging||[]) if(e.message){console.info("[Instagram webhook] Queue message",{messageId:e.message.mid,senderId:e.sender?.id,isEcho:Boolean(e.message.is_echo),text:e.message.text||""});jobs.push(handleMessage(e));} } const results=await Promise.allSettled(jobs); const failed=results.filter(r=>r.status==="rejected"); if(failed.length) console.error("[Instagram webhook] failures",failed.map(f=>f.reason)); console.info("[Instagram webhook] Complete",{processed:jobs.length,failed:failed.length}); return NextResponse.json({received:true,processed:jobs.length,failed:failed.length}); } catch(error){ console.error("[Instagram webhook] Processing failed",error); return NextResponse.json({error:"Processing failed"},{status:500}); }
}
