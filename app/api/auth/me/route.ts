import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = getSession();

  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: session.userId,
      email: session.email,
      isAdmin: session.isAdmin,
      isApproved: session.isApproved,
    },
  });
}
