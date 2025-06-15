
import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userEducationSchema = new mongoose.Schema({
    date_start: Date,
    date_end: Date,
    translations: [
        {
            lang: { type: String, required: true }, // e.g. "en", "fr", "ar", "de"
            institution: String,
            field_of_study: String,
            description: String
        }
    ],
    userId: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });
const UserEducationSchema = mongoose.models.UserEducationSchema || mongoose.model("UserEducationSchema", userEducationSchema);
export default UserEducationSchema;