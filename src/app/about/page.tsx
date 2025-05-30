import Education from '../../components/about-components/Education';

export default function Home() {
  return (
     <>
        <div className='flex  mt-14 w-4/5 mx-auto gap-12'>
            <ul className="flex flex-col items-center  gap-5 w-1/3">
                <li className='min-w-max w-full text-center bg-indigo-950 p-3 rounded-xl cursor-pointer'>Education</li>
                <li className='min-w-max w-full text-center bg-indigo-950 p-3 rounded-xl cursor-pointer'>Work experience</li>
                <li className='min-w-max w-full text-center bg-indigo-950 p-3 rounded-xl cursor-pointer'>Skills</li>
                <li className='min-w-max w-full text-center bg-indigo-950 p-3 rounded-xl cursor-pointer'>Get to know me</li>
            </ul>
            <div className='flex items-center justify-center w-fit'>
                <Education/>
            </div>
        </div>      
    </>
  );
}
