'use client';
import Link from 'next/link';
import Image from "next/image";
import devoxImg from '../../../assets/meinDevox.jpg';
import { Typewriter } from 'react-simple-typewriter';
import { FaGithub, FaInstagram, FaLinkedin } from 'react-icons/fa';
import CvPopUp from '../../../components/home/CvPopUp';
import { useEffect, useState } from 'react';
import axios from 'axios';
export default function Home() {
  const [loading, setLoading] = useState(true);
  const [heroContent, setHeroContent] = useState<any>(null);
  const [aboutContent, setAboutContent] = useState<any>(null);
  const [features, setFeatures] = useState<any>([]);
  const [experienceContent, setExperienceContent] = useState(0);
  const [projectsContent, setProjectsContent] = useState(0);
  const [skillsContent, setSkillsContent] = useState(0);
  const [footerContent, setFooterContent] = useState(null);

  const getContent = (section: string) => {
    return axios.get(`/api/user/content?section=${section}`)
      .then((response) => {
        if (response.status === 200) {
          const { lang, content } = response.data;
          if (content?.translations) {
            content.translations.forEach((translation: any) => {
              if (translation.lang.toLowerCase() === lang.toLowerCase()) {//it will be changed to dynamic lang
                if (section === 'hero') {
                  setHeroContent(translation);
                } else if (section === 'about') {
                  setAboutContent(translation);
                }
                else if (section === 'experience') {
                  setExperienceContent(translation.description);
                }
                else if (section === 'projects') {
                  setProjectsContent(translation.description);
                }
                else if (section === 'skills') {
                  setSkillsContent(translation.description);
                }
                else if (section === 'footer') {
                  setFooterContent(translation);
                }
              }
            });
          }

        }
      })
      .catch((error) => {
        console.error('Error fetching hero section content:', error);
      })
  };
  const getFeatures = () => {
    return axios.get(`/api/user/feature`)
            .then((response) => {
              if (response.status === 200) {
                const { lang, features } = response.data;
                features.forEach((feature: any) => {
                  feature.translations.forEach((translation: any) => {
                    if (translation.lang.toLowerCase() === lang.toLowerCase()) {
                      setFeatures((prevFeatures: any) => [...prevFeatures, {
                        title: translation.title,
                        description: translation.description,
                        order :feature.order
                      }]);
                    }
                  });
                });
              }
            });
    
  }
  useEffect(() => {
    Promise.all([
      getContent('hero'),
      getContent('about'),
      getContent('experience'),
      getContent('projects'),
      getContent('skills'),
      getContent('footer'),
      getFeatures()

    ]);
  }, []);

  useEffect(() => {
    if (features && heroContent && aboutContent && footerContent) {
      setFeatures(features.sort((a: any, b: any) => a.order - b.order));
      setLoading(false);
    }
  }, [features, heroContent, aboutContent, footerContent]);

  const [cvPopUpOpen, setCvPopUpOpen] = useState(false);
  if (loading) return (<div className="flex justify-center items-center h-screen">Loading...</div>); //or a loading spinner
  return (
    <>
      <div className="mt-8  md:mx-0 relative overflow-hidden rounded-3xl shadow-2xl">
        <div>
          <Image src={devoxImg} alt="" className='h-72 object-cover md:h-full ' style={{ objectPosition: '75% center' }} />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-indigo-950/70 via-blue-950/70  to-transparent"></div>
        </div>

        <div className="absolute top-0  w-1/2 h-full flex flex-col gap-8 backdrop-blur-xs">
          <h1 className="ml-5 md:text-4xl font-bold text-white mt-4 md:mt-20">
            {heroContent ? heroContent.heading : 'Hey, I\'m'}
            <span className="text-indigo-400 ">
              <Typewriter
                words={heroContent ? heroContent.typewriter : []}
                loop={true}
                cursor
                cursorStyle='|'
                typeSpeed={80}
                deleteSpeed={40}
                delaySpeed={2000}
              /></span>
          </h1>
          <p className="ml-5 text-lg text-gray-300 hidden md:block">
            {heroContent ? heroContent.description : ''}
          </p>
        </div>
        <div>
          <p className="absolute bottom-5 left-5 text-white text-md bg-black/40 px-4 py-2 rounded-lg shadow text-xs md:text-base">
            Fueled by Java: the language and the liquid. <span>☕</span>
          </p>
        </div>
      </div>
      <div className="flex  gap-6 items-center md:justify-normal justify-between p-4 text-sm md:text-base">
        <a href="https://github.com/HeaDLuCK" target="_blank" rel="noopener noreferrer" className="hover:scale-110 dark:text-white hover:text-indigo-500 transition-transform flex items-center gap-2">
          <i className="text-2xl ">
            <FaGithub />
          </i>
          Github
        </a>

        <a href="https://linkedin.com/in/zakaria-missou" target="_blank" rel="noopener noreferrer" className="hover:scale-110 dark:text-white  hover:text-indigo-500 transition-transform flex items-center gap-2">
          <i className="text-2xl ">
            <FaLinkedin />
          </i>
          Linkedin
        </a>

        <a href="https://instagram.com/zakaria_miss" target="_blank" rel="noopener noreferrer" className="hover:scale-110 dark:text-white hover:text-pink-500  transition-transform flex items-center gap-2">
          <i className="text-2xl ">
            <FaInstagram />
          </i>
          Instagram
        </a>
      </div>
      <div className="mt-8 flex md:flex-row flex-col justify-between items-start">
        <div className="flex-1 mt-12">
          <h2 className="text-3xl font-bold ">About Me</h2>
          <p className=" text-gray-600 mt-4 max-w-2xl mx-auto">
            {aboutContent && aboutContent.description}
            <a href="/about"
              className="inline-block ml-3 text-black dark:text-white  hover:underline font-semibold  "
            >Dive In!</a>
          </p>
        </div>
        <div className="flex-1 ">
          <div className=" mt-12 md:m-12 p-4 rounded-xl grid grid-cols-[repeat(auto-fit,_minmax(150px,_1fr))] md:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-4 border border-[#333]
           bg-gradient-to-tr md:bg-gradient-to-tr bg-black  via-blue-950/70 dark:from-indigo-950/40 dark:via-blue-950/40 to-transparent">
            {features && features.map((feature: any, index: number) => (
              <div key={index} className="flex flex-col gap-2 p-2 h-36  md:h-32 rounded-xl border  border-[#333] bg-white/5  backdrop-blur-md">
                <h3 className="text-center font-semibold text-sm md:text-md text-white">{feature.title}</h3>
                <p className="font-medium text-xs md:text-sm text-gray-400 ">{feature.description}</p>
              </div>
            ))}
            
            <button className="col-span-full border border-[#333]  text-white
              w-fit mx-auto px-4 py-2 rounded-xl bg-white/5  backdrop-blur-md cursor-pointer
              hover:bg-white/20 transition-all text-sm md:text-base"
              onClick={() => setCvPopUpOpen(true)}>Donwload CV</button>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-between items-start">
        <div className="flex flex-col md:flex-row justify-center md:justify-normal items-center md:gap-2 ">
          <span className="text-3xl md:text-6xl font-bold">{experienceContent}</span>
          <span className="md:max-w-[100px] dark:text-white/80  text-black/70 text-xs md:text-base">Years of experience</span>
        </div>
        <div className="flex flex-col md:flex-row justify-center md:justify-normal items-center md:gap-2">
          <span className="text-3xl md:text-6xl font-bold">{projectsContent}</span>
          <span className="md:max-w-[100px] dark:text-white/80  text-black/70 text-xs md:text-base">Projects Completed</span>
        </div>
        <div className="flex flex-col md:flex-row justify-center md:justify-normal items-center md:gap-2">
          <span className="text-3xl md:text-6xl font-bold">{skillsContent}</span>
          <p className="md:max-w-[100px] dark:text-white/80  text-black/70 text-xs md:text-base">Technical Skills</p>
        </div>
      </div>
      <div className="mt-8   bg-gradient-to-t md:bg-gradient-to-tl bg-black  via-blue-950/70 dark:from-indigo-950/20 dark:via-blue-950/50 to-transparent border
       border-[#333] rounded-3xl p-8 flex flex-col items-center gap-5">
        <span className=" bg-black/40 rounded-2xl border-[#333] border  p-2 text-xs text-white ">Share your thoughts</span>
        <h2 className="text-xl d:text-3xl font-bold text-indigo-300 tracking-wide">Love to hear from you</h2>
        <p className="text-white text-center md:text-base text-sm">Always open to ideas, feedback, or a good conversation—because great things happen when we connect and share.</p>
        <Link className='flex items-center gap-2 bg-white text-black py-2 px-4 rounded-xl cursor-pointer' href="/contact">Contact Me</Link>
      </div>

      {cvPopUpOpen && <CvPopUp onClose={() => setCvPopUpOpen(false)} />}

    </>
  );
}
