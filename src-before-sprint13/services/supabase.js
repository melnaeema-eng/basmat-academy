import { createClient } from "@supabase/supabase-js";

console.log(import.meta.env);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl);
console.log("KEY exists:", !!supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey);