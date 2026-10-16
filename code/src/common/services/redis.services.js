import { redisClient } from "../../DB/redis.connection.db.js";
import { emailEnum } from "../enums/email.enum.js";
export const baseRevokeTokenKey = (userId) => {
  return `RevokeToken::${userId}`;
};

export const revokeTokenKey = ({ userId, jti }) => {
  return `${baseRevokeTokenKey(userId.toString())}::${jti}`;
};
export const otpKey = ({ email, subject = emailEnum.confirmEmail }) => {
  return `OTP::User::${email}::${subject}`;
};
export const maxAttemptotpKey = ({ email, subject }) => {
  return `${otpKey({ email, subject })}::MaxTrial`;
};
export const blockotpKey = ({ email, subject }) => {
  return `${otpKey({ email, subject })}::block`;
};
export const set = async ({ key, value, ttl } = {}) => {
  try {
    let data = typeof value === "string" ? value : JSON.stringify(value);
    return ttl
      ? await redisClient.set(key, data, { EX: ttl })
      : await redisClient.set(key, data);
  } catch (error) {
    console.log(`Fail in redis set operation ${error}`);
  }
};

export const update = async ({ key, value, ttl } = {}) => {
  try {
    if (!(await redisClient.exists(key))) return 0;
    return await set({ key, value, ttl });
  } catch (error) {
    console.log(`Fail in redis update operation ${error}`);
  }
};

export const get = async (key) => {
  try {
    const data = await redisClient.get(key);
    try {
      return JSON.parse(data);
    } catch (error) {
      return data;
    }
  } catch (error) {
    console.log(`Fail in redis get operation ${error}`);
  }
};

export const ttl = async (key) => {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    console.log(`Fail in redis ttl operation ${error}`);
  }
};

export const exists = async (key) => {
  try {
    return await redisClient.exists(key);
  } catch (error) {
    console.log(`Fail in redis exists operation ${error}`);
  }
};
export const incr = async (key) => {
  try {
    return await redisClient.incr(key);
  } catch (error) {
    console.log(`Fail in redis incr operation ${error}`);
  }
};

export const expire = async ({ key, ttl } = {}) => {
  try {
    return await redisClient.expire(key, ttl);
  } catch (error) {
    console.log(`Fail in redis expire operation ${error}`);
  }
};

export const mGet = async (keys = []) => {
  try {
    if (!keys.length) return 0;
    return await redisClient.mGet(keys);
  } catch (error) {
    console.log(`Fail in redis mGet operation ${error}`);
  }
};

export const keys = async (prefix) => {
  try {
    return await redisClient.keys(`${prefix}*`);
  } catch (error) {
    console.log(`Fail in redis keys operation ${error}`);
  }
};

export const deleteKey = async (key) => {
  try {
    if (!key || !key.length) return 0;
    return await redisClient.del(key);
  } catch (error) {
    console.log(`Fail in redis del operation ${error}`);
  }
};
