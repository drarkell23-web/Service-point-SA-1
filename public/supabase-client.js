// public/supabase-client.js — browser Supabase helper (use anon key)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const SUPABASE_URL = "https://obmbklanktevawuymkbq.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibWJrbGFua3RldmF3dXlta2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTA5MTIsImV4cCI6MjA3ODU4NjkxMn0.Rwou0LAS4SITuJfWPTFzWnxUZTYlwVqLA0s-l4Qen_k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
