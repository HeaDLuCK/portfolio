import { getTokenAndLang } from "@/lib/cookies";
import { dbConnect } from "@/lib/db";
import UserFeature from "@/Model/user/UserFeature";
import getFeaturesByUser from "@/Service/featureService";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    await dbConnect();
    const { token, lang } = getTokenAndLang(req);
    if (!token && !lang) {
        return NextResponse.json({ type: "by-token-lang", token, lang });
    }
    if (token) {
        // Handle by section
        const features = await getFeaturesByUser(token)
        return NextResponse.json({ lang, features }, { status: 200 });
    }

    // If neither section nor token/lang is provided, return an error
    return NextResponse.json({ error: "Missing id or section" }, { status: 400 });
}

export async function POST(req: NextRequest) {
    const db = await dbConnect();
    // Handle POST request
    const userId = new mongoose.Types.ObjectId("684f0b00e38dd164e6314b1f"); // replace with real user ID

    const features = [
        {
            section: "feature",
            userId,
            order: 1,
            translations: [
                {
                    lang: "en",
                    title: "Frontend Development",
                    description: "Building responsive and interactive user interfaces using modern frameworks and best practices."
                }
            ]
        },
        {
            section: "feature",
            userId,
            order: 2,
            translations: [
                {
                    lang: "en",
                    title: "Backend Development",
                    description: "Developing robust server-side applications, APIs, and efficient database solutions."
                }
            ]
        },
        {
            section: "feature",
            userId,
            order: 3,
            translations: [
                {
                    lang: "en",
                    title: "Responsive Design",
                    description: "Ensuring seamless functionality and aesthetics across all devices and screen sizes."
                }
            ]
        },
        {
            section: "feature",
            userId,
            order: 4,
            translations: [
                {
                    lang: "en",
                    title: "Performance Optimization",
                    description: "Optimizing web applications for speed, scalability, and an enhanced user experience."
                }
            ]
        }
    ];

    await UserFeature.insertMany(features);

    return NextResponse.json({ message: "POST request receive22d" }, { status: 201 });
}