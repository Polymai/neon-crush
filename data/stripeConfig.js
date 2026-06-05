// Polymai runtime Stripe config.
// Frontend-safe only: publishable key, mode, redirect defaults, and function URL.
// Never add backend payment credentials here.
(function () {
  const supabaseConfig = window.__POLYMAI_SUPABASE_CONFIG__ || {};
  const config = Object.freeze({
    mode: "test",
    publishableKey: "",
    functionsBaseUrl: supabaseConfig.functionsBaseUrl || "https://pfnlebwkbhblytpvaokd.supabase.co/functions/v1",
    defaultSuccessUrl: "",
    defaultCancelUrl: "",
    defaultPriceIds: [],
  });
  window.__POLYMAI_STRIPE_CONFIG__ = config;
})();
