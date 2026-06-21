# タベルナプロジェクト（Taverna）

## 概要
訪れたお気に入りのお店・食べたメニュー・評価を記録するWebアプリ。
個人用からスタートし、将来的に複数ユーザー対応を目指す。

---

## 現在の状況

- **フェーズ**: v2（地図機能まで実装完了）
- **ファイル**: HTML / CSS / JS に分割済み（`index.html`, `store-detail.html`, `login.html`, `css/style.css`, `js/*.js`）
- **データ保存**: Supabase（PostgreSQL・クラウド保存）
- **ホスティング**: Vercel（https://taverna-flax.vercel.app）
- **次のステップ**: ユーザー認証の本格化（Supabase Auth + RLS・マルチユーザー対応）

---

## リポジトリ・環境

- **GitHub**: https://github.com/reinrainbow7-ship-it/taverna
- **本番URL**: https://taverna-flax.vercel.app
- **ローカル**: `C:\Users\reinr\Documents\taverna\`
- **ローカル起動**: `index.html` を右クリック →「Open with Live Server」

---

## ファイル構成

```
taverna/
├── index.html          # トップページ（お店一覧・検索・タグフィルター）
├── store-detail.html   # お店詳細（訪問ログ・メニュー・メモ・地図）
├── login.html          # ログインページ
├── css/
│   └── style.css       # 全ページ共通スタイル
└── js/
    ├── supabase.js     # Supabase クライアント設定
    ├── utils.js        # 共通関数（genId / esc / safeUrl / showToast）
    ├── auth.js         # パスワード認証（checkAuth / login / logout）
    ├── map.js          # 地図機能（Leaflet + OpenStreetMap）
    ├── seating.js      # 座席・喫煙情報の入力UI・バッジ（prefix方式）
    ├── parking.js      # 駐車場詳細（車サイズ評価・台数・メモ）
    ├── tags.js         # タグ選択UI（登録/編集モーダル共通・prefix方式）
    ├── stores.js       # お店 CRUD・カード描画・検索・タグフィルター
    ├── bulk.js         # お店の一括登録（管理者専用・CSV）
    ├── visits.js       # 訪問ログ（日付・星評価・メモ）
    └── menu.js         # メニュー記録（名前・価格・メモ・写真・おすすめ度・注文回数）
