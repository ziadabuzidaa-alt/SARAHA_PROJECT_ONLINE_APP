import { create, findOne, findOneAndUpdate } from "../../DB/db.repository.js";
import { redisClient, userModel } from "../../DB/index.js";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "./../../common/utils/response/error.response.js";
import {
  compareHash,
  generateHash,
} from "./../../common/utils/security/hash.security.js";
import { generateEncryption } from "./../../common/utils/security/encryption.security.js";
import {
  createLoginCredentials,
  emailEnum,
  emailEvent,
  ProviderEnums,
  sendEmail,
} from "../../common/index.js";
import { OAuth2Client } from "google-auth-library";
import { createNumberOtp } from "../../common/utils/otp.js";
import {
  baseRevokeTokenKey,
  blockotpKey,
  deleteKey,
  get,
  incr,
  keys,
  maxAttemptotpKey,
  otpKey,
  set,
  ttl,
} from "../../common/services/redis.services.js";
import { templeteEmail } from "../../common/utils/email/templete.email.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import geoip from "geoip-lite";

const sendEmailOtp = async ({
  email,
  subject = emailEnum.confirmEmail,
  title = "Confirm Email",
}) => {
  const code = await createNumberOtp();
  await set({
    key: otpKey({ email, subject }),
    value: await generateHash({ plaintext: `${code}` }),
    ttl: 120,
  });

  emailEvent.emit("sendEmail", async () => {
    await sendEmail({
      to: email,
      subject,
      html: templeteEmail({ code, title }),
    });
    await incr(maxAttemptotpKey({ email }));
  });
};

export const signup = async (inputs) => {
  const { username, email, password, phone, age } = inputs;
  const checkUserExist = await findOne({
    filter: { email },
    model: userModel,
  });
  if (checkUserExist) {
    throw ConflictException({ message: "This Email Exist" });
  }
  const user = await create({
    data: {
      username,
      email,
      password: await generateHash({ plaintext: password }),
      phone: await generateEncryption(phone),
      age,
    },
    model: userModel,
  });

  await sendEmailOtp({ email });

  return user;
};

export const confirmEmail = async (inputs) => {
  const { email, otp } = inputs;
  const account = await findOne({
    filter: {
      email,
      confirmEmail: { $exists: false },
      provider: ProviderEnums.SYSTEM,
    },
    model: userModel,
  });
  if (!account) throw NotFoundException({ message: "No Matching Account" });
  const hashOtp = await get(otpKey({ email }));
  if (!hashOtp) throw NotFoundException({ message: "Expired OTP" });
  if (!(await compareHash({ plaintext: `${otp}`, ciphertext: hashOtp }))) {
    throw ConflictException({ message: "Invalid OTP" });
  }
  account.confirmEmail = new Date();
  await account.save();
  await deleteKey(await keys(otpKey({ email })));
};

export const reSendConfirmEmail = async (inputs) => {
  const { email } = inputs;
  const account = await findOne({
    filter: {
      email,
      confirmEmail: { $exists: false },
      provider: ProviderEnums.SYSTEM,
    },
    model: userModel,
  });
  if (!account) {
    throw NotFoundException({
      message: "No Matching Account",
    });
  }

  const isBlocked = await ttl(blockotpKey({ email }));
  if (isBlocked > 0) {
    throw BadRequestException({
      message: `Sorry We Cannot send anew OTP while are blocked please try after ${isBlocked} seconds`,
    });
  }

  const remaningOtpTTl = await ttl(otpKey({ email }));
  if (remaningOtpTTl > 0) {
    throw BadRequestException({
      message: "Sorry We Cannot send anew OTP while current OTP is active",
    });
  }

  const maxAttempt = Number(await get(maxAttemptotpKey({ email })));
  if (maxAttempt >= 3) {
    await set({
      key: blockotpKey({ email }),
      value: 1,
      ttl: 420,
    });
    await deleteKey([maxAttemptotpKey({ email })]);
    throw BadRequestException({ message: "Soory You Reach at Max Attampet" });
  }

  await sendEmailOtp({ email });
  return;
};

export const resendForgetPasswordCode = async (inputs) => {
  const { email } = inputs;
  const account = await findOne({
    filter: {
      email,
      provider: ProviderEnums.SYSTEM,
      confirmEmail: { $exists: true },
    },
    model: userModel,
  });
  if (!account) {
    throw NotFoundException({
      message: "Invalid Account Info",
    });
  }
  await sendEmailOtp({
    email,
    subject: emailEnum.forget_password,
    title: "Forget Password",
  });
  return;
};

