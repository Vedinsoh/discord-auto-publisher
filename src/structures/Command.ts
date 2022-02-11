import { CommandType } from '#types/CommandTypes';

export class Command {
  constructor(
    public name: string,
    public run: CommandType
  ) {}
}
