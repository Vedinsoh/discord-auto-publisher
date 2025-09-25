import { ResponseStatus, ServiceResponse } from 'data/models/serviceResponse.js';
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
      console.log('params', req.params);
      console.log('query', req.query);
      console.log('body', req.body);

      console.log(err);

      const errorMessage = `Invalid input: ${(err as ZodError).errors.map(e => e.message).join(', ')}`;
      const statusCode = StatusCodes.BAD_REQUEST;
      res
        .status(statusCode)
        .send(new ServiceResponse<null>(ResponseStatus.Failed, errorMessage, null, statusCode));
    }
  };