```

---

## データ設計（実装済み）

### stores（お店）
| カラム | 型 | 説明 |
|---|---|---|
| id | text | 主キー（genId で生成） |
| user_id | uuid | 所有ユーザー（default auth.uid()・RLSで分離） |
| name | text | 店名 |
| area | text | 場所・エリア |
| parking | text | 駐車場（あり / なし / 近隣にあり） |
| sns | text | 公式SNSリンク（任意） |
| tags | jsonb | タグ（配列） |
| memo | text | お店メモ（任意） |
| thumbnail_url | text | サムネイル画像URL（任意） |
| latitude | float8 | 緯度（地図ピン用・任意） |
| longitude | float8 | 経度（地図ピン用・任意） |
| parking_lat | float8 | 駐車場の緯度（地図ピン用・任意） |
| parking_lng | float8 | 駐車場の経度（地図ピン用・任意） |
| parking_note | text | 駐車場メモ（台数・穴場・冬注意など・任意） |
| parking_capacity | integer | 駐車可能台数（任意） |
| parking_kei | integer | 軽の駐めやすさ（1=厳しい/2=なんとか/3=余裕/null=未評価） |
| parking_futsuu | integer | 普通車の駐めやすさ（同上） |
| parking_family | integer | 大きめ/RVの駐めやすさ（同上） |
| seat_counter | boolean | カウンター席あり（true=あり / null=未確認） |
| seat_table | boolean | テーブル席あり（同上） |
| seat_zashiki | boolean | 座敷あり（同上） |
| seat_private | boolean | 個室あり（同上） |
| seat_counter_num / seat_table_num / seat_zashiki_num / seat_private_num | integer | 各席タイプの席数（任意・数字入力で自動で「あり」に） |
| smoking | text | 喫煙（'no'=禁煙 / 'yes'=喫煙可 / 'sep'=分煙 / null=未確認） |
| seat_note | text | 席に関する自由メモ（任意） |
| created_at | timestamptz | 登録日時 |

### visits（訪問ログ）
| カラム | 型 | 説明 |
|---|---|---|
| id | text | 主キー |
| user_id | uuid | 所有ユーザー（default auth.uid()・RLSで分離） |
| store_id | text | お店 ID（外部キー） |
| date | date | 来店日 |
| rating | integer | 星評価（1〜5） |
| memo | text | 訪問メモ（任意） |
| created_at | timestamptz | 記録日時 |

### menu_items（メニュー）
| カラム | 型 | 説明 |
|---|---|---|
| id | text | 主キー |
| user_id | uuid | 所有ユーザー（default auth.uid()・RLSで分離） |
| store_id | text | お店 ID（外部キー） |
| name | text | メニュー名 |
| price | integer | 価格（任意） |
| memo | text | メモ（任意） |
| photo_url | text | 写真URL（Supabase Storage） |
| recommend_rating | integer | おすすめ度（1〜5） |
| order_count | integer | 注文回数 |
| created_at | timestamptz | 登録日時 |

---

## 技術スタック

| 分類 | 内容 |
|---|---|
| フロントエンド | HTML / CSS / 素の JavaScript（フレームワークなし） |
| データベース | Supabase（PostgreSQL・東京リージョン・RLS有効） |
| ストレージ | Supabase Storage（`taverna-photos` バケット・メニュー写真） |
| 認証 | Supabase Auth（管理者 + デモの2アカウント・RLSでデータ分離） |
| 地図 | Leaflet.js + OpenStreetMap（APIキー不要・無料） |
| ホスティング | Vercel（GitHub 連携・自動デプロイ） |
| バージョン管理 | Git + GitHub |
| エディタ | VS Code（Live Server / Prettier / GitLens） |

---

## 完成済み機能

### お店管理
- [x] お店の登録・編集・削除（Supabase連携）
- [x] お店の一括登録（管理者専用・CSVテキスト貼り付け・プレビュー付き）
- [x] 座席・喫煙情報（席タイプ4種・喫煙3択・席メモ・条件フィルター・ひとり◎/子連れ◎推定）
- [x] 駐車場情報の強化（車サイズ評価・台数・メモ＋駐車場の地図ピン。店舗=赤/駐車場=青の2ピン・距離計算はなし）
- [x] カード一覧表示（サムネイル付き）
- [x] 店名・エリアのリアルタイム検索
- [x] タグフィルター（プリセット8種 + カスタムタグ）
- [x] お店ごとのメモ
- [x] 地図でピンを立てて場所を登録（登録・編集モーダル内）

### 地図
- [x] カードの「📍 おみせはここ！」ボタン → 地図モーダルを表示
- [x] 詳細ページのヘッダーにも「📍 おみせはここ！」ボタン
- [x] Leaflet + OpenStreetMap（無料・APIキー不要）

### 訪問ログ
- [x] 来店日・星評価（1〜5）・メモを記録
- [x] 訪問記録の削除

### メニュー記録
- [x] メニュー名・価格・メモを記録
- [x] 写真アップロード（Supabase Storage）
- [x] おすすめ度（星1〜5）
- [x] 注文回数カウンター（＋ /－ボタン）
- [x] 編集・削除
- [x] メニュー写真をお店のサムネイルに設定

### 認証・インフラ
- [x] パスワード認証（Supabase Auth）
- [x] デモアカウント（ワンクリックログイン・「お試しモード」バッジ）
  - 管理者の記録を**閲覧専用**で表示（RLSのSELECT専用ポリシー + フロントで追加/編集/削除ボタンを非表示）
- [x] RLS有効化（user_id 列 + 自分の行のみアクセス可・セットアップ手順は DEMO_SETUP.md）
- [x] Vercel デプロイ（公開URL）

---

## 未実装・今後の候補

- [ ] **PWA化** — スマホのホーム画面に追加、オフライン対応
- [ ] **お店の評価集計** — 訪問ログの平均評価をカードに表示
- [ ] **エクスポート機能** — データをCSVやPDFで出力

---

## 更新履歴

> 不具合の修正・軽微な改修は [FIXES.md](FIXES.md) に分けて記録する。ここには**機能追加・仕様変更**を記載する。

| 日付 | 内容 |
|---|---|
| 2026-06-22 | 登録/編集を専用ページ store-edit.html に統合・住所検索(GSI)・席数入力・テスト基盤(tests.html) |
| 2026-06-18 | 駐車場の地図マーク（フェーズ2）を追加（店舗=赤/駐車場=青の2ピン・map.js拡張） |
| 2026-06-18 | 駐車場情報の強化フェーズ1（車サイズ評価/台数/メモ・js/parking.js） |
| 2026-06-17 | 座席・喫煙情報機能を追加（席タイプ/喫煙/席メモ・条件フィルター・js/seating.js） |
| 2026-06-17 | お店の一括登録機能を追加（管理者専用・CSV貼り付け・プレビュー・js/bulk.js） |
| 2026-06-13 | デモを「管理者データの閲覧専用」に変更（RLSのSELECT専用ポリシー + 書き込みUI非表示） |
| 2026-06-11 | デモアカウントを追加（demo@taverna.app・RLSによるデータ分離・DEMO_SETUP.md） |
| 2026-05-26 | 地図機能を追加（Leaflet + OpenStreetMap・ピン設置・地図表示） |
| 2026-05-24 | メニューに編集機能・おすすめ度・注文回数を追加 |
| 2026-05-20 | メニューに写真アップロード・サムネイル設定機能を追加 |
| 2026-05-19 | 訪問ログにメモ欄を追加 |
| 2026-05-17 | パスワード認証を追加（login.html・auth.js・ログアウトボタン） |
| 2026-05-17 | 詳細ページにお店編集ボタン・モーダルを追加 |
| 2026-05-14 | Supabase連携を実装（localStorage → クラウドDB） |
| 2026-05-12 | メニュー記録機能を実装（js/menu.js） |
| 2026-05-11 | 訪問ログ機能を追加（js/visits.js） |
| 2026-04-28 | タグ機能を追加 |
| 2026-04-01 | お店ごとのメモ機能を追加 |
| 2026-03-25 | ファイルを分割（html / css / js） |
| 2026-03-24 | プロジェクト初期設定（first commit） |
