import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
     return NextResponse.json({ message: "POST request receive22d" }, { status: 201 });
}