import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import sendMail from "@/Service/mailService";
import User from "@/Model/user/User";

export async function GET() {
    await dbConnect();
    // save project to database

    
    return NextResponse.json({ message: "Project created" }, { status: 201 });
}
export async function POST(req: Request) {
    await dbConnect();
    const body = await req.json();
    
    return NextResponse.json({ message: "Project created", body }, { status: 201 });
}