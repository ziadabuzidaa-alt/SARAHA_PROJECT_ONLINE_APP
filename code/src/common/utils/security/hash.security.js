import * as argon2 from "argon2";
import { SALT_ROUND } from "../../../../config/config.service.js";
import { compare, genSalt, hash } from "bcrypt";
import { HashApproachEnum } from "./../../enums/security.enums.js";

export const generateHash = async ({
  plaintext,

  salt = SALT_ROUND,
  minor = "b",
  approach = HashApproachEnum.bcrypt,
} = {}) => {
  let hachValue;
  switch (approach) {
    case HashApproachEnum.argon2:
      hachValue = await hash(plaintext);
      break;
    default:
      const generatedSalt = await genSalt(salt, minor);
      hachValue = await hash(plaintext, generatedSalt);
      break;
  }
  return hachValue;
};
export const compareHash = async ({
  plaintext,
  ciphertext,
  approach = HashApproachEnum.bcrypt,
} = {}) => {
  let match = false;
  switch (approach) {
    case HashApproachEnum.argon2:
      match = await argon2.verify(ciphertext, plaintext);
      break;
    default:
      match = await compare(plaintext, ciphertext);
      break;
  }
  return match;
};
