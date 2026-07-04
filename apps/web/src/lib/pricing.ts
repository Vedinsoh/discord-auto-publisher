/**
 * Display prices for the premium plan.
 * Must match the Paddle catalog prices behind PADDLE_PRICE_MONTHLY / PADDLE_PRICE_YEARLY —
 * Paddle is what actually charges; these are for display only.
 */
export const PREMIUM_PRICE_MONTHLY_USD = 4.99;
export const PREMIUM_PRICE_YEARLY_USD = 49.99;

export const PREMIUM_YEARLY_PER_MONTH_USD = PREMIUM_PRICE_YEARLY_USD / 12;
export const PREMIUM_YEARLY_SAVINGS_USD = PREMIUM_PRICE_MONTHLY_USD * 12 - PREMIUM_PRICE_YEARLY_USD;
export const PREMIUM_YEARLY_SAVINGS_PERCENT = Math.round(
  (PREMIUM_YEARLY_SAVINGS_USD / (PREMIUM_PRICE_MONTHLY_USD * 12)) * 100
);

export const formatUsd = (amount: number): string => `$${amount.toFixed(2)}`;
