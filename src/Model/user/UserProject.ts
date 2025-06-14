import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userProjectSchema = new mongoose.Schema({
  title: String,
  description: String,
  url: String,
  img_path: String,
  userId: {
    type: ObjectId,
    ref: 'User'
  },
}, { timestamps: true });
const UserProject = mongoose.models.UserProject || mongoose.model("UserProject", userProjectSchema);
export default UserProject;