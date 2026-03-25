# タベルナプロジェクト（Taverna）

## 概要
訪れたお気に入りのお店・食べたメニュー・評価を記録するWebアプリ。
個人用からスタートし、将来的に複数ユーザー対応を目指す。

---

## 現在の状況

- **フェーズ**: v1開発中（お店登録・一覧表示が完成）
- **ファイル**: 単一HTMLファイル（`taverna.html`）
- **データ保存**: 現在はlocalStorage（ブラウザ内保存）
- **次のステップ**: 訪問ログ・メニュー記録機能の追加 → Supabase連携

---

## リポジトリ

- **GitHub**: https://github.com/reinrainbow7-ship-it/taverna
- **ローカル**: `C:\Users\reinr\Documents\taverna\`

---

## データ設計（設計書 ver.1.4 より）

### stores（お店）
| カラム | 型 | 説明 |
|---|---|---|
| id | int | 主キー・自動採番 |
| name | varchar(60) | 店名 |
| area | varchar(100) | 場所 |
| parking | varchar(100) | 駐車場 |
| sns_links | varchar(255) | 公式SNS（任意）|

### visits（訪問ログ）
| カラム | 型 | 説明 |
|---|---|---|
| id | int | 主キー・自動採番 |
| stores_id | int | お店のID（外部キー）|
| date | date | 来店日 |
| rating | integer | 評価 |

### menu_items（メニュー）
| カラム | 型 | 説明 |
|---|---|---|
| id | int | 主キー・自動採番 |
| visits_id | int | 訪問ログのID（外部キー）|
| name | varchar(60) | メニュー名 |
| price | integer | 値段 |

---

## 技術スタック

| 分類 | 現在 | 予定 |
|---|---|---|
| フロントエンド | HTML / CSS / JavaScript | 同左 |
| データ保存 | localStorage | Supabase（PostgreSQL）|
| バージョン管理 | Git + GitHub | 同左 |

---

## 完成済み機能
- お店の登録フォーム（店名・場所・駐車場・SNSリンク）
- お店一覧のカード表示
- 店名・エリアでのリアルタイム検索
- 編集・削除

## 未実装機能
- [ ] 訪問ログの記録（来店日・評価）
- [ ] メニュー記録（注文内容・値段）
- [ ] お店詳細ページ
- [ ] Supabase連携（クラウド保存）
- [ ] ユーザー認証（複数人対応）

---

## 開発環境
- エディタ: VS Code
- 拡張機能: Live Server / Prettier / GitLens
- OS: Windows
