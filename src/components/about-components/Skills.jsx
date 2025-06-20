import * as FaIcons from 'react-icons/fa';
import * as TbIcons from 'react-icons/tb';
import * as SiIcons from 'react-icons/si';
import * as BiIcons from 'react-icons/bi';
import * as DiIcons from 'react-icons/di';
import * as BsIcons from 'react-icons/bs';
import { useEffect, useState } from 'react';
import axios from 'axios';

const allIcons = {
    ...FaIcons,
    ...TbIcons,
    ...SiIcons,
    ...BiIcons,
    ...DiIcons,
    ...BsIcons,
};

// const Icon = allIcons[skill.icon];
const Skills = () => {
    const [skills, setSkills] = useState([]);
    useEffect(() => {
        axios.get('/api/user/skills')
            .then(response => {
                setSkills([]);
                if (response.status === 200) {
                    const { lang, skills } = response.data;
                    skills.forEach((skill) => {
                        skill.translations.forEach((translation) => {
                            if (translation.lang.toLowerCase() === lang.toLowerCase()) {
                                translation.icon = skill.icon;
                                setSkills((prevSkill) => [...prevSkill, translation]);
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
        <>
            <div className="skills flex flex-col gap-5 h-full w-full">
                <h1 className="text-4xl font-bold flex items-center gap-2">Skills</h1>
                <p>Here's a quick overview of the tools and languages I use regularly:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center w-full">
                    {skills && skills.map((skill, index) => {
                        const Icon = allIcons[skill.icon];
                        if (!Icon) {
                            console.warn(`Icon not found for ${skill.icon}`);
                        }
                        return (
                            <div key={index} className='flex flex-col items-center gap-2 dark:bg-white/10 bg-black/10 shadow-md rounded-xl p-2'>
                                {Icon ? <Icon size={40} /> : <span className="text-gray-500">Icon not found</span>}
                                <p>{skill.title}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    )
}

export default Skills;