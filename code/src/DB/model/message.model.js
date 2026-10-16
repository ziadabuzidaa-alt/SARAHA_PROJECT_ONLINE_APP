import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      minlength: 2,
      maxlength: 10000,
      required: function () {
        return !this.attachments.length;
      },
    },
    attachments: [String],
    receiverID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "USER",
      required: true,
    },
    senderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "USER",
    },
  },
  {
    collection: "ROUTE_MESSAGES",
    timestamps: true,
  },
);

export const messageModel =
  mongoose.models.MESSAGE || mongoose.model("MESSAGE", messageSchema);
