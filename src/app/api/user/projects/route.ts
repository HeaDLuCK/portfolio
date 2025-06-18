import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import UserProject from "@/Model/user/UserProject";
import mongoose from "mongoose";
export async function GET() {
    const db = await dbConnect();
    const exampleUserId = new mongoose.Types.ObjectId('684f0b00e38dd164e6314b1f'); // replace with real user ID if you want
    const defaultUserProjects = [
        {
            translations: [
                {
                    lang: 'en',
                    title: "My Portfolio Site",
                    description: "A personal website built with React and Node.js"
                },
                {
                    lang: 'fr',
                    title: "Mon site Portfolio",
                    description: "Un site personnel créé avec React et Node.js"
                }
            ],
            url: "https://myportfolio.com",
            img_path: "/images/portfolio.png",
            userId: exampleUserId,
        },
        {
            translations: [
                {
                    lang: 'en',
                    title: "Blog Platform",
                    description: "Full-stack blog platform with user authentication"
                },
                {
                    lang: 'ar',
                    title: "منصة المدونة",
                    description: "منصة تدوين كاملة مع تسجيل الدخول"
                }
            ],
            url: "https://myblog.com",
            img_path: "/images/blog.png",
            userId: exampleUserId,
        }
    ];
    UserProject.insertMany(defaultUserProjects);
    // save project to database
    return NextResponse.json([
        { id: 1, title: "Portfolio" },
        { id: 2, title: "SaaS App" }
    ]);
}


export async function POST(req: Request) {
    await dbConnect();
    const body = await req.json();
    // Validate the request body
    
    
    return NextResponse.json({ message: "Project created", body }, { status: 201 });
}