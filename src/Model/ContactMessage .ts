import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  comment: String,
}, { timestamps: true });
const ContactMessage = mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema);
export default ContactMessage;