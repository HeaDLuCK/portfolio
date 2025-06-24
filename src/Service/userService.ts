import User from "@/Model/user/User";

const getUserInfo = async (token : string) =>{
  try {
     const user = await User.findOne({
      token: token,
    });
    if (!user) {
        // handle the case where user is not found
        throw new Error('User not found or invalid token');
    }
    return user;
  } catch (error) {
    console.error('Error fetching content:', error);
    throw error;
  }
}

export default getUserInfo;
