import Education from '../../components/about-components/Education';

export default function Home() {
  return (
     <>
        <div className='flex  mt-8 justify-center gap-12'>
            <ul className="flex flex-col items-center justify-center  gap-12">
                <li>Education</li>
                <li>Work experience</li>
                <li>Skills</li>
                <li>Get to know me</li>
            </ul>
            <div>
                <Education/>
            </div>
        </div>      
    </>
  );
}
