import { Router } from "express";
import {
  decodeToken,
  fileFeildValidation,
  localFileUpload,
  successResponce,
  TokenTypeEnum,
} from "../../common/index.js";
import { validation } from "./../../middleware/validation.middleware.js";
import * as validators from "./message.validation.js";
import {
  deleteMessage,
  getAllMessages,
  getMessage,
  sendMessage,
} from "./message.service.js";
import { authentication } from "./../../middleware/authentication.middleware.js";
const router = Router({ caseSensitive: true, strict: true, mergeParams: true });

router.post(
  "/:receiverID",
  async (req, res, next) => {
    if (req.headers.authorization) {
      const { user, decoded } = await decodeToken({
        token: req.headers.authorization.split(" ")[1],
        tokenType: TokenTypeEnum.Access,
      });
      req.user = user;
      req.decoded = decoded;
    }
    next();
  },
  localFileUpload({
    customPath: "messages/images",
    validation: fileFeildValidation.Image,
    maxSize: 2,
  }).array("attachments", 2),
  validation(validators.sendMessage),
  async (req, res, next) => {
    const message = await sendMessage(
      req.params.receiverID,
      req.body,
      req.files,
      req.user,
    );
    return successResponce({
      res,
      message: "MessageSent",
      status: 201,
      data: { message },
    });
  },
);
router.get(
  "/getMessge/:receiverID",
  authentication(),
  validation(validators.getMessage),
  async (req, res, next) => {
    const message = await getMessage(req.params.receiverID, req.user);
    return successResponce({
      res,
      status: 200,
      data: {
        message,
      },
    });
  },
);
router.get("/getAllMessages", authentication(), async (req, res, next) => {
  const messages = await getAllMessages(req.user);
  return successResponce({
    res,
    status: 200,
    data: {
      messages,
    },
  });
});
router.delete(
  "/:receiverID",
  authentication(),
  validation(validators.getMessage),
  async (req, res, next) => {
    const messages = await deleteMessage(req.params.receiverID, req.user);
    return successResponce({
      res,
      status: 200,
      data: {
        messages,
      },
    });
  },
);
export default router;
