import express, { Request, Response, Router } from 'express';

import { Services } from '@/services';
import { handleServiceResponse, validateRequest } from '@/utils/httpHandlers';
import { Validations } from '@/utils/validation';

export const Blacklist: Router = (() => {
  const router = express.Router();

  // TODO get blacklisted guilds info
  // router.get('/:id', validateRequest(Validations.snowflakeId), async (req: Request, res: Response) => {
  //   const guildId = req.params.id;
  //   const guild
  //   const serviceResponse = await Services.Crosspost.findById(guildId);
  //   handleServiceResponse(serviceResponse, res);
  // });

  // // TODO add a guild to the blacklist
  // router.post('/:id', validateRequest(Validations.snowflakeId), async (req: Request, res: Response) => {
  //   const guildId = req.params.id;
  //   const serviceResponse = await Services.Crosspost.findById(guildId);
  //   handleServiceResponse(serviceResponse, res);
  // });

  // // TODO delete a guild from the blacklist
  // router.delete('/:id', validateRequest(Validations.snowflakeId), async (req: Request, res: Response) => {
  //   const guildId = req.params.id;
  //   const serviceResponse = await Services.Crosspost.findById(guildId);
  //   handleServiceResponse(serviceResponse, res);
  // });

  return router;
})();
