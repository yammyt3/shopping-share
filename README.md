# shopping-share（かご）

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

秘密鍵はフロントエンドやVercelの `NEXT_PUBLIC_*` 変数へ設定しないでください。

## Supabase

このリポジトリはSupabaseプロジェクト `shopping-share` にリンク済みです。

```bash
supabase db push
```

マイグレーションは `supabase/migrations/` で管理します。共有リンクは30日間有効で、リンクを知っている人がチェック状態を更新できます。

## Vercel

GitHubリポジトリをVercelへインポートし、上記2つの環境変数を設定してください。フレームワークはNext.jsとして自動検出されます。

## 確認

```bash
npm run build
npm run lint
```
