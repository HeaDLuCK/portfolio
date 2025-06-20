import User from "@/Model/user/User";
import UserExperience from "@/Model/user/UserExperience";

const getUserExperience = async (token : string) =>{
  try {
     const user = await User.findOne({
      token: token,
    });
    if (!user) {
        // handle the case where user is not found
        throw new Error('User not found or invalid token');
    }
    // Fetch the content for the user and section
    const experiences = await UserExperience.find({
      userId: user?._id,
    });
    return experiences;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
}

export default getUserExperience;
