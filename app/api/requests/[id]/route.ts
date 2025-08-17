// app/api/requests/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { FundingRequest } from "@/models/FundingRequest";

export async function GET(_req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = context?.params?.id as string | undefined;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await connectDB();
    const doc = await FundingRequest.findById(id).lean();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(doc.userId) !== String(me.sub)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ request: { id: String(doc._id), ...doc } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
