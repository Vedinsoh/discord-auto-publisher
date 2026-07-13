'use client';

import {
  CheckoutEventNames,
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from '@paddle/paddle-js';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const ENVIRONMENT =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

/**
 * Loads Paddle.js once and exposes the instance for overlay checkouts.
 * onCheckoutCompleted fires after the customer finishes payment in the overlay.
 */
export function usePaddle(onCheckoutCompleted?: () => void) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  // Holds the instance so the eventCallback (registered before .then resolves)
  // can close the overlay on completion
  const paddleRef = useRef<Paddle | null>(null);
  const handleCheckoutCompleted = useEffectEvent(() => {
    // The overlay does not auto-close on completion; close it so the redirected
    // success view isn't hidden behind it
    paddleRef.current?.Checkout.close();
    onCheckoutCompleted?.();
  });

  useEffect(() => {
    if (!CLIENT_TOKEN) return;

    initializePaddle({
      token: CLIENT_TOKEN,
      environment: ENVIRONMENT,
      // Settings must live here: they are ignored by Checkout.open() when a
      // transactionId is passed. showAddTaxId keeps the "Add tax number"
      // (business/VAT) option available; note it only renders when the checkout
      // actually shows a collection step — a transaction pre-bound to a customer
      // with a complete address skips collection entirely (see the checkout
      // route's customerId handling).
      checkout: {
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          showAddTaxId: true,
        },
      },
      eventCallback: (event: PaddleEventData) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          handleCheckoutCompleted();
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
