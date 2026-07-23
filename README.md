# shopping-share（お買い物メモ）

スーパーで買うものを選び、買い物メモとして共有するNext.jsアプリです。

## 開発

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 環境変数

ローカルとVercelに以下を設定します。

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

VercelのProduction環境には、keep-alive用の値も設定します。

```text
CRON_SECRET
```

`CRON_SECRET` には16文字以上のランダムな値を設定してください。
たとえば、`openssl rand -base64 32` で生成できます。
Vercel Cronはこの値を `Authorization` ヘッダーに付け、keep-aliveのAPIは一致するリクエストだけを受け付けます。

秘密鍵はフロントエンドやVercelの `NEXT_PUBLIC_*` 変数へ設定しないでください。

## Supabase

このリポジトリはSupabaseプロジェクト `shopping-share` にリンク済みです。

```bash
supabase db push
```

マイグレーションは `supabase/migrations/` で管理します。共有リンクは30日間有効で、リンクを知っている人がチェック状態を更新できます。

## Supabase keep-alive

Vercel Cronが毎日1回APIを呼び、APIからSupabase PostgRESTの `keep_alive` テーブルを1件だけ読みます。
`cache: "no-store"` を指定しているため、実行のたびにDBへの問い合わせが発生します。
専用テーブルには固定値1件だけを置き、RLSでは `anon` ロールの読み取りだけを許可しています。

初回は、次の順序で設定してください。

1. `supabase db push` を実行し、`keep_alive` テーブルとRLSポリシーを反映します。
2. VercelのProject SettingsからEnvironment Variablesを開き、Production環境に `CRON_SECRET` を追加します。
3. Productionへ再デプロイします。
4. VercelのCron Jobsで `/api/cron/keep-alive` が登録されていることを確認します。

実行間隔は [`vercel.json`](vercel.json) の `crons[0].schedule` にあります。
現在の `17 3 * * *` は毎日03:17 UTCの指定です。
Vercel Hobbyでは指定した時刻を含む1時間のどこかで実行されます。
値を変えた場合は、Productionへ再デプロイしてください。

手動確認では、ProductionのURLに対して次のリクエストを送ります。

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://<production-domain>/api/cron/keep-alive
```

成功時は `{"ok":true}` が返ります。
`CRON_SECRET`、Supabaseの環境変数、マイグレーションのいずれかが不足している場合は、2xx以外を返すためVercelの実行ログで検出できます。

## Vercel

GitHubリポジトリをVercelへインポートし、上記の環境変数を設定してください。フレームワークはNext.jsとして自動検出されます。

## 確認

```bash
npm run build
npm run lint
```
