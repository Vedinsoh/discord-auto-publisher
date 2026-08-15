/**
 * Display prices for the premium plan.
 * Must match the Paddle catalog prices behind PADDLE_PRICE_ID_MONTHLY / PADDLE_PRICE_ID_YEARLY —
 * Paddle is what actually charges; these are for display only.
 */
export const PREMIUM_PRICE_MONTHLY_USD = 4.99;
export const PREMIUM_PRICE_YEARLY_USD = 49.99;

/**
 * Trial length, for display only — the real value is `trial_period` on the two Paddle trial
 * prices, and Paddle decides when the first charge falls. Change it there and here together.
 *
 * It is 14 so the statutory withdrawal window closes before the first payment: the window
 * runs 14 days from contract conclusion, which for a trial subscription is the day the trial
 * starts. Both end together.
 */
export const PREMIUM_TRIAL_DAYS = 14;

export const PREMIUM_YEARLY_PER_MONTH_USD = PREMIUM_PRICE_YEARLY_USD / 12;
export const PREMIUM_YEARLY_SAVINGS_USD = PREMIUM_PRICE_MONTHLY_USD * 12 - PREMIUM_PRICE_YEARLY_USD;
export const PREMIUM_YEARLY_SAVINGS_PERCENT = Math.round(
  (PREMIUM_YEARLY_SAVINGS_USD / (PREMIUM_PRICE_MONTHLY_USD * 12)) * 100
);

export const formatUsd = (amount: number): string => `$${amount.toFixed(2)}`;
