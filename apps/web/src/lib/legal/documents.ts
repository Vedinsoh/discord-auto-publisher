/**
 * The four published legal documents, in the order a reader most likely needs them.
 * Single source for the legal route group's nav and the site footer, so a renamed route
 * cannot leave a dead footer link behind.
 */
export const legalDocuments = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refunds', label: 'Refunds & Withdrawal' },
  { href: '/legal', label: 'Legal Notice' },
] as const;

/**
 * Effective dates, kept here rather than inside each .mdx file so the pre-publish
 * checklist has one place to audit and so no document can silently ship claiming
 * an effective date that predates its own text.
 *
 * PRE-PUBLISH: every value must be a real date before these pages go live.
 * `null` renders as an explicit draft marker rather than a plausible-looking date.
 */
export const legalEffectiveDates: Record<string, string | null> = {
  '/terms': null,
  '/privacy': null,
  '/refunds': null,
  '/legal': null,
};
