import joi from "joi";
import { generalValidationFields } from "./../../common/utils/validation.js";
import { fileFeildValidation } from "../../common/index.js";
import { Types } from "mongoose";
export const sendMessage = {
  params: joi
    .object()
    .keys({
      receiverID: generalValidationFields.id.required(),
    })
    .required(),
  body: joi.object().keys({
    content: generalValidationFields.content,
  }),
  files: joi
    .array()
    .items(generalValidationFields.file(fileFeildValidation.Image))
    .max(2),
};

export const getMessage = {
  params: joi
    .object()
    .keys({
      receiverID: generalValidationFields.messageID.required(),
    })
    .required(),
};
