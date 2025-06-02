const experience = () => {
    return (
        <div className="experience flex flex-col gap-5 h-full">
            <h2 className=" text-4xl font-bold flex items-center gap-2"> Experience</h2>
            <p>I am a passionate software developer with hands-on experience contributing to a real-world SaaS platform.
                I worked on improving and extending an existing system using Java and web technologies, focusing on code refactoring, performance enhancements,
                and new feature development.
                This experience helped me grow as a developer and strengthened my understanding of clean code and collaborative development.</p>
            <div className="grid grid-cols-[repeat(2,350px)] gap-4 ">
                <div className="flex flex-col  bg-white h-36 dark:bg-gray-800 p-4 rounded-lg shadow-md  justify-between">
                    <div className="flex flex-col gap-3">
                        <h3 className="w-max font-semibold text-start"> 09/2023 - present</h3>
                        <h4 className="font-semibold">Full-Stack Developer</h4>
                    </div>
                    <p className="dark:dark:text-white/60  text-black/70 flex gap-2 items-center"> <span className="w-2 h-2 rounded-full bg-indigo-950 "></span> Juniv tech</p>
                </div>

            </div>
        </div>
    );
}
export default experience;