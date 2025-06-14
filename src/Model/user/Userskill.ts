import mongoose, { Schema } from "mongoose";
var ObjectId = Schema.Types.ObjectId;

const userSkillSchema = new mongoose.Schema({
    title: String,
    icon: {
        type: String,//image or icon for box icon
        value: String
    },
    userId: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });
const Userskill = mongoose.models.UserProject || mongoose.model("UserProject", userSkillSchema);
export default Userskill;