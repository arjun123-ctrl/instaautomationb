import { NextResponse } from "next/server"; import { getActivity } from "@/app/api/lib/instagramStore";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){ try{return NextResponse.json(getActivity());}catch(error){console.error(error);return NextResponse.json({error:"Could not load activity."},{status:500});}}
