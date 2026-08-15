'use client';

import {
  CheckoutEventNames,
  type CheckoutSettings,
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from '@paddle/paddle-js';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useSiteConfig } from '@/components/site-config-context';

interface UsePaddleOptions {
  // Fires after the customer finishes payment; receives the checkout.completed
  // event so callers can read server-set custom_data (e.g. discord_guild_id on a
  // recovery/default-payment-link checkout).
  onCompleted?: (event: PaddleEventData) => void;
  // Merged into the default checkout settings. displayMode is a GLOBAL
  // Paddle.Initialize setting (not a per-open arg), so a route needing a
  // different mode has to override it here. Nothing does, deliberately: every
  // checkout runs in the overlay, which renders its own item description,
  // totals, tax, renewal terms and merchant-of-record footer. Inline mode moves
  // all of those disclosures onto the integrating page — see app/checkout/page.tsx.
  settings?: Partial<CheckoutSettings>;
}

/**
 * Loads Paddle.js once and exposes the instance for checkouts.
 *
 * Token and environment come from the site config the root layout server-renders into the
 * tree, not from `NEXT_PUBLIC_*` inlining: Next.js reads `.env*` only from its own app
 * directory, so a monorepo-root env file left the token undefined and every checkout button
 * permanently disabled.
 */
export function usePaddle({ onCompleted, settings }: UsePaddleOptions = {}) {
  const { paddleClientToken, paddleEnvironment } = useSiteConfig();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  // Holds the instance so the eventCallback (registered before .then resolves)
  // can close the overlay on completion
  const paddleRef = useRef<Paddle | null>(null);
  // Captured once — Paddle.js initializes a single time; settings are static per route
  const settingsRef = useRef(settings);
  const handleCheckoutCompleted = useEffectEvent((event: PaddleEventData) => {
    // The overlay does not auto-close on completion; close it so the redirected
    // success view isn't hidden behind it.
    paddleRef.current?.Checkout.close();
    onCompleted?.(event);
  });

  useEffect(() => {
    // A missing token can only mean a misconfigured deployment, whose only other symptom is
    // a dead checkout button. Self-hosted copies never render a checkout, so this cannot
    // fire there.
    if (!paddleClientToken) {
      // biome-ignore lint/suspicious/noConsole: reports an unfixable-by-the-user misconfiguration
      console.error('Paddle client token is not configured; checkout cannot open.');
      return;
    }

    initializePaddle({
      token: paddleClientToken,
      environment: paddleEnvironment,
      // Global defaults for every checkout in the app. Callers that open
      // imperatively (Checkout.open) may also pass settings there, which win.
      // showAddTaxId keeps the "Add tax number" (business/VAT) option available. It
      // renders only when the checkout shows a collection step — a transaction pre-bound
      // to a customer with a complete address skips collection entirely (see the checkout
      // route's customerId handling).
      checkout: {
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          showAddTaxId: true,
          ...settingsRef.current,
        },
      },
      eventCallback: (event: PaddleEventData) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          handleCheckoutCompleted(event);
        }
      },
    })
      .then(instance => {
        if (instance) {
          paddleRef.current = instance;
          setPaddle(instance);
        }
      })
      .catch((error: unknown) => {
        // Same as above: a rejected initialize (bad token, blocked CDN) otherwise presents
        // only as a dead button.
        // biome-ignore lint/suspicious/noConsole: reports an unfixable-by-the-user misconfiguration
        console.error('Paddle.js failed to initialize; checkout cannot open.', error);
        setPaddle(null);
      });
    // Both are fixed for the deployment's lifetime, so this still runs once.
  }, [paddleClientToken, paddleEnvironment]);

  return paddle;
}
