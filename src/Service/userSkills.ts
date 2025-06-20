import User from "@/Model/user/User";
import Userskill from "@/Model/user/Userskill";

const getUserSkills = async (token : string) =>{
  try {
     const user = await User.findOne({
      token: token,
    });
    if (!user) {
        // handle the case where user is not found
        throw new Error('User not found or invalid token');
    }
    // Fetch the content for the user and section
    const skills = await Userskill.find({
      userId: user?._id,
    });
    return skills;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
}

export default getUserSkills;
