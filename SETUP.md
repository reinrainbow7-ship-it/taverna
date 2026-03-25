# タベルナプロジェクト 構築手順書

## 前提条件

- Windows PC
- VS Code インストール済み
- Git インストール済み（https://git-scm.com/download/win）
- GitHub アカウント作成済み（https://github.com）

---

## 1. Git 初期設定（初回のみ）

```bash
git config --global user.name "あなたの名前"
git config --global user.email "GitHubに登録したメールアドレス"
```

---

## 2. リポジトリをローカルに取得

### 初めてこのPCで作業する場合

```bash
cd C:\Users\reinr\Documents
git clone https://github.com/reinrainbow7-ship-it/taverna.git
cd taverna
```

### すでにフォルダがある場合（最新に更新）

```bash
cd C:\Users\reinr\Documents\taverna
git pull
```

---

## 3. VS Code で開く

```bash
code .
```

または VS Code を起動して「ファイル → フォルダを開く」で `C:\Users\reinr\Documents\taverna` を選択。

---

## 4. 動作確認

`taverna.html` を右クリック →「**Open with Live Server**」でブラウザが開く。

---

## 5. VS Code 推奨拡張機能

| 拡張機能名 | 用途 |
|---|---|
| Live Server | HTMLをブラウザでリアルタイムプレビュー |
| Prettier | コードを自動で整形 |
| GitLens | Git履歴・変更箇所をVS Code内で確認 |
| Japanese Language Pack | VS Codeのメニューを日本語化（任意）|

---

## 6. 開発フロー（毎回の作業）

```bash
# 1. 作業前に最新を取得
git pull

# 2. コードを編集する（VS Code で作業）

# 3. 変更をGitHubに保存
git add taverna.html
git commit -m "変更内容のメモ（例: 訪問ログ機能を追加）"
git push
```

---

## 7. フォルダ構成

```
taverna/
├── taverna.html   # メインのアプリファイル
├── .gitignore     # Gitで無視するファイルの設定
├── PROJECT.md     # プロジェクト概要
└── SETUP.md       # この手順書
```

---

## 8. 関連リンク

- **GitHub リポジトリ**: https://github.com/reinrainbow7-ship-it/taverna
- **設計書**: システム構築課題設計書ver.1.4_関谷悠眞.xlsx
