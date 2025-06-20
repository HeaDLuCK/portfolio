import User from "@/Model/user/User";
import UserEducation from "@/Model/user/UserEducation";

const getUserEducation = async (token : string) =>{
  try {
     const user = await User.findOne({
      token: token,
    });
    if (!user) {
        // handle the case where user is not found
        throw new Error('User not found or invalid token');
    }
    // Fetch the content for the user and section
    const education = await UserEducation.find({
      userId: user?._id,
    });
    return education;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
}

export default getUserEducation;
