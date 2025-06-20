import { getTokenAndLang } from "@/lib/cookies";
import { dbConnect } from "@/lib/db";
import UserExperience from "@/Model/user/UserExperience";
import getUserExperience from "@/Service/experienceService";
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
          const experiences = await getUserExperience(token);
          return NextResponse.json({ lang, experiences }, { status: 200 });
     }

     // If neither section nor token/lang is provided, return an error
     return NextResponse.json({ error: "Missing id or section" }, { status: 400 });
}

export async function POST(req: NextRequest) {

     const userId = new mongoose.Types.ObjectId('684f0b00e38dd164e6314b1f');
     const defaultExperienceData = [
          {
               company_name: 'Juniv tech',
               date_start: new Date('2023-09-01'),
               date_end: null, // still ongoing
               translations: [
                    {
                         lang: 'en',
                         position: 'Full-Stack Developer',
                         description:
                              'I am a passionate software developer with hands-on experience contributing to a real-world SaaS platform. I worked on improving and extending an existing system using Java and web technologies, focusing on code refactoring, performance enhancements, and new feature development. This experience helped me grow as a developer and strengthened my understanding of clean code and collaborative development.',
                    },
                    {
                         lang: 'fr',
                         position: 'Développeur Full-Stack',
                         description:
                              "Je suis un développeur logiciel passionné avec une expérience pratique sur une plateforme SaaS réelle. J'ai travaillé sur l'amélioration et l'extension d’un système existant en utilisant Java et les technologies web, en me concentrant sur le refactoring du code, les optimisations de performance et le développement de nouvelles fonctionnalités. Cette expérience m'a permis de progresser en tant que développeur et de renforcer ma compréhension du code propre et du travail collaboratif.",
                    },
                    {
                         lang: 'de',
                         position: 'Full-Stack-Entwickler',
                         description:
                              'Ich bin ein leidenschaftlicher Softwareentwickler mit praktischer Erfahrung an einer realen SaaS-Plattform. Ich habe an der Verbesserung und Erweiterung eines bestehenden Systems mit Java und Webtechnologien gearbeitet, mit Schwerpunkt auf Code-Refactoring, Leistungsoptimierung und Entwicklung neuer Funktionen. Diese Erfahrung hat mein Wachstum als Entwickler gefördert und mein Verständnis für sauberen Code und kollaborative Entwicklung gestärkt.',
                    },
               ],
          },
     ];
     const dataToInsert = defaultExperienceData.map(item => ({
          ...item,
          userId: userId
     }));
     UserExperience.insertMany(dataToInsert);
     // Here you can process the body as needed
     return NextResponse.json({ message: "POST request recei2ved" }, { status: 201 });
}