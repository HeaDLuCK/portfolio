import Image from "next/image";
import logo from '../assets/zm-logo.png';
export default function Home() {
  return (
    <>
      <div className="flex py-12">
          <div className="w-1/2 flex flex-col justify-center items-start gap-4 p-8">
            <div>Available for Work</div>
            <div>
              <h2 className=" text-gray-500 font-bold text-5xl">Transform your ideas into digital success with Me!</h2>
              <p><small>I'am your partner in product web dev , website creation game creation and branding for every stage of you business</small></p>
            </div>
            <div>
              <button>Services</button>
              <button>Our work</button>
            </div>
          </div>
          <div>
              <Image src={logo} alt="Logo" width={500} height={500}  className="rounded-4xl"/>
          </div>
      </div>
    </>
  );
}
