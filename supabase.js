const SUPABASE_URL =
    "https://zywftdjsqvaarzmcsuxj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_7iBzDFRA21wVb3R29C_K5w_jxVhVkHO";

const {
    createClient
} = window.supabase;

const supabaseClient =
    createClient(
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

window.novaSupabase =
    supabaseClient;
