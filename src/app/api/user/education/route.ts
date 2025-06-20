import { getTokenAndLang } from "@/lib/cookies";
import { dbConnect } from "@/lib/db";
import UserEducation from "@/Model/user/UserEducation";
import getUserEducation from "@/Service/educationService";
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
          const education = await getUserEducation(token);
          return NextResponse.json({ lang, education }, { status: 200 });
     }

     // If neither section nor token/lang is provided, return an error
     return NextResponse.json({ error: "Missing id or section" }, { status: 400 });
}

export async function POST(req: NextRequest) {
     const defaultEducationData = [
          {
               date_start: new Date('2024-01-01'),
               date_end: null, // still learning
               translations: [
                    {
                         lang: 'en',
                         institution: 'Udemy',
                         field_of_study: 'Game Development with Unity',
                         description: 'Currently learning Unity & C# for 2D/3D games.',
                    },
                    {
                         lang: 'fr',
                         institution: 'Udemy',
                         field_of_study: 'Développement de jeux avec Unity',
                         description: 'Actuellement en train d’apprendre Unity et C# pour créer des jeux 2D/3D.',
                    },
                    {
                         lang: 'de',
                         institution: 'Udemy',
                         field_of_study: 'Spieleentwicklung mit Unity',
                         description: 'Lerne derzeit Unity und C# für 2D/3D-Spiele.',
                    },
               ],
          },
          {
               date_start: new Date('2023-01-01'),
               date_end: new Date('2023-12-31'),
               translations: [
                    {
                         lang: 'en',
                         institution: 'The Odin Project',
                         field_of_study: 'Full Stack JavaScript Path',
                         description: 'Completed frontend and backend courses with real-world projects.',
                    },
                    {
                         lang: 'fr',
                         institution: 'The Odin Project',
                         field_of_study: 'Parcours JavaScript Full Stack',
                         description: 'Cours front-end et back-end terminés avec des projets réels.',
                    },
                    {
                         lang: 'de',
                         institution: 'The Odin Project',
                         field_of_study: 'Full Stack JavaScript Pfad',
                         description: 'Frontend- und Backend-Kurse mit realen Projekten abgeschlossen.',
                    },
               ],
          },
          {
               date_start: new Date('2021-09-01'),
               date_end: new Date('2023-06-30'),
               translations: [
                    {
                         lang: 'en',
                         institution: 'Web Development Diploma',
                         field_of_study: 'Full Stack Development',
                         description: 'Learning HTML, CSS, JS, PHP, MySQL, NoSQL, React, Laravel.',
                    },
                    {
                         lang: 'fr',
                         institution: 'Diplôme en développement web',
                         field_of_study: 'Développement Full Stack',
                         description: 'Apprentissage de HTML, CSS, JS, PHP, MySQL, NoSQL, React, Laravel.',
                    },
                    {
                         lang: 'de',
                         institution: 'Webentwicklungs-Diplom',
                         field_of_study: 'Full Stack Entwicklung',
                         description: 'Lernen von HTML, CSS, JS, PHP, MySQL, NoSQL, React, Laravel.',
                    },
               ],
          },
          {
               date_start: new Date('2018-09-01'),
               date_end: new Date('2021-06-30'),
               translations: [
                    {
                         lang: 'en',
                         institution: 'High School',
                         field_of_study: '',
                         description: 'Graduated in 2021.',
                    },
                    {
                         lang: 'fr',
                         institution: 'Lycée',
                         field_of_study: '',
                         description: 'Diplômé en 2021.',
                    },
                    {
                         lang: 'de',
                         institution: 'Gymnasium',
                         field_of_study: '',
                         description: 'Abschluss im Jahr 2021.',
                    },
               ],
          },
     ];
     const userId = new mongoose.Types.ObjectId('684f0b00e38dd164e6314b1f');

     const dataToInsert = defaultEducationData.map(item => ({
          ...item,
          userId: userId
     }));
     UserEducation.insertMany(dataToInsert);
     // Here you can process the body as needed
     return NextResponse.json({ message: "POST request recei2ved" }, { status: 201 });
}