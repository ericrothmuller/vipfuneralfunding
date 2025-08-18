// app/api/admin/users/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    const me = await getUserFromCookie();
    if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();

    const url = new URL(req.url);
    const role = url.searchParams.get("role"); // ADMIN | FH_CEM | NEW or null
    const q: any = {};
    if (role && ["ADMIN", "FH_CEM", "NEW"].includes(role)) q.role = role;

    const users = await User.find(q)
      .select("email role active createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const data = users.map((u: any) => ({
      id: String(u._id),
      email: u.email,
      role: u.role,
      active: !!u.active,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
