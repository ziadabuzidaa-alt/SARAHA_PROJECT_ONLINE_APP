import { BadRequestException, NotFoundException } from "../../common/index.js";
import {
  create,
  find,
  findOne,
  findOneAndDelete,
} from "../../DB/db.repository.js";
import { messageModel, userModel } from "../../DB/index.js";

export const sendMessage = async (
  receiverID,
  { content = undefined } = {},
  files = [],
  user,
) => {
  const account = await findOne({
    filter: { _id: receiverID, confirmEmail: { $exists: true } },
    model: userModel,
  });
  if (!account) {
    throw BadRequestException({
      message: "Not Marching Account",
    });
  }
  const message = await create({
    model: messageModel,
    data: {
      receiverID,
      attachments: files.map((file) => file.finalPath),
      content,
      senderID: user ? user._id : undefined,
    },
  });
  return message;
};

export const getMessage = async (messageID, user) => {
  const message = await findOne({
    filter: {
      _id: messageID,
      $or: [
        {
          receiverID: user._id,
          senderID: user._id,
        },
      ],
    },
    model: messageModel,
    select: "-senderID",
  });
  if (!message) {
    throw NotFoundException({
      message: "Invalid Message or not authorized ation",
    });
  }
  return message;
};

export const getAllMessages = async (user) => {
  const messages = await find({
    filter: {
      $or: [{ receiverId: user._id }, { senderId: user._id }],
    },
    model: messageModel,
  });
  return messages;
};

export const deleteMessage = async (messageID, user) => {
  const message = await findOneAndDelete({
    filter: {
      _id: messageID,
      receiverID: user._id,
    },
    model: messageModel,
  });
  return message;
};
