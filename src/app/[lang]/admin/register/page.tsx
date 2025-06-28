import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRightLong } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { SiApple } from 'react-icons/si';
import loginsideImg from '../../../../assets/loginImg.jpg';

const Register = () => {
    return (
        <>
            <div className='flex flex-col gap-4'>
                <h2 className='text-4xl font-medium'>Create an account</h2>
                <small className='text-gray-400 '>Already have an account? <Link href={"login"} className='text-indigo-200 underline'>Sign In</Link> </small>
            </div>
            <div className='flex flex-col gap-6 '>
                <div className='flex gap-6 items-center'>
                    <label htmlFor="first_name" className='flex-1'>
                        <input id='first_name' type="text" className='w-full p-3 rounded-xl border-2 border-indigo-300 bg-indigo-100/10' placeholder='First name' />
                    </label>
                    <label htmlFor="last_name" className='flex-1'>
                        <input id='last_name' type="text" className='w-full p-3 rounded-xl border-2 border-indigo-300 bg-indigo-100/10' placeholder='Last name' />
                    </label>
                </div>
                <label htmlFor="mail" >
                    <input id='mail' type="text" className='w-full p-3 rounded-xl border-2 border-indigo-300 bg-indigo-100/10' placeholder='Email' />
                </label>
                <label htmlFor="password" className='w-full'>
                    <input id='password' type="text" className='w-full p-3 rounded-xl border-2 border-indigo-300 bg-indigo-100/10' placeholder='Enter your password' />
                </label>
                <label htmlFor="agreement" className='ml-2 w-full flex items-center gap-4'>
                    <input id='agreement' type="checkbox" className='accent-white p-4 scale-125 cursor-pointer' />
                    <span>I agree to the <Link href={"login"} className='text-indigo-200 underline'>Terms & conditions</Link></span>
                </label>
            </div>
            <button className='bg-indigo-400 p-4 rounded-xl cursor-pointer'>Create account</button>
            <span
                className="flex w-full items-center gap-3 
                            after:inline-block after:w-full after:h-[2px] after:bg-gray-400 
                            before:inline-block before:w-full before:h-[2px] before:bg-gray-400 text-gray-400 text-nowrap text-sm">
                Or register with</span>
            <div className='flex items-center gap-8'>
                <button className='p-4 flex items-center gap-2 justify-center  flex-1 border-2 border-white rounded-xl cursor-pointer'><FcGoogle size={26} /> Google</button>
                <button className='p-4 flex items-center gap-2 justify-center  flex-1 border-2 border-white rounded-xl cursor-pointer'><SiApple size={26} /> Apple</button>
            </div>
        </>
    )
}
export default Register;