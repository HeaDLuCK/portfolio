import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const experience = () => {
    const [experiences, setExperiences] = useState([]);
    useEffect(() => {
        axios.get('/api/user/experience')
            .then(response => {
                setExperiences([]);
                if (response.status === 200) {
                    const { lang, experiences } = response.data;
                    console.log(response.data);
                    experiences.forEach((exp) => {
                        exp.translations.forEach((translation) => {
                            if (translation.lang.toLowerCase() === lang.toLowerCase()) {
                                translation.date_start = exp.date_start ? dayjs(exp.date_start).format('MM/YYYY'): "present";
                                translation.date_end = exp.date_end ? dayjs(exp.date_end).format('MM/YYYY') : "present";
                                translation.company_name = exp.company_name || "";
                                setExperiences((prevExp) => [...prevExp, translation]);
                            }
                        });
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching data from GitHub API:', error);
            });
    }, []);
    return (
        <div className="experience flex flex-col gap-5 h-full">
            <h2 className=" text-4xl font-bold flex items-center gap-2"> Experience</h2>
            <p>I am a passionate software developer with hands-on experience contributing to a real-world SaaS platform.
                I worked on improving and extending an existing system using Java and web technologies, focusing on code refactoring, performance enhancements,
                and new feature development.
                This experience helped me grow as a developer and strengthened my understanding of clean code and collaborative development.</p>
            <div className="grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] md:grid-cols-[repeat(2,350px)]  gap-4 ">
                {experiences && experiences.map((exp, index) => (
                    <div key={index} className="flex flex-col  bg-white h-36 dark:bg-gray-800 p-4 rounded-lg shadow-md  justify-between">
                        <div className="flex flex-col gap-3">
                            <h3 className="w-max font-semibold text-start"> {exp.date_start} - {exp.date_end}</h3>
                            <h4 className="font-semibold">{exp.position}</h4>
                        </div>
                        <p className="dark:dark:text-white/60  text-black/70 flex gap-2 items-center"> <span className="w-2 h-2 rounded-full bg-indigo-950 "></span> {exp.company_name}</p>
                    </div>
                ))}


            </div>
        </div>
    );
}
export default experience;