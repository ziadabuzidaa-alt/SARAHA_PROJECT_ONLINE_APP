import { createClient } from "redis";
import { REDIS_URI } from "../../config/config.service.js";

export const redisClient = createClient({
  url: REDIS_URI,
});

export const authinticateRedisDB = async () => {
  try {
    await redisClient.connect();
    console.log(`REDIS_DB Connected Successfully`);
  } catch (error) {
    console.log(`Fail To connect Redis_DB`);
  }
};
