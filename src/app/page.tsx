import Image from "next/image";
import logo from '../assets/zm-logo.png';
export default function Home() {
  return (
    <>
      <div className="flex py-12">
          <div className="w-3/5 flex flex-col justify-center items-start gap-4 p-8">
            <div className="text-xs border-2 p-2  rounded-xl border-[#ffffff29] flex items-center gap-1">< i className='bx  bxs-circle text-green-700 '  ></i> Available for Work</div>
            <div className="flex flex-col gap-4 ">
              <h2 className=" text-gray-500  text-7xl font-light ">Transform your ideas into digital success with Me!</h2>
              <p><small>I'am your partner in product web dev , website creation game creation and branding for every stage of you business</small></p>
            </div>
            <div className="flex gap-4">
              <button className="bg-white text-black px-4 py-2 rounded-xl cursor-pointer">Services</button>
              <button className="bg-black text-white px-4 py-2 rounded-xl border cursor-pointer">Our work</button>
            </div>
          </div>
          <div>
              <Image src={logo} alt="Logo" width={500} height={500}  className="rounded-4xl"/>
          </div>
      </div>
    </>
  );
}
