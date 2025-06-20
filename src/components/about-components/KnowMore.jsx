import { MdEmail, MdLanguage } from 'react-icons/md';
import { FaUser, FaGlobe, FaBirthdayCake, FaCode } from 'react-icons/fa';

const KnowMore = () => {
    return (
        <>
            <ul className="space-y-2 grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] md:grid-cols-2   gap-2">
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaUser className="mr-2" /> Name : </strong> Zakaria Missou
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaGlobe className="mr-2" /> Nationality : </strong> Moroccan
                </li>
                <li className="flex items-center gap-2 ">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaBirthdayCake className="mr-2" /> Age : </strong> 22
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><MdEmail className="mr-2" /> Email : </strong> contact@missouzakaria.com
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaCode className="mr-2" /> Experience : </strong> 2 years
                </li>
                <li className="flex items-center gap-2 md:text-nowrap md:w-max">
                    <strong className='text-indigo-800/70 flex items-center text-nowrap  '><MdLanguage className="mr-2" />Languages : </strong> Arabic, English, French, German
                </li>
            </ul>

        </>
    )
}

export default KnowMore;