export const verifyForgetPasswordCode = async (inputs) => {
  const { email, otp } = inputs;
  const hashOTP = await get(
    otpKey({ email, subject: emailEnum.forget_password }),
  );
  if (!hashOTP) {
    throw NotFoundException({ message: "Expired OTP" });
  }
  if (!(await compareHash({ plaintext: `${otp}`, ciphertext: hashOTP }))) {
    throw ConflictException({ message: "Invalid OTP" });
  }
  return;
};

export const resetForgetPassword = async (inputs) => {
  const { email, otp, password } = inputs;
  await verifyForgetPasswordCode({ email, otp });
  const user = await findOneAndUpdate({
    filter: {
      email,
      confirmEmail: { $exists: true },
      provider: ProviderEnums.SYSTEM,
    },
    model: userModel,
    update: {
      password: await generateHash({ plaintext: password }),
      changeCredentialsTime: new Date(),
    },
  });
  if (!user) {
    throw NotFoundException({
      message: "not Matched Account",
    });
  }
  const otpKeys = await keys(
    otpKey({ email, subject: emailEnum.forget_password }),
  );
  const tokenKeys = await keys(baseRevokeTokenKey(user._id));
  await deleteKey([...tokenKeys, ...otpKeys]);
  return;
};

const WINDOW_MS = 2 * 60 * 1000;
export const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: async function (req) {
    const geo = geoip.lookup(req.ip);
    return geo?.country === "EG" ? 5 : 3;
  },
  // statusCode: 500,
  // message: "Too many trial",
  legacyHeaders: true,
  standardHeaders: "draft-8",
  requestPropertyName: "ratelimit",
  // skipFailedRequests: true,
  skipSuccessfulRequests: true,
  handler: (req, res, next) => {
    return res.status(429).json({ message: "Too many requests" });
  },
  keyGenerator: (req, res, next) => {
    const ip = ipKeyGenerator(req.ip, 56);
    return `login:${ip}-${req.path}`;
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

export const login = async (inputs, issuer) => {
  const { email, password } = inputs;
  const user = await findOne({
    filter: { email, confirmEmail: { $exists: true } },
    model: userModel,
  });
  if (!user) {
    throw NotFoundException({ message: "Invalid Login Credintials" });
  }
  if (
    !(await compareHash({ plaintext: password, ciphertext: user.password }))
  ) {
    throw NotFoundException({ message: "Invalid Login Credintials" });
  }
  return createLoginCredentials(user, issuer);
};

const verifyGoogleAccount = async (idToken) => {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience:
      "622719223352-2hofa79cr1fbti5v3u196m18spu83jp6.apps.googleusercontent.com",
  });
  const payload = ticket.getPayload();
  if (!payload?.email_verified) {
    throw BadRequestException({ message: "Fail To verify By Google" });
  }
  return payload;
};

export const loginWithGmail = async (idToken, issuer) => {
  const payload = await verifyGoogleAccount(idToken);
  const user = await findOne({
    filter: { email: payload.email, provider: ProviderEnums.GOOGLE },
    model: userModel,
  });
  if (!user) {
    throw NotFoundException({ message: "User Not Found" });
  }
  return await createLoginCredentials(user, issuer);
};

export const signupWithGmail = async (idToken, issuer) => {
  const payload = await verifyGoogleAccount(idToken);

  const checkEmailExist = await findOne({
    filter: { email: payload.email },
    model: userModel,
  });

  if (checkEmailExist) {
    if (checkEmailExist.provider != ProviderEnums.GOOGLE) {
      throw ConflictException({ message: "Invalid Login Provider" });
    }
    return {
      status: 200,
      message: "Done-login",
      credentials: await loginWithGmail(idToken, issuer),
    };
  }
  const user = await create({
    model: userModel,
    data: {
      firstName: payload.given_name,
      lastName: payload.family_name,
      email: payload.email,
      profilePicture: payload.picture,
      confirmEmail: new Date(),
      provider: ProviderEnums.GOOGLE,
    },
  });
  return {
    message: "Done-signup",
    status: 201,
    credentials: await createLoginCredentials(user, issuer),
  };
};
