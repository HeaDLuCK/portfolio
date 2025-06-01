const Education = () => {
    return (
        <div className="education flex flex-col gap-5">
            <h2 className=" text-4xl font-bold flex items-center gap-2">Education <i className='bx bxs-graduation'></i> </h2>
            <p>I’ve always believed that learning never really stops — especially in tech. Whether it's through school or just diving into something new on my own,
                I’m always picking up new skills and exploring better ways to build things.
                Here’s a quick look at where my learning journey has taken me so far.</p>
            <div className="grid grid-cols-[repeat(2,350px)] gap-4 ">
                <div className="flex flex-col  bg-white h-36 dark:bg-gray-800 p-4 rounded-lg shadow-md gap-3">
                    <h3 className="w-max font-bold text-sm text-start"> 🎮 Game Development with Unity <small className="font-semibold">(Udemy)</small></h3>
                    <p className="text-sm font-medium">Currently learning Unity & C# for 2D/3D games.</p>
                </div>
                <div className="flex flex-col bg-white h-36 dark:bg-gray-800 p-4 rounded-lg shadow-md gap-3">
                    <h3 className="w-max font-bold text-sm text-start">💻 The Odin Project <small className="font-semibold">(Full Stack JavaScript Path)</small> </h3>
                    <p>Completed frontend and backend courses with real-world projects.</p>
                </div>
                <div className="flex flex-col bg-white h-36 dark:bg-gray-800 p-4 rounded-lg shadow-md gap-3">
                    <h3 className="w-max font-bold text-sm text-start">🎓Diploma in Web Development <small className="text-gray-400 font-normal">(2021-2023)</small> </h3>
                    <p>Learning full-stack development: HTML, CSS, JS, PHP, MySQL,NoSQL,React, Laravel.</p>
                </div>
                <div className="flex flex-col bg-white h-36 dark:bg-gray-800 p-4 rounded-lg shadow-md gap-3">
                    <h3 className="w-max font-bold text-sm text-start">🎓High School Diploma</h3>
                    <p> Graduated in 2021</p>
                </div>
            </div>
        </div>
    );
}

export default Education;