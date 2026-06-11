# デモアカウント セットアップ手順

管理者とお試しデモの2アカウント構成にするための Supabase 側の作業です。
フロントエンドのコードは対応済みなので、以下を順番に実行すれば完了します。

データの分離は RLS（Row Level Security）で行います。
各テーブルに `user_id` 列を追加し、「自分の行しか見えない・触れない」ポリシーを設定します。
これにより、デモ利用者が管理者のデータを見たり壊したりすることはできなくなります。

---

## ① デモユーザーを作成する（ダッシュボード）

1. Supabase ダッシュボード → **Authentication** → **Users** → **Add user** → **Create new user**
2. 以下を入力:
   - Email: `demo@taverna.app`
   - Password: `taverna-demo-2026` （`js/auth.js` の `DEMO_PASSWORD` と一致させること）
   - **Auto Confirm User にチェック**（メール確認をスキップ）

> パスワードを変えたい場合は `js/auth.js` の `DEMO_PASSWORD` も合わせて変更してください。
> デモのパスワードはソースコードに書いてあり公開前提です（ワンクリックログイン用）。

---

## ② user_id 列の追加と既存データの引き継ぎ（SQL Editor）

SQL Editor で以下を実行します。既存のデータはすべて管理者のものになります。

```sql
-- ─── stores ───
alter table stores add column if not exists user_id uuid;

update stores
set user_id = (select id from auth.users where email = 'admin@taverna.app')
where user_id is null;

alter table stores alter column user_id set default auth.uid();
alter table stores alter column user_id set not null;

-- ─── visits ───
alter table visits add column if not exists user_id uuid;

update visits
set user_id = (select id from auth.users where email = 'admin@taverna.app')
where user_id is null;

alter table visits alter column user_id set default auth.uid();
alter table visits alter column user_id set not null;

-- ─── menu_items ───
alter table menu_items add column if not exists user_id uuid;

update menu_items
set user_id = (select id from auth.users where email = 'admin@taverna.app')
where user_id is null;

alter table menu_items alter column user_id set default auth.uid();
alter table menu_items alter column user_id set not null;
```

> `default auth.uid()` のおかげで、JS側は user_id を一切送らなくても
> 新規登録時に自動でログイン中ユーザーのIDが入ります。

---

## ③ RLS を有効化する（SQL Editor）

```sql
-- ─── stores ───
alter table stores enable row level security;

drop policy if exists "own rows only" on stores;
create policy "own rows only" on stores
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── visits ───
alter table visits enable row level security;

drop policy if exists "own rows only" on visits;
create policy "own rows only" on visits
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── menu_items ───
alter table menu_items enable row level security;

drop policy if exists "own rows only" on menu_items;
create policy "own rows only" on menu_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

実行後、以下で3テーブルすべてにポリシーが付いたか確認できます:

```sql
select tablename, policyname
from pg_policies
where tablename in ('stores', 'visits', 'menu_items');
```

> **重要:** "own rows only" 以外のポリシーが出てきたら分離が効きません。
> ポリシーは複数あると OR で効くため、「authenticated なら全行OK」のような
> 緩いポリシーが残っていると、デモから管理者のデータが見えてしまいます。
> その場合は以下で全ポリシーを消してから、上の③をもう一度実行してください:
>
> ```sql
> do $$
> declare p record;
> begin
>   for p in
>     select schemaname, tablename, policyname
>     from pg_policies
>     where tablename in ('stores', 'visits', 'menu_items')
>   loop
>     execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
>   end loop;
> end $$;
> ```

これで未ログイン（anon key のみ）ではデータに一切アクセスできなくなり、
ログイン済みでも自分の行しか読み書きできなくなります。

---

## ④ Storage（taverna-photos）のポリシー（SQL Editor）

写真のアップロード・削除をログイン済みユーザーに限定します。
（公開URLでの閲覧はバケットが public のままなら今まで通り可能です）

まず既存ポリシーを確認: **Storage** → **Policies** → `taverna-photos`。
「全員（anon）に書き込みを許可」するポリシーがあれば削除し、以下に置き換えます。

```sql
create policy "authenticated upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'taverna-photos');

create policy "authenticated update" on storage.objects
  for update to authenticated
  using (bucket_id = 'taverna-photos');

create policy "authenticated delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'taverna-photos');
```

---

## ⑤ 動作確認

1. ログイン画面 → 「🍽️ お試しデモで使ってみる」→ 空の状態で始まり、ヘッダーに「お試しモード」バッジが出る
2. デモでお店を1件登録 → ログアウト → 管理者でログイン → デモのお店が**見えない**ことを確認
3. 管理者の既存データが今まで通り全部見えることを確認

---

## デモデータのリセット（必要なとき）

デモを人に見せる前などに、SQL Editor で実行:

```sql
-- visits / menu_items は ON DELETE CASCADE で一緒に消える
delete from stores
where user_id = (select id from auth.users where email = 'demo@taverna.app');
```

> 注意: デモでアップロードされた写真ファイルは Storage に残ります（既知のオーファン問題）。
> 気になる場合は Storage の taverna-photos バケットから手動削除してください。

## 補足: デモパスワードが勝手に変更されたら

デモログイン中のユーザーは（ブラウザのコンソールから）自分のパスワードを
変更できてしまいます。もしデモログインが効かなくなったら、
ダッシュボード → Authentication → Users → demo@taverna.app → **Reset password**
で `taverna-demo-2026` に戻してください。
