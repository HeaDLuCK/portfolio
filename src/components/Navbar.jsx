import Link from 'next/link';
import Image from 'next/image';
import logo from '../assets/test.png';
import 'boxicons/css/boxicons.min.css';
export default function Navbar() {
  return (
    <div className='flex items-center justify-between p-2'>
      <div className='logo'>
        <Image src={logo} alt="Photo" className='w-14' />
      </div>
      <div className='flex-1 flex  items-center justify-center'>
        <nav className="w-1/3 flex items-center justify-between space-x-4 py-4 px-6  text-white border-[#ffffff69] border-1 rounded-2xl bg-white/5">
          <Link className='m-0' href="/">Home</Link>
          <Link className='m-0' href="/about">About</Link>
          <Link className='m-0' href="/projects">Projects</Link>
        </nav>
      </div>
      
        <button className='flex items-center gap-2 bg-white text-black py-2 px-4 rounded-xl cursor-pointer'>< i class='bx  bx-phone'  ></i> Contact Me</button>
    </div>
  );
}