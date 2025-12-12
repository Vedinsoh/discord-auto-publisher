import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ZodError, ZodType } from 'zod';

/**
 * Standard API response format
 */
export type APIResponse<T = object> = {
  status: number;
  data?: T;
  message: string;
};

/**
 * HTTP error with status code
 */
export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

/**
 * Create HTTP error with status code
 * @param message Error message
 * @param statusCode HTTP status code
 * @returns HttpError instance
 */
export const createHttpError = (
  message: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR
): HttpError => {
  return new HttpError(message, statusCode);
};

/**
 * Extract status code from error
 * @param error Error object
 * @param defaultStatusCode Default status code if none found
 * @returns HTTP status code
 */
export const getErrorStatusCode = (
  error: unknown,
  defaultStatusCode: number = StatusCodes.INTERNAL_SERVER_ERROR
): number => {
  if (error instanceof HttpError) {
    return error.statusCode;
  }
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }
  return defaultStatusCode;
};

/**
 * Extract error message from error
 * @param error Error object
 * @param defaultMessage Default message if none found
 * @returns Error message
 */
export const getErrorMessage = (
  error: unknown,
  defaultMessage: string = 'Internal server error'
): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
};

/**
 * Send error response
 * @param res Express response object
 * @param error Error object
 * @param defaultMessage Default error message
 * @param defaultStatusCode Default status code
 */
export const sendErrorResponse = (
  res: Response,
  error: unknown,
  defaultMessage: string = 'Internal server error',
  defaultStatusCode: number = StatusCodes.INTERNAL_SERVER_ERROR
): void => {
  const statusCode = getErrorStatusCode(error, defaultStatusCode);
  const message = getErrorMessage(error, defaultMessage);
  res.status(statusCode).json({
    status: statusCode,
    message,
  });
};

export const validateRequest =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (err) {
      const zodError = err as ZodError<unknown>;
      const errorMessage = `Invalid input: ${zodError.issues.map((e: unknown) => (e as { message: string }).message).join(', ')}`;
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: errorMessage,
      });
    }
  };
