/* eslint-disable no-empty-function */
/* eslint-disable no-unused-vars */
import { CommandType } from '#types/CommandType';

export class Command {
  constructor(
    public name: string,
    public run: CommandType
  ) {}
}
