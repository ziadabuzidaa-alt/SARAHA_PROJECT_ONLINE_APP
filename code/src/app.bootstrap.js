import { NODE_ENV, port } from "../config/config.service.js";
import { globalErrorHandling } from "./common/utils/response/error.response.js";
import { connectDB } from "./DB/connection.db.js";
import { authRouter, messageRouter, userRouter } from "./modules/index.js";
import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { authinticateRedisDB, redisClient } from "./DB/redis.connection.db.js";
import { sendEmail } from "./common/index.js";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import axios from "axios";
import geoip from "geoip-lite";
import morgan from "morgan";
import chalk from "chalk";
async function bootstrap() {
  const fromWhere = async (ip) => {
    try {
      const response = await axios.get(`https://ipapi.co/${ip}/json`);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };
  const app = express();
  //convert buffer data
  app.set("trust proxy", true);
  const WINDOW_MS = 2 * 60 * 1000;
  const limmeter = rateLimit({
    windowMs: WINDOW_MS,
    limit: async function (req) {
      const geo = geoip.lookup(req.ip);
      return geo?.country === "EG" ? 5 : 3;
    },
    legacyHeaders: true,
    standardHeaders: "draft-8",
    requestPropertyName: "rateLimit",
    skipSuccessfulRequests: true,
    handler: function (req, res, next) {
      return res.status(429).json({
        message: "Too Many Requests",
      });
    },
    keyGenerator: (req, res, next) => {
      const ip = ipKeyGenerator(req.ip, 56);
      return `${ip}-${req.path}`;
    },
    store: {
      localKeys: false,

      async increment(key) {
        const redisKey = `rl:${key}`;
        const [totalHits, ttlMs] = await redisClient
          .multi()
          .incr(redisKey)
          .pTTL(redisKey)
          .exec();

        let remainingMs = ttlMs;
        if (remainingMs < 0) {
          await redisClient.pExpire(redisKey, WINDOW_MS);
          remainingMs = WINDOW_MS;
        }

        return {
          totalHits,
          resetTime: new Date(Date.now() + remainingMs),
        };
      },

      async decrement(key) {
        const redisKey = `rl:${key}`;
        if (await redisClient.exists(redisKey)) {
          await redisClient.decr(redisKey);
        }
      },

      async resetKey(key) {
        await redisClient.del(`rl:${key}`);
      },
    },
  });
  app.use(cors(), helmet(), limmeter, express.json());
  app.use(morgan("dev"));

  // DB
  await connectDB();
  await authinticateRedisDB();
  // email
  await sendEmail({
    to: "moaliziad@gmail.com",
    cc: ["zyadtltabwzydalhmamdh@gmail.com"],
    bcc: ["zizotalat023@gmail.com"],
    subject: "TEST",
    html: `<!DOCTYPE html>
                <html>
                <head>
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"></head>
                <style type="text/css">
                body{background-color: #88BDBF;margin: 0px;}
                </style>
                <body style="margin:0px;"> 
                <table border="0" width="50%" style="margin:auto;padding:30px;background-color: #F3F3F3;border:1px solid #630E2B;">
                <tr>
                <td>
                <table border="0" width="100%">
                <tr>
                <td>
                <h1>
                    <img width="100px" src="https://res.cloudinary.com/ddajommsw/image/upload/v1670702280/Group_35052_icaysu.png"/>
                </h1>
                </td>
                <td>
                <p style="text-align: right;"><a href="http://localhost:4200/#/" target="_blank" style="text-decoration: none;">View In Website</a></p>
                </td>
                </tr>
                </table>
                </td>
                </tr>
                <tr>
                <td>
                <table border="0" cellpadding="0" cellspacing="0" style="text-align:center;width:100%;background-color: #fff;">
                <tr>
                <td style="background-color:#630E2B;height:100px;font-size:50px;color:#fff;">
                <img width="50px" height="50px" src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703716/Screenshot_1100_yne3vo.png">
                </td>
                </tr>
                <tr>
                <td>
                <h1 style="padding-top:25px; color:#630E2B">Confirmation Email</h1>
                </td>
                </tr>
                <tr>
                <td>
                <p style="padding:0px 100px;">
                </p>
                </td>
                </tr>
                <tr>
                <td>
                <p style="margin:10px 0px 30px 0px;border-radius:4px;padding:10px 20px;border: 0;color:#fff;background-color:#630E2B; ">2026</p>
                </td>
                </tr>
                </table>
                </td>
                </tr>
                <tr>
                <td>
                <table border="0" width="100%" style="border-radius: 5px;text-align: center;">
                <tr>
                <td>
                <h3 style="margin-top:10px; color:#000">Stay in touch</h3>
                </td>
                </tr>
                <tr>
                <td>
                <div style="margin-top:20px;">

                <a href="${process.env.facebookLink}" style="text-decoration: none;"><span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
                <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" width="50px" hight="50px"></span></a>
                
                <a href="${process.env.instegram}" style="text-decoration: none;"><span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
                <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" width="50px" hight="50px"></span>
                </a>
                
                <a href="${process.env.twitterLink}" style="text-decoration: none;"><span class="twit" style="padding:10px 9px;;color:#fff;border-radius:50%;">
                <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" width="50px" hight="50px"></span>
                </a>

                </div>
                </td>
                </tr>
                </table>
                </td>
                </tr>
                </table>
                </body>
                </html>`,
  });
  //application routing
  app.get("/", (req, res) => res.send("Hello World!"));
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/uploads", express.static(resolve("../uploads")));
  app.use("/message", messageRouter);

  //invalid routing
  app.use("{/*dummy}", (req, res) => {
    return res.status(404).json({ message: "Invalid application routing" });
  });

  //error-handling
  app.use(globalErrorHandling);

  app.listen(port, () =>
    console.log(
      chalk.bgGreen(
        chalk.hex("#FFA500")(`Server is Running on port....${port}`),
      ),
    ),
  );
}
export default bootstrap;
