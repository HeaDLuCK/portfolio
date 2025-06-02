'use client';
import Link from 'next/link';
import Image from "next/image";
import devoxImg from '../assets/meinDevox.jpg';
import { Typewriter } from 'react-simple-typewriter';
import { FaGithub, FaInstagram, FaLinkedin } from 'react-icons/fa';
export default function Home() {
  return (
    <>
      <div className="mt-8 relative overflow-hidden rounded-3xl shadow-2xl">
        <div>
          <Image src={devoxImg} alt="" />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-indigo-950/70 via-blue-950/70  to-transparent"></div>
        </div>

        <div className="absolute top-0  w-1/2 h-full flex flex-col gap-8 backdrop-blur-xs">
          <h1 className="ml-5 text-4xl font-bold text-white mt-20">
            Hey, I'm
            <span className="text-indigo-400">
              <Typewriter
                words={[' Zakaria Missou', ' FullStack Developer', ' Web Enthusiast']}
                loop={true}
                cursor
                cursorStyle='|'
                typeSpeed={80}
                deleteSpeed={40}
                delaySpeed={2000}
              /></span>
          </h1>
          <p className="ml-5 text-lg text-gray-300 ">
            I’m a passionate FullStack Web Developer from Morocco with expertise in modern web technologies.
            I specialize in building responsive, user-friendly web applications that bring ideas to life and create meaningful digital experiences.
            Constantly eager to learn and innovate, I enjoy exploring new tools and pushing the boundaries of web development.
          </p>
        </div>
        <div>
          <p className="absolute bottom-5 left-5 text-white text-md bg-black/40 px-4 py-2 rounded-lg shadow">
            Fueled by Java: the language and the liquid. <span>☕</span>
          </p>
        </div>
      </div>
      <div className="flex  gap-6 items-center p-4">
        <a href="https://github.com/missouzakaria" target="_blank" rel="noopener noreferrer" className="hover:scale-110 text-white hover:text-indigo-500 transition-transform flex items-center gap-2">
          <i className="text-2xl ">
            <FaGithub /> 
          </i>
           Github
        </a>

        <a href="https://linkedin.com/in/missouzakaria" target="_blank" rel="noopener noreferrer" className="hover:scale-110 text-white hover:text-indigo-500 transition-transform flex items-center gap-2">
          <i className="text-2xl ">
            <FaLinkedin /> 
          </i>
          Linkedin
        </a>

        <a href="https://instagram.com/missouzakaria" target="_blank" rel="noopener noreferrer" className="hover:scale-110 text-white hover:text-pink-500  transition-transform flex items-center gap-2">
          <i className="text-2xl ">
            <FaInstagram /> 
          </i>
          Instagram
        </a>
      </div>
      <div className="mt-8 flex justify-between items-start">
        <div className="flex-1 mt-12">
          <h2 className="text-3xl font-bold ">About Me</h2>
          <p className=" text-gray-600 mt-4 max-w-2xl mx-auto">
            I started coding during the COVID era,
            writing my first Python program and quickly falling in love with development.
            Since then, I’ve been on a journey exploring different languages and frameworks,
            always driven by curiosity and a passion for learning. When I’m not coding,
            you’ll find me gaming or diving into new technologies.
            <a href="/about"
              className="inline-block ml-3 text-black dark:text-white  hover:underline font-semibold  "
            >Dive In!</a>
          </p>
        </div>
        <div className="flex-1 ">
          <div className="m-12 p-4 rounded-xl grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-4 border border-[#333]
           bg-gradient-to-tr md:bg-gradient-to-tr bg-black  via-blue-950/70 dark:from-indigo-950/40 dark:via-blue-950/40 to-transparent">
            <div className="flex flex-col gap-2 p-2  h-32 rounded-xl border  border-[#333] bg-white/5  backdrop-blur-md">
              <h3 className="text-center font-semibold text-md text-white">Frontend Development</h3>
              <p className="font-medium text-sm text-gray-400 ">Building responsive and interactive user interfaces using modern frameworks and best practices.</p>
            </div>
            <div className="flex flex-col gap-2 p-2  h-32 rounded-xl border  border-[#333] bg-white/5  backdrop-blur-md">
              <h3 className="text-center font-semibold text-md text-white">Backend Development</h3>
              <p className="font-medium text-sm text-gray-400">Developing robust server-side applications, APIs, and efficient database solutions.</p>
            </div>
            <div className="flex flex-col gap-2 p-2  h-32 rounded-xl border  border-[#333] bg-white/5  backdrop-blur-md">
              <h3 className="text-center font-semibold text-md text-white">Responsive Design</h3>
              <p className="font-medium text-sm text-gray-400">Ensuring seamless functionality and aesthetics across all devices and screen sizes.</p>
            </div>
            <div className="flex flex-col gap-2 p-2  h-32 rounded-xl border  border-[#333] bg-white/5  backdrop-blur-md">
              <h3 className="text-center font-semibold text-md text-white">Performance Optimization</h3>
              <p className="font-medium text-sm text-gray-400">Optimizing web applications for speed, scalability, and an enhanced user experience.</p>
            </div>
            <button className="col-span-full border border-[#333]  text-white
              w-fit mx-auto px-4 py-2 rounded-xl bg-white/5  backdrop-blur-md cursor-pointer
              hover:bg-white/20 transition-all">Donwload CV</button>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-between items-start">
        <div className="flex items-end gap-2">
          <span className="text-6xl font-bold">12</span>
          <span className="max-w-[100px] dark:text-white/80  text-black/70">Years of experience</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-6xl font-bold">12</span>
          <span className="max-w-[100px] dark:text-white/80  text-black/70">Projects Completed</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-6xl font-bold">12</span>
          <p className="max-w-[100px] dark:text-white/80  text-black/70">Technical Skills</p>
        </div>
      </div>
      <div className="mt-8   bg-gradient-to-t md:bg-gradient-to-tl bg-black  via-blue-950/70 dark:from-indigo-950/20 dark:via-blue-950/50 to-transparent border
       border-[#333] rounded-3xl p-8 flex flex-col items-center gap-5">
        <span className=" bg-black/40 rounded-2xl border-[#333] border  p-2 text-xs text-white ">Share your thoughts</span>
        <h2 className="text-3xl font-bold text-indigo-300 tracking-wide">Love to hear from you</h2>
        <p className="text-white ">Always open to ideas, feedback, or a good conversation—because great things happen when we connect and share.</p>
        <Link className='flex items-center gap-2 bg-white text-black py-2 px-4 rounded-xl cursor-pointer' href="/contact">Contact Me</Link>
      </div>
    </>
  );
}
