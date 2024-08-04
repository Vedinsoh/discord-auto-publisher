import type { Message } from 'discord.js';
import client from '#client';
import type { CommandNames } from '#types/AdminCommandTypes';

/**
 * Handles the admin commands
 * @param message Message data
 */
const handle = (message: Message) => {
  // Get the command name and argument
  const [commandName, argument] = message.content //
    .toLowerCase()
    .split(/ +/g)
    .splice(0, 2);

  // Get the command and execute it
  const command = client.commands.get(commandName as CommandNames);
  if (command) {
    command(message, argument);
  }
};

export const AdminCommands = { handle };
