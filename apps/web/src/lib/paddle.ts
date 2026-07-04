'use client';

import {
  CheckoutEventNames,
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from '@paddle/paddle-js';
import { useEffect, useEffectEvent, useState } from 'react';

const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const ENVIRONMENT =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

/**
 * Loads Paddle.js once and exposes the instance for overlay checkouts.
 * onCheckoutCompleted fires after the customer finishes payment in the overlay.
 */
export function usePaddle(onCheckoutCompleted?: () => void) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const handleCheckoutCompleted = useEffectEvent(() => {
    onCheckoutCompleted?.();
  });

  useEffect(() => {
    if (!CLIENT_TOKEN) return;

    initializePaddle({
      token: CLIENT_TOKEN,
      environment: ENVIRONMENT,
      // Settings must live here: they are ignored by Checkout.open() when a
      // transactionId is passed
      checkout: {
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
        },
      },
      eventCallback: (event: PaddleEventData) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          handleCheckoutCompleted();
        }
      },
    })
      .then(instance => {
        if (instance) setPaddle(instance);
      })
      .catch(() => setPaddle(null));
  }, []);

  return paddle;
}
