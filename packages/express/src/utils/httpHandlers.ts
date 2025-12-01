/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import type { ServiceResponse } from '@ap/types';
import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ZodError, ZodSchema } from 'zod';

export const handleServiceResponse = (
  serviceResponse: ServiceResponse<any>,
  response: Response
) => {
  return response.status(serviceResponse.statusCode).send(serviceResponse);
};

export const validateRequest =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (err) {
      const zodError = err as ZodError<any>;
      const errorMessage = `Invalid input: ${zodError.errors.map((e: any) => e.message).join(', ')}`;
      const statusCode = StatusCodes.BAD_REQUEST;
      res
        .status(statusCode)
        .send(new ServiceResponseImpl<null>(ResponseStatus.Failed, errorMessage, null, statusCode));
    }
  };
