import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import sendMail from "@/Service/mailService";
import ContactMessage from "@/Model/ContactMessage ";
import { getTokenAndLang } from '@/lib/cookies';

export async function GET(request: Request) {
    await dbConnect();
    const {token ,lang} = getTokenAndLang(request);
    return NextResponse.json({ message: lang+"  "+token }, { status: 201 });
}
export async function POST(req: Request) {
    await dbConnect();
    const body = await req.json();
    // Validate the request body
    console.log("Received body:", body);
    if (!body.name || !body.email || !body.subject || !body.comment) {
        return NextResponse.json(
            { error: "All fields are required" },
            { status: 400 }
        );
    }
    ContactMessage.create({
        name: body.name,
        email: body.email,
        subject: body.subject,
        comment: body.comment,
    });
    sendMail(body.name, body.email, body.name, body.comment);
    return NextResponse.json({ message: "Project created", body }, { status: 201 });
}