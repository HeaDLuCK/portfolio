import User from "@/Model/user/User";
import UserSectionContent from "@/Model/user/UserSectionContent";

const getContentByUserAndSection = async (token : string , section :string) =>{
  try {
     const user = await User.findOne({
      token: token,
    });
    if (!user) {
        // handle the case where user is not found
        throw new Error('User not found or invalid token');
    }
    // Fetch the content for the user and section
    const content = await UserSectionContent.findOne({
      userId: user?._id,
      section: section
    });
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
}

export default getContentByUserAndSection;
