import { resolve } from "node:path";
import {
  BadRequestException,
  compareHash,
  ConflictException,
  createLoginCredentials,
  generateDecryption,
  generateHash,
  LogOutEnum,
  NotFoundException,
  ProviderEnums,
  remainingRefreshTtl,
  RoleEnum,
} from "../../common/index.js";
import { findOne, findOneAndUpdate } from "../../DB/db.repository.js";
import { tokenModel, userModel } from "../../DB/index.js";
import { unlink } from "node:fs/promises";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../../../config/config.service.js";
import {
  baseRevokeTokenKey,
  deleteKey,
  keys,
  revokeTokenKey,
  set,
} from "../../common/services/redis.services.js";
export const createRevokeToken = async ({ userId, jti, ttl }) => {
  await set({
    key: revokeTokenKey({ userId, jti }),
    value: jti,
    ttl,
  });
};
export const profile = async (user) => {
  return user;
};
export const logout = async (flag, user, { jti, iat, sub }) => {
  let status = 200;

  switch (flag) {
    case LogOutEnum.ALL:
      user.changeCredentialsTime = new Date();
      await user.save();
      await deleteKey(await keys(`${baseRevokeTokenKey(sub)}::`));
      break;

    default: {
      const ttl = remainingRefreshTtl(iat);
      if (ttl > 0) {
        await createRevokeToken({ userId: sub, jti, ttl });
      }
      status = 201;
      break;
    }
  }

  return status;
};
export const updatePassword = async (inputs, user, issuer) => {
  const { oldPassword, password } = inputs;

  if (user.provider !== ProviderEnums.SYSTEM) {
    throw BadRequestException({ message: "Invalid Provider" });
  }

  if (
    !(await compareHash({ plaintext: oldPassword, ciphertext: user.password }))
  ) {
    throw BadRequestException({ message: "Invalid old Password" });
  }

  for (const hash of user.oldPassword ?? []) {
    if (await compareHash({ plaintext: password, ciphertext: hash })) {
      throw BadRequestException({
        message: "This Password already used before",
      });
    }
  }

  const account = await findOneAndUpdate({
    model: userModel,
    filter: { _id: user._id },
    update: {
      password: await generateHash({ plaintext: password }),
      changeCredentialsTime: new Date(),
      $push: { oldPassword: user.password },
    },
  });
  if (!account) {
    throw BadRequestException({ message: "Not Matched Account" });
  }
  const tokenKeys = await keys(baseRevokeTokenKey(user._id));
  if (tokenKeys.length) await deleteKey(tokenKeys);
  return createLoginCredentials(account, issuer);
};

export const rotateToken = async (user, { sub, jti, iat }, issuer) => {
  if ((iat + ACCESS_TOKEN_EXPIRES_IN) * 1000 > Date.now() + 30000) {
    throw ConflictException({ message: "Current access token still valid" });
  }

  const ttl = remainingRefreshTtl(iat);
  if (ttl > 0) {
    await createRevokeToken({ userId: sub, jti, ttl });
  }

  return await createLoginCredentials(user, issuer);
};
export const profileImage = async (file, user) => {
  if (user.profilePicture) {
    user.gallery.push(user.profilePicture);
  }
  user.profilePicture = file.finalPath;
  await user.save();
  return user;
};
export const deleteProfileImage = async (user) => {
  if (!user.profilePicture) {
    throw BadRequestException({ message: "No profile picture to delete" });
  }
  await unlink(resolve("..", user.profilePicture));
  user.profilePicture = undefined;
  await user.save();
  return user;
};
export const coverImages = async (files, user) => {
  const totalImages = user.coverPictures.length + files.length;
  if (totalImages !== 2) {
    throw BadRequestException({
      message: "totalImages must be equal only two images",
    });
  }
  user.coverPictures.push(...files.map((file) => file.finalPath));
  await user.save();
  return user;
};
export const sahareProfile = async (id, user) => {
  const account = await findOne({
    model: userModel,
    filter: { _id: id },
    select:
      user.role === RoleEnum.ADMIN ? "-password" : "-password -visitCount",
  });
  if (!account) {
    throw NotFoundException({ message: "account Not Found" });
  }
  account.phone = await generateDecryption(account.phone);
  await userModel.updateOne({ _id: id }, { $inc: { visitCount: 1 } });
  return { account };
};
