/* ════════════════════════════════
   supabase.js — Supabase クライアント設定
════════════════════════════════ */

const SUPABASE_URL     = 'https://njadqhdsxgzeauejdgpw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYWRxaGRzeGd6ZWF1ZWpkZ3B3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDA3NDMsImV4cCI6MjA5NDI3Njc0M30.lZ0pw5ynh-nbCcJ1wYZ4-3183s2xf418flqzhmTQHb4';

// グローバルな db オブジェクトとして使う
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
