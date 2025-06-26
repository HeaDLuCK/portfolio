import mongoose, { Schema } from "mongoose";

const UserSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  birthday: Date,
  email: String,
  phone: String,
  nationality: String,
  token: String,
  languages: [
    {
      language: String,
      level: String
    }
  ],
  websites:[
    {
      platform:String,
      link:String
    }
  ]
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;