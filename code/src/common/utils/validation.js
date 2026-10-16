import joi from "joi";
import { Types } from "mongoose";

export const generalValidationFields = {
  email: joi.string().email({
    minDomainSegments: 2,
    maxDomainSegments: 3,
    tlds: { allow: ["com", "net"] },
  }),
  password: joi
    .string()
    .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,16}$/)),
  username: joi
    .string()
    .pattern(new RegExp(/^[A-Z]{1}[a-z]{1,24}\s[A-Z]{1}[a-z]{1,24}$/))
    .messages({
      "any.required": "username is required",
      "string.empty": "username cannot be empty",
    }),
  phone: joi.string().pattern(new RegExp(/^(00201|\+201|01)(0|1|2|5)\d{8}$/)),
  confirmPassword: function (path = "password") {
    return joi
      .string()
      .valid(joi.ref(path))
      .messages({ "any.only": "confirmPassword must match password" });
  },
  id: joi.string().custom((value, healper) => {
    return Types.ObjectId.isValid(value) ? true : healper.message("Invalid ID");
  }),
  file: function (validation = []) {
    return joi.object().keys({
      fieldname: joi.string().required(),
      originalname: joi.string().required(),
      encoding: joi.string().required(),
      mimetype: joi
        .string()
        .valid(...Object.values(validation))
        .required(),
      finalPath: joi.string().required(),
      destination: joi.string().required(),
      filename: joi.string().required(),
      path: joi.string().required(),
      size: joi.number().required(),
    });
  },
  otp: joi.string().pattern(new RegExp(/^\d{6}$/)),
  content: joi.string().min(0).max(100000),
  messageID: joi.string().custom((value, healper) => {
    return Types.ObjectId.isValid(value) ? true : healper.message("Invalid ID");
  }),
};
