/* ════════════════════════════════
   auth.js — 認証ヘルパー
════════════════════════════════ */

// Supabase Auth に登録する固定メールアドレス（変更不要）
const AUTH_EMAIL = 'admin@taverna.app';

/**
 * ログイン状態を確認し、未ログインならログイン画面へ
 */
async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.href = 'login.html';
  }
}

/**
 * パスワードでログイン
 */
async function login(password) {
  const { error } = await db.auth.signInWithPassword({
    email: AUTH_EMAIL,
    password: password,
  });
  return error;
}

/**
 * ログアウト
 */
async function logout() {
  await db.auth.signOut();
  location.href = 'login.html';
}
