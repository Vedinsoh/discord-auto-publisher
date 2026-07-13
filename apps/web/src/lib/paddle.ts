'use client';

import {
  CheckoutEventNames,
  type CheckoutSettings,
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from '@paddle/paddle-js';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const ENVIRONMENT =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

interface UsePaddleOptions {
  // Fires after the customer finishes payment; receives the checkout.completed
  // event so callers can read server-set custom_data (e.g. discord_guild_id on a
  // recovery/default-payment-link checkout).
  onCompleted?: (event: PaddleEventData) => void;
  // Fires when the checkout frame has rendered (used to clear a loading state,
  // relevant for inline where there is no overlay to signal readiness).
  onLoaded?: () => void;
  // Merged into the default checkout settings. displayMode is a GLOBAL
  // Paddle.Initialize setting (not a per-open arg), so a route that needs a
  // different mode passes its own override: the dashboard panel keeps the overlay
  // default, the /checkout default-payment-link page passes inline settings.
  settings?: Partial<CheckoutSettings>;
}

/**
 * Loads Paddle.js once and exposes the instance for checkouts.
 */
export function usePaddle({ onCompleted, onLoaded, settings }: UsePaddleOptions = {}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  // Holds the instance so the eventCallback (registered before .then resolves)
  // can close the overlay on completion
  const paddleRef = useRef<Paddle | null>(null);
  // Captured once — Paddle.js initializes a single time; settings are static per route
  const settingsRef = useRef(settings);
  const handleCheckoutCompleted = useEffectEvent((event: PaddleEventData) => {
    // The overlay does not auto-close on completion; close it so the redirected
    // success view isn't hidden behind it (harmless no-op for inline)
    paddleRef.current?.Checkout.close();
    onCompleted?.(event);
  });
  const handleCheckoutLoaded = useEffectEvent(() => onLoaded?.());

  useEffect(() => {
    if (!CLIENT_TOKEN) return;

    initializePaddle({
      token: CLIENT_TOKEN,
      environment: ENVIRONMENT,
      // Settings must live here: they are ignored by Checkout.open() when a
      // transactionId is passed, and the default-payment-link auto-open (?_ptxn)
      // reads them too. showAddTaxId keeps the "Add tax number" (business/VAT)
      // option available; note it only renders when the checkout actually shows a
      // collection step — a transaction pre-bound to a customer with a complete
      // address skips collection entirely (see the checkout route's customerId
      // handling).
      checkout: {
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          showAddTaxId: true,
          ...settingsRef.current,
        },
      },
      eventCallback: (event: PaddleEventData) => {
        if (event.name === CheckoutEventNames.CHECKOUT_LOADED) {
          handleCheckoutLoaded();
        } else if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
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
      .catch(() => setPaddle(null));
  }, []);

  return paddle;
}
