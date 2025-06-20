import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userSkillSchema = new mongoose.Schema({
    translations: [
        {
            lang: { type: String, required: true }, // e.g. "en", "fr", "ar", "de"
            title: String,
        }
    ],
    icon: {
        type: String,//image or icon for box icon
        value: String
    },
    userId: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });
const UserSkill = mongoose.models.UserSkill || mongoose.model("UserSkill", userSkillSchema);
export default UserSkill;