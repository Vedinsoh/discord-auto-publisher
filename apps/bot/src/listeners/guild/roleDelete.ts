import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, type Role } from 'discord.js';
import { Services } from 'services/index.js';

// Premium only (see roleCreate).
@ApplyOptions<Listener.Options>({
  event: Events.GuildRoleDelete,
  enabled: config.isPremiumInstance,
})
export class RoleDeleteListener extends Listener {
  public async run(role: Role) {
    await Services.Channel.invalidateGuildRoles(role.guild.id);
  }
}
