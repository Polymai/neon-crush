export const APP_ID = "app685";
export const APP_NAME = "Neon Crush";
export const APP_SCHEMA = "app685_neoncrush";

export interface PolymaiSupabaseConfig {
  appId: string;
  url: string;
  anonKey: string;
  functionsBaseUrl: string;
  siteUrl: string;
  appStoragePrefix: string;
  authStorageKey: string;
}

export interface PolymaiStripeConfig {
  mode: "test" | "live" | string;
  publishableKey: string;
  functionsBaseUrl: string;
  defaultSuccessUrl: string;
  defaultCancelUrl: string;
  defaultPriceIds: string[];
}

declare global {
  interface Window {
    __POLYMAI_SUPABASE_CONFIG__?: PolymaiSupabaseConfig;
    __SUPABASE_CONFIG__?: PolymaiSupabaseConfig;
    __POLYMAI_STRIPE_CONFIG__?: PolymaiStripeConfig;
  }
}

const fallbackConfig: PolymaiSupabaseConfig = {
  appId: "app685",
  url: "https://pfnlebwkbhblytpvaokd.supabase.co",
  anonKey: "sb_publishable_O8CemBWuZAjQDC6gSkNq9Q_wAmDtHiv",
  functionsBaseUrl: "https://pfnlebwkbhblytpvaokd.supabase.co/functions/v1",
  siteUrl: "",
  appStoragePrefix: "polymai:app685:",
  authStorageKey: "polymai:app685:pfnlebwkbhblytpvaokd:auth",
};

export const supabaseRuntime: PolymaiSupabaseConfig = Object.freeze({
  ...fallbackConfig,
  ...(typeof window !== "undefined" ? window.__POLYMAI_SUPABASE_CONFIG__ : undefined),
});

export const stripeRuntime: PolymaiStripeConfig = Object.freeze({
  mode: "test",
  publishableKey: "",
  functionsBaseUrl: supabaseRuntime.functionsBaseUrl,
  defaultSuccessUrl: "",
  defaultCancelUrl: "",
  defaultPriceIds: [],
  ...(typeof window !== "undefined" ? window.__POLYMAI_STRIPE_CONFIG__ : undefined),
});

export function appStorageKey(key: string): string {
  return `${supabaseRuntime.appStoragePrefix}${key}`;
}

export function getAuthRedirectTo(): string {
  if (supabaseRuntime.siteUrl) return supabaseRuntime.siteUrl;
  if (typeof window === "undefined") return "";
  const cleanPath = window.location.pathname.replace(/\/index\.html$/, "/");
  return `${window.location.origin}${cleanPath}`;
}
