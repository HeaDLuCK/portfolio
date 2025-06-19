import User from "@/Model/user/User";
import UserFeature from "@/Model/user/UserFeature";

const getFeaturesByUser = async (token : string) =>{
  try {
     const user = await User.findOne({
      token: token,
    });
    if (!user) {
        // handle the case where user is not found
        throw new Error('User not found or invalid token');
    }
    // Fetch the content for the user and section
    const features = await UserFeature.find({
      userId: user?._id,
      section: "feature"
    });
    return features;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
}

export default getFeaturesByUser;
