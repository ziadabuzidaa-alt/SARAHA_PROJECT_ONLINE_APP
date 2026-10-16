import mongoose from "mongoose";
import { DB_URI } from "../../config/config.service.js";

export const connectDB = async () => {
  try {
    const db = await mongoose.connect(DB_URI);
    console.log(`DB Connected Successfully`);
  } catch (error) {
    console.log(`Fail To Connect With DB......${error}`);
  }
};
