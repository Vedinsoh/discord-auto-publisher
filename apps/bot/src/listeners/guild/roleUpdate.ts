import { config } from '@ap/config';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, type Role } from 'discord.js';
import { Services } from 'services/index.js';

// Premium only (see roleCreate). Explicit `name` because the permissions store
// already has a `roleUpdate` piece (permission recompute) — Sapphire piece
// names are unique per store, so a second file named roleUpdate would collide.
@ApplyOptions<Listener.Options>({
  name: 'roleUpdateRoleCache',
  event: Events.GuildRoleUpdate,
  enabled: config.isPremiumInstance,
})
export class RoleUpdateRoleCacheListener extends Listener {
  public async run(_oldRole: Role, newRole: Role) {
    await Services.Channel.invalidateGuildRoles(newRole.guild.id);
  }
}
