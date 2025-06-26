import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from 'next-themes';
import "../../globals.css";

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
      <main>
        {children}
      </main>
    </>

  );
}
