import Link from 'next/link';

const Login = () => {
    return (
        <>
            <div className="flex bg-indigo-950/40" >
                {/* image side */}
                <div className='m-4'>
                    <img src="https://letsenhance.io/static/73136da51c245e80edc6ccfe44888a99/1015f/MainBefore.jpg" alt="" />
                </div>
                {/* information */}
                <div>
                    <div>
                        <h2>Create an account</h2>
                        <small>Already have an account? <Link href={"login"}>Log in</Link> </small>
                    </div>
                    <div>
                        <div>
                            <label htmlFor="first_name">
                                <input id='first_name' type="text" />
                            </label>
                            <label htmlFor="first_name">
                                <input id='first_name' type="text" />
                            </label>
                        </div>
                        <label htmlFor="first_name">
                            <input id='first_name' type="text" />
                        </label>
                        <label htmlFor="first_name">
                            <input id='first_name' type="text" />
                        </label>
                        <label htmlFor="first_name">
                            <input id='first_name' type="text" />
                            <span>I agree to the <span>Terms & conditions</span></span>
                        </label>
                    </div>
                    <button>Create account</button>
                    <hr />
                    <div>
                        <button>Google</button>
                        <button>Apple</button>
                    </div>
                </div>
            </div>
        </>
    )
}
export default Login;