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
  pushKey: 'BEZCjs5MqX0-AoKJUVvHTe20p-4S9jsM9_AcUyj4ajUDLBOiF4dgJMi4MekeILmHD-TYEWAsWqoQOK-GtMcm_q0'
};
