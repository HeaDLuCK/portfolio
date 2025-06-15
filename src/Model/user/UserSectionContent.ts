import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userSectionContentSchema = new mongoose.Schema({
    section: {
        type: String, // e.g., 'hero', 'about', 'contact'
        required: true,
    },
    translations: [
        {
            lang: { type: String, required: true }, // e.g. "en", "fr", "ar", "de"
            heading: String,
            typewriter: [String], // Optional field
            description: String,
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
const UserSectionContent = mongoose.models.UserProject || mongoose.model("UserSectionContent", userSectionContentSchema);
export default UserSectionContent;