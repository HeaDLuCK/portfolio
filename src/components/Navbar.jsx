'use client';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../assets/no-bg-logo.png';
import 'boxicons/css/boxicons.min.css';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { RiMenu3Fill } from 'react-icons/ri';
import { IoMdClose } from 'react-icons/io';


export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [navContianerClass, setNavContianerClass] = useState("");
  const [navContent, setNavContent] = useState("");
  const [navHeader, setNavHeader] = useState("");
  const [navBody, setNavBody] = useState("");
  const [navFooter, setNavFooter] = useState("");
  const { setTheme, resolvedTheme } = useTheme();
  useEffect(() => { setMounted(true) }, []);
  const handleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  const showHideSideNavbar = (isToShow) => {
    setNavContianerClass(isToShow ? "!flex !flex-col !fixed" : "");
    setNavContent(isToShow ? "!flex-col !absolute" : "");
    setNavHeader(isToShow ? "!flex" : "");
    setNavBody(isToShow ? "!flex-col" : "");
    setNavFooter(isToShow ? "!flex" : "");
  }
  return (
    <>
      <div className='flex items-center justify-between mx-4 md:mx-0'>
        <div className='flex items-center gap-12'>
          <div className='logo'>
            <Image src={logo} alt="Photo" className='w-14 invert dark:invert-0' />
          </div>
          <div className={'hidden right-0  top-0 z-10 h-full w-full bg-gray-600/20 md:static   md:bg-transparent md:block ' + navContianerClass} id="nav-container">
            <div className={' flex    right-0 w-8/12 bg-white dark:bg-[#0a0a0a]  md:static h-full  md:bg-transparent md:block ' + navContent} id="nav-content">
              <div className={'hidden  items-center justify-between p-4 ' + navHeader} id="nav-header">
                <Image src={logo} alt="Photo" className='w-12 invert dark:invert-0' />
                <button className='text-2xl' onClick={()=>{showHideSideNavbar(false)}}>
                  <i>
                    <IoMdClose />
                  </i>
                </button>
              </div>
              <nav className={"flex items-center gap-8  flex-row " + navBody} id="nav-body">
                <Link onClick={()=>{showHideSideNavbar(false)}} className='m-0 px-3 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10' href="/">Home</Link>
                <Link onClick={()=>{showHideSideNavbar(false)}} className='m-0 px-3 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10' href="/about">About</Link>
                <Link onClick={()=>{showHideSideNavbar(false)}} className='m-0 px-3 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10' href="/projects">Projects</Link>
              </nav>
              <div className={'hidden items-center justify-center mt-auto p-4 ' + navFooter} id="nav-footer">
                <Link onClick={()=>{showHideSideNavbar(false)}} className='flex items-center gap-2 dark:bg-white border border-black text-black py-2 px-4 rounded-xl cursor-pointer' href="/contact">< i className='bx  bx-phone'  ></i> Contact Me </Link>
              </div>
            </div>
          </div>
        </div>
        <div className='flex items-center gap-4'>
          <button onClick={handleTheme} className="flex p-2 transition rounded-full dark:hover:bg-white/20 border border-black dark:border-white cursor-pointer">
            {mounted &&
              resolvedTheme === 'dark' ? (
              <i className='bx bxs-sun'></i>
            ) : (
              <i className='bx bxs-moon'></i>
            )
            }
          </button>
          <button className='md:hidden' onClick={()=>{showHideSideNavbar(true)}}>
            <i>
              <RiMenu3Fill className='text-xl font-boldd' />
            </i>
          </button>
          <Link className='hidden md:flex items-center gap-2 dark:bg-white border border-black text-black py-2 px-4 rounded-xl cursor-pointer' href="/contact">< i className='bx  bx-phone'  ></i> Contact Me </Link>
        </div>
      </div>
    </>
  );
}