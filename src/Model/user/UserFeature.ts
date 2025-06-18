import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userFeatureSchema = new mongoose.Schema({
    section: {
        type: String, // e.g., 'hero', 'about', 'contact'
        required: true,
    },
    translations: [
        {
            lang: { type: String, required: true }, // e.g. "en", "fr", "ar", "de"
            title: String,
            description: String,
        }
    ],
    order: { type: Number, default: 0 },
    userId: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });
const UserFeature = mongoose.models.UserFeature || mongoose.model("UserFeature", userFeatureSchema);
export default UserFeature;