import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_SECRET_KEY,
  REFRESH_TOKEN_SECRET_KEY,
  SYSTEM_ACCESS_TOKEN_SECRET_KEY,
  SYSTEM_REFRESH_TOKEN_SECRET_KEY,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "./../../../../config/config.service.js";
import { RoleEnum } from "../../enums/user.enums.js";
import { TokenTypeEnum } from "../../enums/security.enums.js";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "../response/error.response.js";
import { findOne } from "../../../DB/db.repository.js";
import { userModel } from "../../../DB/index.js";
import { randomUUID } from "node:crypto";
import { get, revokeTokenKey, set } from "../../services/redis.services.js";

export const generateToken = async ({
  payload = {},
  secret = ACCESS_TOKEN_SECRET_KEY,
  options = {},
} = {}) => jwt.sign(payload, secret, options);

export const verifyToken = async ({
  token,
  secret = ACCESS_TOKEN_SECRET_KEY,
} = {}) => jwt.verify(token, secret);

export const detectSignatureLevel = async (level) => {
  switch (level) {
    case RoleEnum.ADMIN:
      return {
        accessSignature: SYSTEM_ACCESS_TOKEN_SECRET_KEY,
        refreshSignature: SYSTEM_REFRESH_TOKEN_SECRET_KEY,
      };
    default:
      return {
        accessSignature: ACCESS_TOKEN_SECRET_KEY,
        refreshSignature: REFRESH_TOKEN_SECRET_KEY,
      };
  }
};

export const getTokenSignature = async ({
  tokenType = TokenTypeEnum.Access,
  level,
} = {}) => {
  const { accessSignature, refreshSignature } =
    await detectSignatureLevel(level);
  return tokenType === TokenTypeEnum.Refresh
    ? refreshSignature
    : accessSignature;
};

export const createRevokeToken = async ({ userId, jti, ttl }) => {
  await set({
    key: revokeTokenKey({ userId, jti }),
    value: jti,
    ttl,
  });
};

export const remainingRefreshTtl = (iat) =>
  iat + REFRESH_TOKEN_EXPIRES_IN - Math.floor(Date.now() / 1000);

export const decodeToken = async ({
  token,
  tokenType = TokenTypeEnum.Access,
} = {}) => {
  const decoded = jwt.decode(token);
  if (!decoded?.aud?.length) {
    throw BadRequestException({ message: "Missing token audience" });
  }
  
  const [tokenApproach, level] = decoded.aud;
  if (tokenType !== tokenApproach) {
    throw ConflictException({
      message: `Unexpected token mechanism, expected ${tokenType} but got ${tokenApproach}`,
    });
  }

  const secret = await getTokenSignature({ tokenType: tokenApproach, level });
  let verifiedData;
  try {
    verifiedData = jwt.verify(token, secret);
  } catch (error) {
    throw UnauthorizedException({ message: error.message });
  }

  if (
    verifiedData.jti &&
    (await get(
      revokeTokenKey({ userId: verifiedData.sub, jti: verifiedData.jti }),
    ))
  ) {
    throw UnauthorizedException({ message: "Invalid login session" });
  }

  const user = await findOne({
    model: userModel,
    filter: { _id: verifiedData.sub },
  });
  if (!user) {
    throw NotFoundException({ message: "Not register account" });
  }

  if (
    user.changeCredentialsTime &&
    Math.floor(user.changeCredentialsTime.getTime() / 1000) >= verifiedData.iat
  ) {
    throw UnauthorizedException({ message: "Invalid login session" });
  }

  return { user, decoded: verifiedData };
};

export const createLoginCredentials = async (user, issuer) => {
  const { accessSignature, refreshSignature } = await detectSignatureLevel(
    user.role,
  );
  const jwtid = randomUUID();

  const access_token = await generateToken({
    payload: { sub: user._id },
    secret: accessSignature,
    options: {
      issuer,
      audience: [TokenTypeEnum.Access, user.role],
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      jwtid,
    },
  });

  const refresh_token = await generateToken({
    payload: { sub: user._id },
    secret: refreshSignature,
    options: {
      issuer,
      audience: [TokenTypeEnum.Refresh, user.role],
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      jwtid,
    },
  });

  return { access_token, refresh_token };
};

