import { getTokenAndLang } from "@/lib/cookies";
import { dbConnect } from "@/lib/db";
import UserSectionContent from "@/Model/user/UserSectionContent";
import getContentByUserAndSection from "@/Service/contentService";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    await dbConnect();
    const { token, lang } = getTokenAndLang(req);
    console.log("Token:", token, "Lang:", lang);
    const { searchParams } = new URL(req.url);
    if (!token && !lang) {
        return NextResponse.json({ type: "by-token-lang", token, lang });
    }
    const section = searchParams.get("section");

    if (section && token) {
        // Handle by section
        const content = await getContentByUserAndSection(token, section)
        return NextResponse.json({lang,content}, { status: 200 });
    }

    // If neither section nor token/lang is provided, return an error
    return NextResponse.json({ error: "Missing id or section" }, { status: 400 });
}

export async function POST(req: NextRequest) {
    const db = await dbConnect();
    // Handle POST request
    const userId = new mongoose.Types.ObjectId('684f0b00e38dd164e6314b1f');
    const defaultContent = [
        {
            section: "hero",
            userId: userId,
            translations: [
                {
                    lang: "en",
                    heading: "Hey, I'm Zakaria Missou",
                    typewriter: [" Zakaria Missou", " FullStack Developer", " Web Enthusiast"],
                    description: "I’m a passionate FullStack Web Developer from Morocco with expertise in modern web technologies."
                },
                {
                    lang: "fr",
                    heading: "Salut, je suis Zakaria Missou",
                    typewriter: [" Zakaria Missou", " Développeur FullStack", " Passionné du Web"],
                    description: "Je suis un développeur web FullStack passionné du Maroc spécialisé dans les technologies modernes."
                }
            ],
            icon: {
                type: "image",
                value: "/icons/hero-icon.svg"
            }
        },
        {
            section: "about",
            userId: userId,
            translations: [
                {
                    lang: "en",
                    heading: "About Me",
                    description: `I started coding during the COVID era,
writing my first Python program and quickly falling in love with development.
Since then, I’ve been on a journey exploring different languages and frameworks,
always driven by curiosity and a passion for learning.`
                }
            ],
            icon: {
                type: "icon",
                value: "about-icon" // e.g. a font-awesome or custom icon name
            }
        },
        {
            section: "experience",
            userId: userId,
            translations: [
                {
                    lang: "en",
                    heading: "Years of Experience",
                    description: "2"
                }
            ],
            icon: {
                type: "icon",
                value: "experience-icon"
            }
        },
        {
            section: "projects",
            userId: userId,
            translations: [
                {
                    lang: "en",
                    heading: "Projects Completed",
                    description: "4"
                }
            ],
            icon: {
                type: "icon",
                value: "projects-icon"
            }
        },
        {
            section: "skills",
            userId: userId,
            translations: [
                {
                    lang: "en",
                    heading: "Technical Skills",
                    description: "20"
                }
            ],
            icon: {
                type: "icon",
                value: "skills-icon"
            }
        },
        {
            section: "footer",
            userId: userId,
            translations: [
                {
                    lang: "en",
                    heading: "Love to hear from you",
                    description: "Always open to ideas, feedback, or a good conversation—because great things happen when we connect and share."
                }
            ],
            icon: {
                type: "icon",
                value: "footer-icon"
            }
        }
    ];
    UserSectionContent.insertMany(defaultContent);

    return NextResponse.json({ message: "POST request receive22d" }, { status: 201 });
}