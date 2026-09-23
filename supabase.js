const SUPABASE_URL = "PUT_YOUR_SUPABASE_URL_HERE";

const SUPABASE_PUBLISHABLE_KEY =
  "PUT_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

window.novaSupabase = supabaseClient;
