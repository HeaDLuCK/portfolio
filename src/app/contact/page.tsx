export default function Home() {
  return (
    <>
      <div className="p-6  rounded-xl flex flex-col items-center justify-center mt-8  gap-12 border border-[#333]  bg-black   bg-gradient-to-tr md:bg-gradient-to-br from-indigo-950 dark:from-indigo-950/70 dark:via-blue-950/70 via-blue-950 to-transparent">
        <h2 className="text-3xl font-extrabold text-white">Let's 👋 Work Together</h2>
        <form className="flex flex-col gap-4">
          <div className="flex items-center gap-5">
            <label className="flex flex-col text-white">
              <span>Name:</span>
              <input type="text" name="name" className=" bg-white/20 rounded-sm px-3 py-2 min-w-72 outline-none" />
            </label>
            <label className="flex flex-col text-white">
              <span>Email:</span>
              <input type="text" name="name" className=" bg-white/20 rounded-sm px-3 py-2 min-w-72 outline-none" />
            </label>
          </div>
          <label className="flex flex-col text-white">
            <span>Subject:</span>
            <input type="text" name="name" className=" bg-white/20 rounded-sm px-3 py-2 min-w-72 outline-none" />
          </label>
          <label className="flex flex-col text-white">
            <span>Comment:</span>
            <textarea className=" bg-white/20 rounded-sm px-3 py-2 min-w-72 outline-none"  rows={5}/>
          </label>
          <button className="px-4 py-3 bg-white  w-fit mx-auto text-black rounded-xl cursor-pointer">Send Message</button>
        </form>
      </div>
    </>
  );
}
