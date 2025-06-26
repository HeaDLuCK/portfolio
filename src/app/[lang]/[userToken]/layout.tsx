import Navbar from '../../../components/Navbar';
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

    <div className="max-w-screen-xl mx-auto m-4 flex flex-col min-h-full">
      <Navbar />
      <main className="flex-1 md:mx-0 mx-4">
        {children}
      </main>
      <footer className="text-center text-gray-500 mt-10">
        <p>©2025 | Zakaria Missou, All rights reserved.</p>
      </footer>
    </div>
  );
}
