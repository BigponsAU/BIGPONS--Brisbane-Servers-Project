import Stripe from 'stripe';
import { getStripeSecretKey } from './stripe-config';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
