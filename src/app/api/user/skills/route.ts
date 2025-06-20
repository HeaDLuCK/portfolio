import { getTokenAndLang } from "@/lib/cookies";
import { dbConnect } from "@/lib/db";
import Userskill from "@/Model/user/Userskill";
import getUserSkills from "@/Service/userSkills";
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
          const skills = await getUserSkills(token);
          return NextResponse.json({ lang, skills }, { status: 200 });
     }

     // If neither section nor token/lang is provided, return an error
     return NextResponse.json({ error: "Missing id or section" }, { status: 400 });
}

export async function POST(req: NextRequest) {
     const defaultSkills = [
          {
               translations: [
                    { lang: 'en', title: 'Java' },
                    { lang: 'fr', title: 'Java' },
                    { lang: 'de', title: 'Java' }
               ],
               icon: 'FaJava',
          },
          {
               translations: [
                    { lang: 'en', title: 'Python' },
                    { lang: 'fr', title: 'Python' },
                    { lang: 'de', title: 'Python' }
               ],
               icon: 'FaPython',
          },
          {
               translations: [
                    { lang: 'en', title: 'PHP' },
                    { lang: 'fr', title: 'PHP' },
                    { lang: 'de', title: 'PHP' }
               ],
               icon: 'FaPhp',
          },
          {
               translations: [
                    { lang: 'en', title: 'C#' },
                    { lang: 'fr', title: 'C#' },
                    { lang: 'de', title: 'C#' }
               ],
               icon: 'TbBrandCSharp',
          },
          {
               translations: [
                    { lang: 'en', title: 'HTML5' },
                    { lang: 'fr', title: 'HTML5' },
                    { lang: 'de', title: 'HTML5' }
               ],
               icon: 'FaHtml5',
          },
          {
               translations: [
                    { lang: 'en', title: 'CSS3' },
                    { lang: 'fr', title: 'CSS3' },
                    { lang: 'de', title: 'CSS3' }
               ],
               icon: 'FaCss3Alt',
          },
          {
               translations: [
                    { lang: 'en', title: 'JavaScript' },
                    { lang: 'fr', title: 'JavaScript' },
                    { lang: 'de', title: 'JavaScript' }
               ],
               icon: 'FaJs',
          },
          {
               translations: [
                    { lang: 'en', title: 'Laravel' },
                    { lang: 'fr', title: 'Laravel' },
                    { lang: 'de', title: 'Laravel' }
               ],
               icon: 'FaLaravel',
          },
          {
               translations: [
                    { lang: 'en', title: 'React' },
                    { lang: 'fr', title: 'React' },
                    { lang: 'de', title: 'React' }
               ],
               icon: 'FaReact',
          },
          {
               translations: [
                    { lang: 'en', title: 'Vue.js' },
                    { lang: 'fr', title: 'Vue.js' },
                    { lang: 'de', title: 'Vue.js' }
               ],
               icon: 'FaVuejs',
          },
          {
               translations: [
                    { lang: 'en', title: 'Node.js' },
                    { lang: 'fr', title: 'Node.js' },
                    { lang: 'de', title: 'Node.js' }
               ],
               icon: 'FaNode',
          },
          {
               translations: [
                    { lang: 'en', title: 'Docker' },
                    { lang: 'fr', title: 'Docker' },
                    { lang: 'de', title: 'Docker' }
               ],
               icon: 'FaDocker',
          },
          {
               translations: [
                    { lang: 'en', title: 'Git' },
                    { lang: 'fr', title: 'Git' },
                    { lang: 'de', title: 'Git' }
               ],
               icon: 'FaGitAlt',
          },
          {
               translations: [
                    { lang: 'en', title: 'Tailwind CSS' },
                    { lang: 'fr', title: 'Tailwind CSS' },
                    { lang: 'de', title: 'Tailwind CSS' }
               ],
               icon: 'BiLogoTailwindCss',
          },
          {
               translations: [
                    { lang: 'en', title: 'MySQL' },
                    { lang: 'fr', title: 'MySQL' },
                    { lang: 'de', title: 'MySQL' }
               ],
               icon: 'SiMysql',
          },
          {
               translations: [
                    { lang: 'en', title: 'NoSQL / MongoDB' },
                    { lang: 'fr', title: 'NoSQL / MongoDB' },
                    { lang: 'de', title: 'NoSQL / MongoDB' }
               ],
               icon: 'DiMongodb',
          },
          {
               translations: [
                    { lang: 'en', title: 'Arduino' },
                    { lang: 'fr', title: 'Arduino' },
                    { lang: 'de', title: 'Arduino' }
               ],
               icon: 'SiArduino',
          },
          {
               translations: [
                    { lang: 'en', title: 'Spring Boot' },
                    { lang: 'fr', title: 'Spring Boot' },
                    { lang: 'de', title: 'Spring Boot' }
               ],
               icon: 'SiSpring',
          },
          {
               translations: [
                    { lang: 'en', title: 'jQuery' },
                    { lang: 'fr', title: 'jQuery' },
                    { lang: 'de', title: 'jQuery' }
               ],
               icon: 'DiJqueryLogo',
          },
          {
               translations: [
                    { lang: 'en', title: 'Linux CLI' },
                    { lang: 'fr', title: 'Linux CLI' },
                    { lang: 'de', title: 'Linux CLI' }
               ],
               icon: 'BsFillTerminalFill',
          },
     ];

     const userId = new mongoose.Types.ObjectId('684f0b00e38dd164e6314b1f');

     const dataToInsert = defaultSkills.map(item => ({
          ...item,
          userId: userId
     }));
     Userskill.insertMany(dataToInsert);
     // Here you can process the body as needed
     return NextResponse.json({ message: "POST request recei2ved" }, { status: 201 });
}