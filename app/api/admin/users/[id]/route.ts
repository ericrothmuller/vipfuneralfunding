// app/api/admin/users/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { User } from "@/models/User";

export async function PATCH(req: Request, context: any) {
  try {
    const me = await getUserFromCookie();
    if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const id = context?.params?.id as string | undefined;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const update: any = {};

    if (body.role && ["ADMIN", "FH_CEM", "NEW"].includes(body.role)) {
      update.role = body.role;
    }
    if (typeof body.active === "boolean") {
      update.active = body.active;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await connectDB();
    const updated = await User.findByIdAndUpdate(id, update, {
      new: true,
      select: "email role active createdAt updatedAt",
    }).lean();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      user: {
        id: String(updated._id),
        email: updated.email,
        role: updated.role,
        active: !!updated.active,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
