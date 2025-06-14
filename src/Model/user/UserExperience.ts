import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userExperienceSchema = new mongoose.Schema({
    company_name: String,
    position: String,
    date_start: Date,
    date_end: Date,
    userId: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });
const UserExperience = mongoose.models.User || mongoose.model("UserExperience", userExperienceSchema);
export default UserExperience;