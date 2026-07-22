/**
 * SINGLE Supabase client for the entire application.
 *
 * Rules:
 *  - Import ONLY from this file. Never call createClient() elsewhere.
 *  - Env vars are read from .env.local (gitignored, never committed).
 *  - Fails loudly at startup if vars are missing.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder = (val: string | undefined) => {
  if (!val) return true;
  const placeholders = [
    "your-supabase-project-url-here",
    "your-supabase-anon-key-here",
    "your-anon-key-here",
    "your-anon-public-key",
    "your-service-role-key-here",
    "your-service-role-key",
    "https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
  ];
  return placeholders.includes(val.toLowerCase()) || val.includes("xxxxxxxxxxxxxxxxxxxx");
};

if (isPlaceholder(supabaseUrl)) {
  throw new Error(
    "[School Pulse] VITE_SUPABASE_URL is not set or is using a placeholder.\n" +
      "Current value: " + supabaseUrl + "\n" +
      "Open .env.local and add your real Supabase project URL.\n" +
      "Get it from: Supabase Dashboard → Project → Settings → API"
  );
}

if (isPlaceholder(supabaseAnonKey)) {
  throw new Error(
    "[School Pulse] VITE_SUPABASE_ANON_KEY is not set or is using a placeholder.\n" +
      "Open .env.local and add your real Supabase anon key.\n" +
      "Get it from: Supabase Dashboard → Project → Settings → API"
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "schoolpulse-auth",
  },
});
