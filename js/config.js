/**
 * ============================================================
 * SUPABASE CONFIG
 * ------------------------------------------------------------
 * 1. Go to your Supabase project → Settings → API
 * 2. Copy "Project URL"      → paste into SUPABASE_URL below
 * 3. Copy "anon public" key  → paste into SUPABASE_ANON_KEY below
 *
 * The anon key is SAFE to expose in frontend code — it's designed
 * for this. Your data stays protected by the Row Level Security
 * policies defined in supabase/schema.sql, not by hiding this key.
 * Never paste your "service_role" key here or anywhere in this
 * project — that one must stay secret.
 * ============================================================
 */
const SUPABASE_URL = 'https://wwypwbpejbdhvmoyhiay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3eXB3YnBlamJkaHZtb3loaWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjYyNzUsImV4cCI6MjA5OTQ0MjI3NX0.L-3LkXKm0zpKzIR4yoRe1HP6Guo1oPV40T_aIjWZtEE';

// Detects whether the placeholders above have been replaced yet,
// so the site can show a friendly setup message instead of a
// broken network error when opened for the first time.
const SUPABASE_CONFIGURED =
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !SUPABASE_ANON_KEY.includes('YOUR-ANON-PUBLIC-KEY');

const supabaseClient = SUPABASE_CONFIGURED
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
