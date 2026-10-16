import crypto from "node:crypto";
import {
  ENC_SECRET_KEY,
  IV_LENGTH,
} from "./../../../../config/config.service.js";
export const generateEncryption = async (plaintext) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipherIV = crypto.createCipheriv("aes-256-cbc", ENC_SECRET_KEY, iv);
  let cipherText = cipherIV.update(plaintext, "utf-8", "hex");
  cipherText += cipherIV.final("hex");
  return `${iv.toString("hex")}:${cipherText}`;
};

export const generateDecryption = async (cipherText) => {
  const [iv, encryptedData] = cipherText.split(":") || [];
  const ivLIkeBinary = Buffer.from(iv, "hex");
  let decipherIv = crypto.createDecipheriv(
    "aes-256-cbc",
    ENC_SECRET_KEY,
    ivLIkeBinary,
  );
  let plaintext = decipherIv.update(encryptedData, "hex", "utf-8");
  plaintext += decipherIv.final("utf-8");
  return plaintext;
};
