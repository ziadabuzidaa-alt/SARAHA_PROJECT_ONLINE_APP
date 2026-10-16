import { TokenTypeEnum } from "../common/enums/security.enums.js";
import {
  BadRequestException,
  ForbiddenException,
} from "../common/utils/response/error.response.js";
import { decodeToken } from "../common/utils/security/token.security.js";

export const authentication = (tokenType = TokenTypeEnum.Access) => {
  return async (req, res, next) => {
    try {
      const { authorization } = req.headers;
      if (!authorization) {
        throw BadRequestException({ message: "Missing authorization header" });
      }
      const [schema, credentials] = authorization.split(" ");
      if (!credentials) {
        throw BadRequestException({
          message: "Malformed authorization header",
        });
      }
      switch (schema) {
        case "Basic": {
          const [email, password] =
            Buffer.from(credentials, "base64").toString().split(":") || [];
          req.credentials = await login(
            { email, password },
            `${req.protocol}://${req.host}`,
          );
          break;
        }
        case "Bearer": {
          const { user, decoded } = await decodeToken({
            token: credentials,
            tokenType,
          });
          req.user = user;
          req.decoded = decoded;
          break;
        }
        default:
          throw BadRequestException({
            message: "Unsupported authentication schema",
          });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
};
export const authorization = (accessRoles = []) => {
  return async (req, res, next) => {
    if (!accessRoles.includes(req.user.role)) {
      throw ForbiddenException({ message: "not authorized account" });
    }
    next();
  };
};
