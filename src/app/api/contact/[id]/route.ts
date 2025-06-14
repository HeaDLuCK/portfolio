import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";

export async function GET() {
  const db = await dbConnect();
  // save project to database
  return NextResponse.json({ message: "Project created" }, { status: 201 });
}
export async function POST(req: Request) {
  const db = await dbConnect();
  const body = await req.json();
  // save project to database
  return NextResponse.json({ message: "Project created", body }, { status: 201 });
}