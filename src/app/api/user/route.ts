import { getTokenAndLang } from "@/lib/cookies";
import { dbConnect } from "@/lib/db";
import UserExperience from "@/Model/user/UserExperience";
import getUserInfo from "@/Service/userService";
import dayjs, { Dayjs } from "dayjs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
     await dbConnect();
     const { token, lang } = getTokenAndLang(req);
     if (!token && !lang) {
          return NextResponse.json({ type: "by-token-lang", token, lang });
     }
     if (token) {
          // Handle by section
          let user_information = await getUserInfo(token);
          const experiences = await UserExperience.find({
               userId: user_information?._id,
          });
          let totalYears = 0;
          let totalMonths = 0;
          let totalDays = 0;
          experiences.forEach(exp => {

               const dateDebut = dayjs(exp.date_start);
               const dateEnd = exp.date_end ? dayjs(exp.date_end) : dayjs();
               const years = dateEnd.diff(dateDebut, 'year');
               const dateDebutPlusYears = dateDebut.add(years, 'year');// add year so i can comapre only months
               const months = dateEnd.diff(dateDebutPlusYears, 'month');
               const dateDebutPlusYearsAndMonths = dateDebutPlusYears.add(months, 'month');
               const days = dateEnd.diff(dateDebutPlusYearsAndMonths, 'day');
               totalYears += years;
               totalMonths += months;
               totalDays += days;
          })
          user_information = user_information.toObject();
          user_information.exp_years = totalYears;
          user_information.exp_months = totalMonths;//
          user_information.exp_days = totalDays;
          return NextResponse.json({ lang, user_information }, { status: 200 });
     }

     // If neither section nor token/lang is provided, return an error
     return NextResponse.json({ error: "Missing id or section" }, { status: 400 });
}

export async function POST(req: NextRequest) {

     return NextResponse.json({ message: "POST request recei2ved" }, { status: 201 });
}