/* ════════════════════════════════
   auth.js — 認証ヘルパー
════════════════════════════════ */

// Supabase Auth に登録するアカウント
const ADMIN_EMAIL = 'admin@taverna.app';  // 管理者（自分用）
const DEMO_EMAIL  = 'demo@taverna.app';   // お試しデモ用（データはRLSで分離）

// デモアカウントのパスワード。
// ソースに書いても問題ない（デモは誰でも使ってよい前提。データはRLSで管理者と分離される）
const DEMO_PASSWORD = 'taverna-demo-2026';

// ログイン中ユーザーのメールアドレス（checkAuth 後に入る）
let currentUserEmail = null;

/**
 * ログイン状態を確認し、未ログインならログイン画面へ。
 * デモアカウントならヘッダーにバッジを表示する。
 */
async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.href = 'login.html';
    return;
  }
  currentUserEmail = session.user.email;
  markDemoMode();
  markAdminMode();
}

/**
 * デモアカウントでログイン中か
 */
function isDemo() {
  return currentUserEmail === DEMO_EMAIL;
}

/**
 * 管理者（自分）でログイン中か
 */
function isAdmin() {
  return currentUserEmail === ADMIN_EMAIL;
}

/**
 * 管理者なら body に印を付ける（CSS で管理者専用UIを表示する）
 */
function markAdminMode() {
  if (isAdmin()) document.body.classList.add('admin-mode');
}

/**
 * デモ中ならヘッダーに「お試しモード」バッジを付ける
 */
function markDemoMode() {
  if (!isDemo()) return;

  // body に印を付ける（CSS で追加・編集・削除ボタンを隠す）
  document.body.classList.add('demo-mode');

  const logo = document.querySelector('header .logo');
  if (logo && !logo.querySelector('.demo-badge')) {
    const badge = document.createElement('span');
    badge.className = 'demo-badge';
    badge.textContent = 'お試しモード';
    logo.appendChild(badge);
  }

  // メモ欄（詳細ページ）は閲覧専用にする
  const memo = document.getElementById('store-memo');
  if (memo) {
    memo.readOnly = true;
    memo.placeholder = 'お試しモードではメモは編集できません';
  }
}

/**
 * デモ中なら書き込み操作をブロックする。
 * ブロックした場合は true を返す（呼び出し側で return する用）。
 */
function blockIfDemo() {
  if (isDemo()) {
    showToast('お試しモードでは変更できません');
    return true;
  }
  return false;
}

/**
 * 管理者としてパスワードでログイン
 */
async function login(password) {
  const { error } = await db.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: password,
  });
  return error;
}

/**
 * デモアカウントでログイン（ワンクリック）
 */
async function loginAsDemo() {
  const { error } = await db.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
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
