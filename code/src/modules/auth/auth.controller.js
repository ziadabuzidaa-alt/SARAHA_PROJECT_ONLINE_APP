import { Router } from "express";
import {
  confirmEmail,
  login,
  loginLimiter,
  reSendConfirmEmail,
  resendForgetPasswordCode,
  resetForgetPassword,
  signup,
  signupWithGmail,
  verifyForgetPasswordCode,
} from "./auth.service.js";
import { successResponce } from "./../../common/utils/response/success.response.js";
import * as validators from "./auth.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication } from "../../middleware/authentication.middleware.js";
import { deleteKey } from "../../common/services/redis.services.js";
const router = Router();

router.post(
  "/signup",
  validation(validators.signup),
  async (req, res, next) => {
    const result = await signup(req.body);
    return successResponce({
      res,
      message: "Done-Signup",
      status: 201,
      data: { result },
    });
  },
);
router.patch(
  "/confirm-email",
  validation(validators.confirmEmail),
  async (req, res, next) => {
    await confirmEmail(req.body);
    return successResponce({
      res,
    });
  },
);
router.patch(
  "/re-Send-confirm-email",
  validation(validators.reSendConfirmEmail),
  async (req, res, next) => {
    await reSendConfirmEmail(req.body);
    return successResponce({
      res,
    });
  },
);
router.post(
  "/re-Send-Forgot-password-OTP",
  validation(validators.resendForgetPasswordCode),
  async (req, res, next) => {
    await resendForgetPasswordCode(req.body);
    return successResponce({
      res,
    });
  },
);
router.patch(
  "/verify-Forgot-password-OTP",
  validation(validators.confirmEmail),
  async (req, res, next) => {
    await verifyForgetPasswordCode(req.body);
    return successResponce({
      res,
    });
  },
);
router.patch(
  "/reset-Forgot-password",
  validation(validators.resetForgetPasswordCode),
  async (req, res, next) => {
    await resetForgetPassword(req.body);
    return successResponce({
      res,
    });
  },
);

router.post(
  "/login",
  loginLimiter,
  validation(validators.login),
  async (req, res, next) => {
    const credintials = await login(req.body, `${req.protocol}://${req.host}`);
    await deleteKey(`${req.ip}-${req.path}`);
    return successResponce({
      res,
      data: { ...credintials },
    });
  },
);
router.post("/signup/gmail", async (req, res, next) => {
  const { status, message, credentials } = await signupWithGmail(
    req.body.idToken,
    `${req.protocol}://${req.host}`,
  );
  return successResponce({
    res,
    status,
    message,
    data: { ...credentials },
  });
});
export default router;
