import { MdEmail, MdLanguage } from 'react-icons/md';
import { FaUser, FaGlobe, FaBirthdayCake, FaCode } from 'react-icons/fa';
import { IoIosGitNetwork } from 'react-icons/io';

const KnowMore = () => {
    return (
        <>
            <ul className="space-y-2 grid grid-cols-2 gap-2">
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center'><FaUser className="mr-2" /> Name : </strong> Zakaria Missou
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center'><FaGlobe className="mr-2" /> Nationality : </strong> Moroccan
                </li>
                <li className="flex items-center gap-2 ">
                    <strong className='text-indigo-800/70 flex items-center'><FaBirthdayCake className="mr-2" /> Age : </strong> 22
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center'><MdEmail className="mr-2" /> Email : </strong> contact@missouzakaria.com
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center'><FaCode className="mr-2" /> Experience : </strong> 2 years
                </li>
                <li className="flex items-center gap-2 text-nowrap w-max">
                    <strong className='text-indigo-800/70 flex items-center'><MdLanguage className="mr-2" />Languages : </strong> Arabic, English, French, German
                </li>
            </ul>

        </>
    )
}

export default KnowMore;