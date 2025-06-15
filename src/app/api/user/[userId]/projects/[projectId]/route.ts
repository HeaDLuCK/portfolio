import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";

export async function GET() {
    const db = await dbConnect();
    // save project to database
    return NextResponse.json([
        { id: 1, title: "Portfolio" },
    ]);
}