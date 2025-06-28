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
      <AuthBackground />
      {children}
    </>

  );
}
