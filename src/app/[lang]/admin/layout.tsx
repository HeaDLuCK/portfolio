import { Poppins } from "next/font/google";
import "../../globals.css";
import loginsideImg from '../../../assets/loginImg.jpg';
import Image from 'next/image';
import { FaArrowRightLong } from "react-icons/fa6";
import AuthBackground from "@/components/admin/background/AuthBackground";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <>
      <main className="max-w-screen-xl mx-auto m-4 flex flex-col h-[90vh] items-center justify-center">
        <AuthBackground />
        <div className="flex bg-indigo-950 h-[90%]  rounded-2xl" >
          {/* image side */}
          <div className='m-4 rounded-2xl flex-1 overflow-hidden relative'>
            <button className='p-2 px-3 cursor-pointer absolute top-5 right-5 flex gap-2 items-center bg-indigo-950/50 rounded-2xl text-sm'> Back to website<FaArrowRightLong /> </button>
            <Image src={loginsideImg} alt="" className='h-full object-cover ' style={{ objectPosition: '75% center' }} />
          </div>
          <div className='flex-1 p-20 flex flex-col justify-center gap-6'>
            {children}
          </div>
        </div>

      </main>
    </>

  );
}
