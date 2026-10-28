// =====================================================================
// config.js — where the Kiddy Kat online server lives (Supabase)
// These two are MEANT to be public. The database only lets people in
// through the login functions, which check a PIN or a login token.
// NEVER put the Supabase secret key (sb_secret_...) in this file.
// =====================================================================

const KIDDY_KAT_CLOUD = {
  url: 'https://kugusjgprgvhhajifhhy.supabase.co',
  key: 'sb_publishable_O1FVpXjw515rZlF61GJ1jQ_fnLeSitg',
  // Public key for push alerts (safe to share). The matching PRIVATE key lives only in Supabase secrets.
  pushKey: 'BLb2ngiXu23MOhAlyqkjw9BZTYQ5o55gIYc6btpUh4AEBIaWmfW7ukib7gDDYm3Jp4Uz_cAKcvJ2-oeTNLellfc'
};
