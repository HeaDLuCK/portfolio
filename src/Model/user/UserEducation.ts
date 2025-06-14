
import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const UserSchema = new mongoose.Schema({
    date_start: Date,
    date_end: Date,
    institution: String,
    field_of_study: String,
    description: String,
    userId: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;