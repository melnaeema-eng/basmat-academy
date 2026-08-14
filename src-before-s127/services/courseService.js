import { supabase } from "./supabase";

export async function getCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}