'use client';

import type { PaddleEventData } from '@paddle/paddle-js';
import { Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePaddle } from '@/lib/paddle';
import { formatUsd, PREMIUM_PRICE_MONTHLY_USD, PREMIUM_PRICE_YEARLY_USD } from '@/lib/pricing';

/**
 * Paddle default payment link host. Every customer-facing Paddle link (abandoned
 * checkout recovery ?_paction=recovery, past-due payment-method updates, any
 * API-generated checkout.url) points here with ?_ptxn={transactionId}. We read
 * _ptxn and open it in the overlay via Checkout.open() once the Paddle instance
 * is ready. We ignore _paction.
 *
 * OVERLAY, not inline — deliberately. Paddle requires the *integrating page* to
 * reproduce a description of what's being purchased, subtotal/total tax/grand
 * total with currency, the recurrence cadence and renewal total, the full frame
 * including Paddle's footer, and a refund-policy link whenever it uses inline
 * mode. The overlay renders all of that itself ("unlike inline checkout, your
 * page does not need to render any of this separately"), so delegating keeps
 * those disclosures correct and current with Paddle's compliance changes rather
 * than mirroring them here by hand. Do not switch this route to
 * `displayMode: 'inline'` without building that entire disclosure block.
 *
 * We open imperatively rather than leaning on Paddle.js's load-time ?_ptxn
 * auto-open: that auto-open only fires during the CDN script's initial bootstrap
 * (once per hard page load) and does NOT re-fire on client-side navigation —
 * initializePaddle() on an already-loaded instance just updates it. So a second
 * SPA visit to /checkout (back → upgrade again, or a router-cache restore) would
 * leave nothing open until a manual refresh. Opening on the instance covers
 * every mount: hard load, SPA nav, and Paddle-sent recovery/dunning links alike.
 *
 * Fulfillment is webhook-driven regardless of this page; the UX just deposits the
 * customer back into the funnel.
 */
export default function CheckoutPage() {
  // useSearchParams needs a Suspense boundary so a production build doesn't error
  // trying to statically prerender this public route.
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('_ptxn');
  // Guild name for the "subscribing X" indicator. Present on the in-app upgrade
  // flow (panel passes it); absent on Paddle-sent links (recovery/dunning) where
  // we fall back to a neutral label. Cosmetic only — the guild is bound in the
  // transaction's server-set custom_data.
  const guildName = searchParams.get('g');
  const guildIcon = searchParams.get('icon');
  // Same deal: orientation for the page behind the overlay, set only by the
  // in-app upgrade path. The authoritative line items, tax and grand total live
  // in the overlay itself — this is never the disclosure of record.
  const plan = searchParams.get('plan');
  const [genericSuccess, setGenericSuccess] = useState(false);

  const planLine =
    plan === 'month'
      ? `Premium · ${formatUsd(PREMIUM_PRICE_MONTHLY_USD)} per month`
      : plan === 'year'
        ? `Premium · ${formatUsd(PREMIUM_PRICE_YEARLY_USD)} per year`
        : null;

  const onCompleted = useCallback(
    (event: PaddleEventData) => {
      // discord_guild_id is server-set in custom_data at transaction creation, so
      // it rides recovery checkouts. Absent (e.g. a Paddle Retain payment-method
      // transaction) → generic success. Subscription is already active via webhook.
      const customData = event.data?.custom_data as { discord_guild_id?: string } | undefined;
      const guildId = customData?.discord_guild_id;
      if (guildId) {
        router.push(`/dashboard/${guildId}/overview?success=true`);
        return;
      }
      setGenericSuccess(true);
    },
    [router]
  );

  // No settings override: the overlay defaults (displayMode/theme/showAddTaxId)
  // live in usePaddle and apply to every checkout in the app.
  const paddle = usePaddle({ onCompleted });

  const openCheckout = useCallback(() => {
    if (!paddle || !transactionId) return;
    paddle.Checkout.open({ transactionId });
  }, [paddle, transactionId]);

  // Guards the AUTO-open against a duplicate Checkout.open() from React
  // re-renders / StrictMode double-invoke; keyed on the transaction so a new
  // checkout re-opens. The manual "Go to checkout" button bypasses it on
  // purpose — reopening a dismissed overlay is exactly what it's for.
  const openedForRef = useRef<string | null>(null);

  useEffect(() => {
    // No transaction to resume — nothing to open. Send home.
    if (!transactionId) {
      router.replace('/');
      return;
    }
    // Wait for the Paddle instance; the effect re-runs once it resolves.
    if (!paddle) return;
    if (openedForRef.current === transactionId) return;
    openedForRef.current = transactionId;
    openCheckout();
  }, [paddle, transactionId, router, openCheckout]);

  if (genericSuccess) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 pt-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-6 w-6 text-emerald-400" />
        </div>
        <h1 className="mb-2 text-2xl text-white">You&apos;re all set</h1>
        <p className="mb-6 text-slate-400">Your payment went through. Thanks!</p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm text-white transition-colors hover:bg-indigo-500"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  // Sits BEHIND the overlay. Invisible while the overlay is up; becomes the
  // whole page the moment the customer dismisses it, which is why it carries a
  // way back in rather than leaving them on an empty screen.
  return (
    <div className="mx-auto max-w-md px-4 pt-28 pb-16">
      <div className="flex flex-col items-center text-center">
        <h1 className="mb-4 text-2xl text-white">Complete your purchase</h1>
        {/* Server indicator only when we actually know the server (in-app upgrade
            flow passes it); Paddle-sent links have no guild name, so no card. */}
        {guildName && (
          <div className="inline-flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-blue-500 to-blue-600">
              {guildIcon ? (
                <Image
                  src={guildIcon}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {guildName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-left leading-tight">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Upgrading to Premium
              </p>
              <p className="text-sm text-white">{guildName}</p>
            </div>
          </div>
        )}
        {planLine && <p className="mt-4 text-sm text-slate-400">{planLine}</p>}
        <Button
          onClick={openCheckout}
          disabled={!paddle}
          className="mt-8 w-full bg-linear-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
        >
          Go to checkout
        </Button>
        <p className="mt-3 text-xs text-slate-500">
          Closed the payment window? Reopen it to finish.
        </p>
      </div>
    </div>
  );
}
