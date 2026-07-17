// Canonical publish permissions (PUBLISH_PERMISSION_FLAGS in @ap/utils). Always
// list all three rather than a computed missing-subset: when ViewChannel is absent
// Discord's permission math collapses the missing set to just ViewChannel (the
// channel is invisible), which would mislead the user into granting one perm that
// still won't publish. "Ensure the bot has these three" is always correct.
const PUBLISH_PERMISSIONS = ['View Channel', 'Send Messages', 'Manage Messages'];

/**
 * The numbered Discord steps to grant a bot publish permission in a channel.
 * Shared presentational block so the Channel Fix modal and the Channel enable
 * guide can't drift in copy (CONTEXT "Channel Fix affordance" / "Channel enable
 * guide"). Purely presentational — no state.
 */
export function PermissionSteps({ channelName }: { channelName: string }) {
  return (
    <ol className="space-y-1 text-slate-400 text-sm list-decimal list-inside">
      <li>
        Locate the <span className="text-slate-200">#{channelName}</span> channel
      </li>
      <li>Open the channel’s settings</li>
      <li>Go to the Permissions tab</li>
      <li>Select the bot’s role (or add it as a member override)</li>
      <li>
        Enable the following permissions:
        <ul className="ml-4">
          {PUBLISH_PERMISSIONS.map(perm => (
            <li key={perm} className="text-slate-200 text-sm">
              • {perm}
            </li>
          ))}
        </ul>
      </li>
      <li>Save your changes</li>
    </ol>
  );
}
