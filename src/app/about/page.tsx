'use client'
import Education from '../../components/about-components/Education';
import Experience from '../../components/about-components/Experience';
import KnowMore from '../../components/about-components/KnowMore';
import Skills from '../../components/about-components/Skills';
import { useState } from 'react'
export default function Home() {
    const [activeSession, setActiveSession] = useState('education');
    return (
        <>
            <div className='flex  mt-14 w-4/5 mx-auto gap-12'>
                <ul className="flex flex-col items-center  gap-5 w-64">
                    <li className='min-w-full'>
                        <button className='min-w-max w-full text-center bg-gradient-to-tr md:bg-gradient-to-br from-indigo-950/70 to-blue-950/70 text-white p-3 rounded-xl cursor-pointer hover:brightness-150 transition' onClick={()=>{setActiveSession('education')}}>Education</button>
                    </li>
                    <li className='min-w-full'>
                        <button className='min-w-max w-full text-center bg-gradient-to-tr md:bg-gradient-to-br from-indigo-950/70 to-blue-950/70 text-white p-3 rounded-xl cursor-pointer hover:brightness-150 transition' onClick={()=>{setActiveSession('work')}}>Work experience</button>
                    </li>
                    <li className='min-w-full'>
                        <button className='min-w-max w-full text-center bg-gradient-to-tr md:bg-gradient-to-br from-indigo-950/70 to-blue-950/70 text-white p-3 rounded-xl cursor-pointer hover:brightness-150 transition' onClick={()=>{setActiveSession('skill')}}>Skills</button>
                    </li>
                    <li className='min-w-full'>
                        <button className='min-w-max w-full text-center bg-gradient-to-tr md:bg-gradient-to-br from-indigo-950/70 to-blue-950/70 text-white p-3 rounded-xl cursor-pointer hover:brightness-150 transition' onClick={()=>{setActiveSession('about-me')}}>Get to know me</button>
                    </li>
                </ul>

                <div className='flex items-center  w-2/3 '>
                    
                    {activeSession == "education" && <Education/>}
                    {activeSession == "work" && <Experience/>}
                    {activeSession == "skill" && <Skills/>}
                    {activeSession == "about-me" && <KnowMore/>}
                </div>
            </div>
        </>
    );
}
