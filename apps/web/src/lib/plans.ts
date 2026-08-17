/**
 * Canonical plan feature lists — the single honest source shared by the public
 * Premium page and the in-dashboard subscription panel, so free/paid value is
 * told one way everywhere. Keep this in sync with what the product actually
 * delivers; do not add aspirational features.
 */

/**
 * Free-plan channel cap, for STATIC COPY ONLY (marketing pages, banner text).
 * A mirror of the backend's `Editions.resolveChannelLimit` free branch — the
 * authoritative per-guild number arrives as `data.channelLimit`, so anything
 * rendering a live count must read that instead of this.
 */
export const FREE_CHANNEL_LIMIT = 3;

export const PREMIUM_PLAN_FEATURES = [
  'Unlimited channels',
  'Near-instant publishing',
  'Advanced message filters',
  'Priority support',
];

/** `true` = included (renders a tick), `false` = absent (renders a dash). */
export type PlanValue = string | boolean;

export interface PlanComparisonRow {
  label: string;
  /** Clarifier under the label, where the axis name alone doesn't carry the value. */
  detail?: string;
  free: PlanValue;
  premium: PlanValue;
}

/**
 * Row-aligned free-vs-premium comparison, shared by the public /how-it-works
 * section and the dashboard's free subscription state.
 *
 * Row-aligned rather than two independent bullet lists: side-by-side lists with
 * different lengths and no shared axis leave the reader diffing strings to work
 * out what they'd actually gain, and silently omit what free LOSES (the old
 * lists never said filters are unavailable on free — the absence was implied by
 * a missing bullet). Every row states both sides, so a dash is an explicit "not
 * included" rather than an oversight.
 *
 * The Basic/Near-instant publishing row is a claim about CONTENTION, not
 * configuration: both editions run the same pipeline with the same queue
 * settings, and the free bot's proxy shares one global limiter and egress IP
 * across every free guild. Nothing in the code distinguishes them, so don't
 * "correct" this row by reading apps/proxy.
 */
export const PLAN_COMPARISON: readonly PlanComparisonRow[] = [
  {
    label: 'Announcement channels',
    free: `Up to ${FREE_CHANNEL_LIMIT}`,
    premium: 'Unlimited',
  },
  {
    label: 'Auto-publishing',
    // "within Discord's limits" is load-bearing, not a hedge: the proxy gate drops
    // anything past 10 crossposts/hour/channel, and this row renders on the upgrade
    // screen above the checkout button — čl. 60 st. 2 makes what it says part of the
    // contract. "Every message" stays because it is what contrasts this row with the
    // filters row below it.
    detail: "Every message in an enabled channel, published to followers within Discord's limits",
    free: 'Basic',
    premium: 'Near-instant',
  },
  {
    label: 'Message filters',
    detail: 'Publish only what matches your rules — keyword, mention, author, or webhook',
    free: false,
    premium: true,
  },
  {
    label: 'Support',
    free: 'Standard',
    premium: 'Priority',
  },
];

/**
 * Per-feature upsell copy for premium-gated tabs, rendered by `<LockedFeature>`
 * in place of the tab's content on a free server. Feature-specific rather than
 * the generic PREMIUM_PLAN_FEATURES, which would shrink "everything filters do"
 * down to one bullet at exactly the moment the user is deciding.
 *
 * Keyed by dashboard tab segment, so a key always names a real tab and the page
 * can pass its own segment as the `feature` prop.
 */
export const PREMIUM_FEATURE_BLURBS = {
  filters: {
    label: 'Channel filters',
    description: 'Control exactly which messages get published from each channel',
    benefits: [
      'Filter by keyword, mention, author, or webhook',
      'Allow or block mode per rule',
      'Combine rules with any/all matching',
      'Manage everything from the dashboard',
    ],
  },
} as const;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURE_BLURBS;
