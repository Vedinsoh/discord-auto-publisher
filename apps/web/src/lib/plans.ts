/**
 * Plan copy for the /premium page and the dashboard's subscription panel. It renders
 * above the checkout button, and čl. 60 st. 2 makes what it says part of the contract.
 */

export const PREMIUM_PLAN_FEATURES = [
  'Unlimited channels',
  'Dedicated publishing capacity',
  'Advanced message filters',
  'Priority support',
];

/** `true` renders a tick, `false` a dash. */
export type PlanValue = string | boolean;

export interface PlanComparisonRow {
  label: string;
  detail?: string;
  free: PlanValue;
  premium: PlanValue;
}

/**
 * čl. 60 st. 2 makes the publishing row a contract term. It holds because each edition
 * runs its own proxy instance and queue, so premium never queues behind free.
 */
export const planComparison = (freeChannelLimit: number): readonly PlanComparisonRow[] => [
  {
    label: 'Announcement channels',
    free: `Up to ${freeChannelLimit}`,
    premium: 'Unlimited',
  },
  {
    label: 'Auto-publishing',
    detail: "Every message in an enabled channel, published to followers within Discord's limits",
    free: 'Shared queue',
    premium: 'Dedicated queue',
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

/** Keyed by dashboard tab segment, so a page can pass its own segment as `feature`. */
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
