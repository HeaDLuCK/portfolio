import { getTokenAndLang } from "@/lib/cookies";
import { dbConnect } from "@/lib/db";
import getUserInfo from "@/Service/userService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
     await dbConnect();
     const { token, lang } = getTokenAndLang(req);
     if (!token && !lang) {
          return NextResponse.json({ type: "by-token-lang", token, lang });
     }
     if (token) {
          // Handle by section
          const user_information = await getUserInfo(token);
          return NextResponse.json({ lang, user_information }, { status: 200 });
     }

     // If neither section nor token/lang is provided, return an error
     return NextResponse.json({ error: "Missing id or section" }, { status: 400 });
}

export async function POST(req: NextRequest) {
    
     return NextResponse.json({ message: "POST request recei2ved" }, { status: 201 });
}