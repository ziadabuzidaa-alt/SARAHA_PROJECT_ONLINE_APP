import multer from "multer";
import { NODE_ENV } from "../../../../config/config.service.js";

export const globalErrorHandling = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  let status = error.cause?.status ?? 500;
  if (error instanceof multer.MulterError) {
    status = 400;
  }
  if (status >= 500) {
    console.error(error);
  }
  return res.status(status).json({
    error_message:
      status === 500
        ? "something went wrong"
        : (error.message ?? "something went wrong"),
    extra: error.cause?.extra,
    stack: NODE_ENV === "development" ? error.stack : undefined,
  });
};
export const ErrorException = ({
  message = "Fail",
  status = 400,
  extra = undefined,
} = {}) => {
  throw new Error(message, { cause: { status, extra } });
};

export const ConflictException = ({ message = "Conflict", extra } = {}) => {
  return ErrorException({ message, status: 409, extra });
};
export const UnauthorizedException = ({
  message = "Unauthorized",
  extra,
} = {}) => {
  return ErrorException({ message, status: 401, extra });
};
export const ForbiddenException = ({ message = "Forbidden", extra } = {}) => {
  return ErrorException({ message, status: 403, extra });
};
export const NotFoundException = ({ message = "NotFound", extra } = {}) => {
  return ErrorException({ message, status: 404, extra });
};
export const BadRequestException = ({
  message = "Bad Request",
  extra,
} = {}) => {
  return ErrorException({ message, status: 400, extra });
};
