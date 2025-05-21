import Link from 'next/link';
import Image from 'next/image';
import logo from '../assets/test.png';
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
      
      <div className='flex items-center justify-center '>
        <button className='bg-white text-black p-3 rounded-2xl'>Contact Me</button>
      </div>
    </div>
  );
}