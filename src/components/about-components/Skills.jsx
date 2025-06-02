import { BiLogoTailwindCss } from 'react-icons/bi';
import { BsFillTerminalFill } from 'react-icons/bs';
import { DiJqueryLogo, DiMongodb } from 'react-icons/di';
import { FaJava, FaReact, FaHtml5, FaCss3Alt, FaPython, FaPhp, FaJs, FaLaravel, FaVuejs, FaNode, FaDocker, FaGitAlt } from 'react-icons/fa';
import { SiArduino, SiMysql, SiSpring } from 'react-icons/si';
import { TbBrandCSharp } from 'react-icons/tb';
const Skills = () => {
    return (
        <>
            <div className="skills flex flex-col gap-5 h-full w-full">
                <h1 className="text-4xl font-bold flex items-center gap-2">Skills</h1>
                <p>Here's a quick overview of the tools and languages I use regularly:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center w-full">
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaJava size={40} /><p>Java</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaPython size={40} /><p>Python</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaPhp size={40} /><p>Php</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><TbBrandCSharp size={40} /><p>Csharp</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaHtml5 size={40} /><p>HTML5</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaCss3Alt size={40} /><p>CSS3</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaJs size={40} /><p>Javascript</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaLaravel size={40} /><p>Laravel</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaReact size={40} /><p>React</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaVuejs size={40} /><p>VueJs</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaNode size={40} /><p>NodeJs</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaDocker size={40} /><p>Docker</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><FaGitAlt size={40} /><p>Git</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><BiLogoTailwindCss size={40} /><p>Tailwind</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><SiMysql size={40} /><p>MySql</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><DiMongodb size={40} /><p>Nosql</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><SiArduino size={40} /><p>arduino</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><SiSpring size={40} /><p>Spring boot</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><DiJqueryLogo size={40} /><p>Jquery</p></div>
                    <div className='flex flex-col items-center gap-2 bg-white/10 rounded-xl p-2'><BsFillTerminalFill size={40} /><p>Linux CLI</p></div>
                </div>
            </div>
        </>
    )
}

export default Skills;