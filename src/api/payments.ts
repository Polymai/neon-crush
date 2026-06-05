import { stripeRuntime } from "../config/runtime";
import { supabase } from "../lib/supabase";

export type CoinPackKey = "spark_500" | "pulse_1200" | "nova_3000";

export interface CoinPack {
  key: CoinPackKey;
  name: string;
  description: string;
  coins: number;
  amountCents: number;
  bonus: string;
}

export const COIN_PACKS: CoinPack[] = [
  {
    key: "spark_500",
    name: "Spark Pack",
    description: "Refill your arcade wallet.",
    coins: 500,
    amountCents: 499,
    bonus: "+1 shuffle",
  },
  {
    key: "pulse_1200",
    name: "Pulse Pack",
    description: "A bigger refill with a laser.",
    coins: 1200,
    amountCents: 899,
    bonus: "+1 laser",
  },
  {
    key: "nova_3000",
    name: "Nova Pack",
    description: "Best value for longer runs.",
    coins: 3000,
    amountCents: 1799,
    bonus: "+2 burst, +2 shuffle",
  },
];

export interface CheckoutResponse {
  url?: string;
  sessionId?: string;
  status?: string;
  message?: string;
  setupRequired?: boolean;
}

interface CheckoutErrorResponse extends CheckoutResponse {
  error?: string;
}

function checkoutEndpoint(): string {
  return `${stripeRuntime.functionsBaseUrl.replace(/\/+$/, "")}/app685-neon-crush-checkout`;
}

function currentUrlWithParams(params: Record<string, string>): string {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function callCheckout(payload: Record<string, unknown>): Promise<CheckoutResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { message: "Sign in before buying coin packs." };
  }

  const response = await fetch(checkoutEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as CheckoutErrorResponse;
  if (!response.ok) {
    return {
      ...data,
      message: data.message || data.error || "Checkout is not ready yet.",
    };
  }
  return data;
}

export async function createCoinPackCheckout(packKey: CoinPackKey): Promise<CheckoutResponse> {
  return callCheckout({
    packKey,
    successUrl: currentUrlWithParams({ checkout: "success", session_id: "{CHECKOUT_SESSION_ID}" }),
    cancelUrl: currentUrlWithParams({ checkout: "canceled" }),
  });
}

export async function reconcileCoinPackCheckout(sessionId: string): Promise<CheckoutResponse> {
  return callCheckout({
    action: "reconcile",
    sessionId,
  });
}
