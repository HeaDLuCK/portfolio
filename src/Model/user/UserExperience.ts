import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userExperienceSchema = new mongoose.Schema({
    company_name: String,
    translations: [
        {
            lang: { type: String, required: true }, // e.g. "en", "fr", "ar", "de"
            position: String,
            description: String
        }
    ],
    date_start: Date,
    date_end: Date,
    userId: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });
const UserExperience = mongoose.models.UserExperience || mongoose.model("UserExperience", userExperienceSchema);
export default UserExperience;