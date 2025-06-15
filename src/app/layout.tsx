import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from 'next-themes';
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
})
export const metadata: Metadata = {
  title: "Zakaria Missou | FullStack Developer",
  keywords: ["Missou" , "Zakaria","Java","front-end","back-end","Zakaria Missou", "FullStack Developer", "Web Development", "JavaScript", "React", "Node.js","AI"],
  description: "I’m a passionate FullStack Web Developer from Morocco with expertise in modern web technologies. I specialize in building responsive, user-friendly web applications that bring ideas to life and create meaningful digital experiences.",
};
import Navbar from '../components/Navbar';
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" className={`${poppins.variable} h-full`} suppressHydrationWarning>
      <body className="max-w-screen-xl mx-auto m-4 flex flex-col min-h-full">
        <ThemeProvider attribute="class" enableSystem={true}>
          <Navbar />
          <main className="flex-1 md:mx-0 mx-4">
            {children}
          </main>
          <footer className="text-center text-gray-500 mt-10">
            <p>©2025 | Zakaria Missou, All rights reserved.</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
