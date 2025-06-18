import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import sendMail from "@/Service/mailService";
import User from "@/Model/user/User";

export async function GET(request: Request) {
    await dbConnect();
    // save project to database
    const cookieHeader = request.headers.get('cookie') || '';

    // Simple helper to parse cookies into an object
    const parseCookies = (cookieString: string) => {
        return Object.fromEntries(
        cookieString
            .split('; ')
            .map(cookie => cookie.split('='))
        );
    };

    const cookies = parseCookies(cookieHeader);
    const token = cookies['token'];
    const lang = cookies['lang'];
    console.log("Cookies:", cookies);
    return NextResponse.json({ message: lang+"  "+token }, { status: 201 });
}
export async function POST(req: Request) {
    await dbConnect();
    const body = await req.json();
    
    return NextResponse.json({ message: "Project created", body }, { status: 201 });
}