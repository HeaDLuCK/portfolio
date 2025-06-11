const CvPopUp = ({onClose}) => {
  return (
    <div className='fixed top-0 left-0 flex items-center justify-center w-full h-full'>
      <div className="bg-white  dark:bg-gray-800 p-6 rounded-lg shadow-lg relative max-w-md w-full flex flex-col gap-4 items-center">
        <button className="cursor-pointer w-fit self-end" onClick={onClose}>
          &times;
        </button>
        <h2>blabla</h2>
        <p>blabla</p>
        <a href='blabla' target="_blank" rel="noopener noreferrer" className="border border-[#333]  text-white
              w-fit mx-auto px-4 py-2 rounded-xl bg-white/5  backdrop-blur-md cursor-pointer
              hover:bg-white/20 transition-all text-sm md:text-base">
          View CV
        </a>
      </div>
    </div>
  );
}

export default CvPopUp;