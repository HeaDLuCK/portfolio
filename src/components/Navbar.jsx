'use client';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../assets/test.png';
import 'boxicons/css/boxicons.min.css';
import { useEffect,useState } from 'react';
import { useTheme } from 'next-themes';

export default function Navbar() {
  const [mounted,setMounted] = useState(false);
  const { setTheme,resolvedTheme  } = useTheme();
  useEffect(()=>{setMounted(true)},[]);
  const handleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  return (
    <>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-12'>
          <div className='logo'>
            <Image src={logo} alt="Photo" className='w-14 invert dark:invert-0' />
          </div>
          <nav className="flex items-center gap-8 ">
            <Link className='m-0 px-3 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10' href="/">Home</Link>
            <Link className='m-0 px-3 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10' href="/about">About</Link>
            <Link className='m-0 px-3 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10' href="/projects">Projects</Link>
          </nav>
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
          <button className='flex items-center gap-2 dark:bg-white border border-black text-black py-2 px-4 rounded-xl cursor-pointer'>< i className='bx  bx-phone'  ></i> Contact Me</button>
        </div>
      </div>
    </>
  );
}