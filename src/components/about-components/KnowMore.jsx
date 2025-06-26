import { MdEmail, MdLanguage } from 'react-icons/md';
import { FaUser, FaGlobe, FaBirthdayCake, FaCode } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
const KnowMore = () => {
    const [information, setInformation] = useState(null);
    const [languages, setLanguages] = useState("");
    useEffect(() => {
        axios.get('/api/user')
            .then(response => {
                if (response.status === 200) {
                    const { lang, user_information } = response.data;
                    const age = dayjs().diff(user_information.birthday, 'year');
                    user_information.age = age;
                    setInformation(user_information)
                    let langHolder = "";
                    user_information.languages.forEach(elm => {
                        langHolder +=elm.language+", ";
                    });
                    setLanguages(langHolder);

                }
            })
            .catch(error => {
                console.error('Error fetching data from GitHub API:', error);
            });
    }, []);
    return (
        <>
            <ul className="space-y-2 grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] md:grid-cols-2   gap-2">
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaUser className="mr-2" /> Name : </strong> {information?.first_name + " " + information?.last_name}
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaGlobe className="mr-2" /> Nationality : </strong> {information?.nationality}
                </li>
                <li className="flex items-center gap-2 ">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaBirthdayCake className="mr-2" /> Age : </strong> {information?.age}
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><MdEmail className="mr-2" /> Email : </strong> {information?.email}
                </li>
                <li className="flex items-center gap-2">
                    <strong className='text-indigo-800/70 flex items-center  text-nowrap '><FaCode className="mr-2" /> Experience : </strong> {information?.exp_years + " years, " + information?.exp_months + " months"}
                </li>
                <li className="flex items-center gap-2 md:text-nowrap md:w-max">
                    <strong className='text-indigo-800/70 flex items-center text-nowrap  '><MdLanguage className="mr-2" />Languages : </strong> {languages}
                </li>
            </ul>

        </>
    )
}

export default KnowMore;