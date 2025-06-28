'use client';
import Link from "next/link";
import CountUp from "react-countup";
import { BsTools } from "react-icons/bs";
import { FaChartBar, FaSearch } from "react-icons/fa";
import { HiRefresh } from "react-icons/hi";
import { IoIosLink } from "react-icons/io";
import { IoChatbox, IoSettingsSharp } from "react-icons/io5";
import { MdDashboard, MdOutlinePersonOutline } from "react-icons/md";
import { TbLogout2 } from "react-icons/tb";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from 'recharts';
const Dashboard = () => {

    const data = [
        { name: 'Mon', visits: 120 },
        { name: 'Tue', visits: 200 },
        { name: 'Wed', visits: 150 },
        { name: 'Thu', visits: 280 },
        { name: 'Fri', visits: 220 },
        { name: 'Sat', visits: 180 },
        { name: 'Sun', visits: 300 },
    ];
    return (
        <>
            <main className="bg-white/70 flex-1 w-full max-w-screen-xl mx-auto flex gap-5 h-lvh p-4">
                <div className="side-nav flex flex-col gap-6">
                    <nav className=" flex flex-col gap-4 bg-white p-4 rounded-2xl">
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"> <MdDashboard /> Dashboard </Link>
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><BsTools />Manage Projects</Link>
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><MdOutlinePersonOutline /> About Me</Link>
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><IoIosLink />Contact Info</Link>
                    </nav>
                    <nav className=" flex flex-col gap-4 bg-white p-4 rounded-2xl">
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><IoChatbox />Check Messages</Link>
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><FaChartBar />Analytics</Link>
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><FaSearch />Preview Site</Link>
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><IoSettingsSharp />Settings</Link>
                    </nav>
                    <nav className=" flex flex-col gap-4 bg-white p-4 rounded-2xl">
                        <Link href={"dashboard"} className="hover:bg-black/40 flex items-center gap-2 text-black p-2 rounded-lg hover:text-white"><HiRefresh />Change Password</Link>
                        <Link href={"dashboard"} className="bg-red-500/40 hover:bg-red-700/80 flex items-center gap-2 text-red-600 p-2 rounded-lg hover:text-white"><TbLogout2 />Logout</Link>
                    </nav>
                </div>
                <div className="flex-1 flex rounded-2xl m-2 gap-4">
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-white shadow-2xl text-black  p-2 pr-4 rounded-2xl flex flex-col gap-8">
                            <h2 className="text-3xl font-bold p-4">👋 Welcome back, Zakaria!</h2>
                            <div className="self-end flex  items-center gap-8">
                                <div className="flex flex-col w-25">
                                    <span className="text-5xl font-extralight self-end"><CountUp end={12} duration={1.5} /></span>
                                    <span className="text-sm font-medium self-center">Project</span>
                                </div>
                                <div className="flex flex-col w-25">
                                    <span className="text-5xl font-extralight self-end"><CountUp end={12} duration={1.5} /></span>
                                    <span className="text-sm font-medium self-center">Site Visits</span>
                                </div>
                            </div>
                        </div>
                         <button className="self-end  bg-indigo-600 px-3 py-2 rounded-xl text-sm cursor-pointer">Add New Project</button>
                        <div className="bg-white shadow-2xl p-4 pl-0 rounded-2xl ">
                            <h3 className="text-xl font-bold my-4 pl-8 text-black">Visit Track</h3>
                            
                             <div className="h-72 ">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data}>
                                        <XAxis dataKey="name"  tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false}   tick={{ fontSize: 12 }}  />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="visits"
                                            stroke="#6366f1" // indigo-500
                                            strokeWidth={2}
                                            dot={{ r: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-2xl text-black p-4 rounded-2xl h-fit">
                        <h4 className="text-xl font-semibold">Recent Activity</h4>
                        <div>
                            <p>Edited ‘E-Commerce App’ <span className="text-gray-400 text-xs">– 2 days ago</span></p>
                            <p>Edited ‘E-Commerce App’ <span className="text-gray-400 text-xs">– 2 days ago</span></p>
                            <p>Edited ‘E-Commerce App’ <span className="text-gray-400 text-xs">– 2 days ago</span></p>
                            <p>Edited ‘E-Commerce App’ <span className="text-gray-400 text-xs">– 2 days ago</span></p>
                        </div>
                    </div>

                </div>

            </main>
        </>
    )
}
export default Dashboard;