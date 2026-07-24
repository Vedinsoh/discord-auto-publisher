import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, type Role } from 'discord.js';
import { Services } from 'services/index.js';

// Premium only: filters (and their role picker) are a premium feature, so the
// free bot must not ping the backend on every role event across its guild base.
@ApplyOptions<Listener.Options>({
  event: Events.GuildRoleCreate,
  enabled: config.isPremiumInstance,
})
export class RoleCreateListener extends Listener {
  public async run(role: Role) {
    await Services.Channel.invalidateGuildRoles(role.guild.id);
  }
}
