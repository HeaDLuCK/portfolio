import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import { SiApple } from 'react-icons/si';

const Login = () => {
    return (
        <>
            <div className='flex flex-col gap-4'>
                <h2 className='text-4xl font-medium'>Welcome Back!</h2>
            </div>
            <div className='flex flex-col gap-6 '>
                <label htmlFor="mail" >
                    <input id='mail' type="text" className='w-full p-3 rounded-xl border-2 border-indigo-300 bg-indigo-100/10' placeholder='Email' />
                </label>
                <div className='flex flex-col gap-2'>
                    <label htmlFor="password" className='w-full'>
                        <input id='password' type="text" className='w-full p-3 rounded-xl border-2 border-indigo-300 bg-indigo-100/10' placeholder='Enter your password' />
                    </label>
                    <Link href={"login"} className='text-sm mr-2 text-indigo-200 underline self-end'>Forgot password ?</Link>
                </div>
            </div>
            <button className='bg-indigo-400 p-4 rounded-xl cursor-pointer'>Sign In</button>
            <span
                className="flex w-full items-center gap-3 
                            after:inline-block after:w-full after:h-[2px] after:bg-gray-400 
                            before:inline-block before:w-full before:h-[2px] before:bg-gray-400 text-gray-400 text-nowrap text-sm">
                Or</span>
            <div className='flex items-center gap-8'>
                <button className='p-4 flex items-center gap-2 justify-center  flex-1 border-2 border-white rounded-xl cursor-pointer'><FcGoogle size={26} /> Google</button>
                <button className='p-4 flex items-center gap-2 justify-center  flex-1 border-2 border-white rounded-xl cursor-pointer'><SiApple size={26} /> Apple</button>
            </div>
            <small className='text-gray-400 text-center '>Don't have an Account ? <Link href={"register"} className='text-indigo-200 underline'>Sign Up</Link> </small>
        </>
    )
}
export default Login;