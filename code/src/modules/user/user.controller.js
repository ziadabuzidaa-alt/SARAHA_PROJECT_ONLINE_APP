import { Router } from "express";
import {
  coverImages,
  deleteProfileImage,
  logout,
  profile,
  profileImage,
  rotateToken,
  sahareProfile,
  updatePassword,
} from "./user.service.js";
import { successResponce, TokenTypeEnum } from "../../common/index.js";
import * as validators from "./user.vaidation.js";
import {
  authentication,
  authorization,
} from "../../middleware/authentication.middleware.js";
import { endpoint } from "./user.authorization.js";
import { validation } from "../../middleware/validation.middleware.js";
import { localFileUpload } from "../../common/utils/multer/local.multer.js";
import { fileFeildValidation } from "../../common/utils/multer/validation.multer.js";
const router = Router();
router.patch(
  "/profile-image",
  authentication(),
  localFileUpload({
    customPath: "users/profile",
    validation: fileFeildValidation.Image,
    maxSize: 10,
  }).single("attachement"),
  validation(validators.profileImage),
  async (req, res, next) => {
    const result = await profileImage(req.file, req.user);
    return successResponce({
      res,
      message: "profile picture",
      data: { result },
    });
  },
);
router.patch(
  "/cover-image",
  authentication(),
  localFileUpload({
    customPath: "users/coverImages",
    validation: fileFeildValidation.Image,
    maxSize: 10,
  }).array("attachements", 2),
  validation(validators.profileCoverImage),
  async (req, res, next) => {
    const account = await coverImages(req.files, req.user);
    return successResponce({
      res,
      message: "cover picture",
      data: { account },
    });
  },
);
router.patch(
  "/update-password",
  authentication(),
  validation(validators.updatePassword),
  async (req, res, next) => {
    const credintials = await updatePassword(
      req.body,
      req.user,
      `${req.protocol}://${req.host}`,
    );
    return successResponce({
      res,
      message: "password updated successfully",
      data: {...credintials},
    });
  },
);
router.delete(
  "/deleteProfileImage",
  authentication(),
  async (req, res, next) => {
    const result = await deleteProfileImage(req.user);
    return successResponce({
      res,
      message: "profile Image Deleted Successfully",
      data: { result },
    });
  },
);
router.get(
  "/",
  authentication(),
  authorization(endpoint.profile),
  async (req, res, next) => {
    const credintials = await profile(req.user);
    return successResponce({ res, data: credintials });
  },
);
router.get(
  "/:id/share-profile",
  authentication(),
  validation(validators.shareProfile),
  async (req, res, next) => {
    const account = await sahareProfile(req.params.id, req.user);
    return successResponce({ res, data: account });
  },
);
router.post("/logout", authentication(), async (req, res, next) => {
  try {
    const status = await logout(req.body?.flag, req.user, req.decoded);
    return successResponce({ res, status });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/rotate-token",
  authentication(TokenTypeEnum.Refresh),
  async (req, res, next) => {
    try {
      const credentials = await rotateToken(
        req.user,
        req.decoded,
        `${req.protocol}://${req.host}`,
      );
      return successResponce({ res, status: 201, data: credentials });
    } catch (error) {
      next(error);
    }
  },
);
export default router;
