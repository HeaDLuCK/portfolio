'use client';

import axios from "axios";

export default function Home() {
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formulaire = e.currentTarget;
    const formData = new FormData(e.currentTarget);
    console.log(e.currentTarget);
    const data = Object.fromEntries(formData.entries());  
    axios.post('/api/contact', data)
      .then((response) => {
        console.log('Form submitted successfully:', response.data);
        formulaire.reset(); // Reset the form after successful submission
      })
      .catch((error) => { 
        console.error('Error submitting form:', error);
      });
  }
  return (
    <>
      <div className="p-6  rounded-xl flex flex-col items-center justify-center mt-8  gap-12 border border-[#333]  bg-black   bg-gradient-to-tr md:bg-gradient-to-br from-indigo-950 dark:from-indigo-950/70 dark:via-blue-950/70 via-blue-950 to-transparent">
        <h2 className="text-3xl font-extrabold text-white text-center">Let's 👋 Work Together</h2>
        <form onSubmit={handleFormSubmit} id="contact-from" className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <label className="flex flex-col text-white w-full">
              <span>Name:</span>
              <input type="text" name="name" className=" bg-white/20 rounded-sm px-3 py-2 md:min-w-72 outline-none" />
            </label>
            <label className="flex flex-col text-white w-full">
              <span>Email:</span>
              <input type="text" name="email" className=" bg-white/20 rounded-sm px-3 py-2 md:min-w-72 outline-none" />
            </label>
          </div>
          <label className="flex flex-col text-white">
            <span>Subject:</span>
            <input type="text" name="subject" className=" bg-white/20 rounded-sm px-3 py-2 md:min-w-72 outline-none" />
          </label>
          <label className="flex flex-col text-white">
            <span>Comment:</span>
            <textarea name="comment" className=" bg-white/20 rounded-sm px-3 py-2 min-w-72 outline-none"  rows={5}/>
          </label>
          <button   className="px-4 py-3 bg-white  w-fit mx-auto text-black rounded-xl cursor-pointer text-sm mt-4 md:text-base md:mt-0">Send Message</button>
        </form>
      </div>
    </>
  );
}
