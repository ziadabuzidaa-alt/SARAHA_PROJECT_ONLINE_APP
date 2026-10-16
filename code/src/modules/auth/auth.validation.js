import Joi from "joi";
import { generalValidationFields } from "../../common/utils/validation.js";

export const login = {
  body: Joi.object()
    .keys({
      email: generalValidationFields.email.required(),
      password: generalValidationFields.password.required(),
    })
    .required(),
};

export const signup = {
  body: login.body
    .append({
      username: generalValidationFields.username.required(),
      phone: generalValidationFields.phone.required(),
      confirmPassword: generalValidationFields.confirmPassword().required(),
    })
    .required(),
};
export const reSendConfirmEmail = {
  body: Joi.object()
    .keys({
      email: generalValidationFields.email.required(),
    })
    .required(),
};
export const resendForgetPasswordCode = {
  body: Joi.object()
    .keys({
      email: generalValidationFields.email.required(),
    })
    .required(),
};
export const confirmEmail = {
  body: reSendConfirmEmail.body
    .append()
    .keys({
      otp: generalValidationFields.otp.required(),
    })
    .required(),
};
export const resetForgetPasswordCode = {
  body: confirmEmail.body
    .append()
    .keys({
      password: generalValidationFields.password.required(),
      confirmPassword: generalValidationFields.confirmPassword().required(),
    })
    .required(),
};

