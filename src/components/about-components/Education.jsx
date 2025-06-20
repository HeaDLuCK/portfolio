import axios from "axios";
import { useEffect, useState } from "react";

const Education = () => {
    const [education, setEducation] = useState([]);
    useEffect(() => {
        axios.get('/api/user/education')
            .then(response => {
                setEducation([]);
                if (response.status === 200) {
                    const { lang, education } = response.data;
                    education.forEach((edu) => {
                        edu.translations.forEach((translation) => {
                            if (translation.lang.toLowerCase() === lang.toLowerCase()) {
                                setEducation((prevEdu) => [...prevEdu, translation]);
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
        <div className="education flex flex-col gap-5 h-full">
            <h2 className=" text-4xl font-bold flex items-center gap-2">Education <i className='bx bxs-graduation'></i> </h2>
            <p>I’ve always believed that learning never really stops — especially in tech. Whether it's through school or just diving into something new on my own,
                I’m always picking up new skills and exploring better ways to build things.
                Here’s a quick look at where my learning journey has taken me so far.</p>
            <div className="grid grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] md:grid-cols-[repeat(2,350px)] gap-4 ">
                {education && education.map((edu, index) => (
                        <div key={index} className="flex flex-col  bg-white h-36 dark:bg-gray-800 p-4 rounded-lg shadow-md gap-3">
                            <h3 className="w-max font-bold text-sm text-start"> {edu.field_of_study} <small className="font-semibold">({edu.institution})</small></h3>
                            <p className="text-sm font-medium">{edu.description}</p>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}

export default Education;