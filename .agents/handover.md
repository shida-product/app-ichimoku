# AI Handover — Ichimoku

## Current Focus

- コード上の主要機能は実装済みだが、Supabase実DBには未適用。現在はプレビューモックで検証する。
- Ichimokuは独立した個人用アプリ。標準Geminiを個人AI入口とし、Act連携は保留している。
- 実装と詳細仕様は本リポジトリ、プロジェクト間の境界はGrimoireを正本とする。

## Next Actions

1. 個人利用用DBへマイグレーションを適用し、CRUD・RLS・TZ・並び順を目視検証する。
2. `src/lib/date.ts`の固定日付を実日付化し、mutation失敗時の通知を実装する。
3. 日常利用で不足と摩擦を記録し、本番hostingとGoogle連携は別ADRで決定する。
4. `.agents/changelog.md`の既存文字コード問題は、保全と差分確認を伴う独立タスクで修復する。

## Active Boundaries

- `.env.local`、本番Supabase、マイグレーション、アクセス制御を明示指示なしに変更しない。
- `npx supabase config push`は禁止。
- GitHub Pagesへ実DB設定や実利用者データを接続しない。
- 仕様と恒久境界は`.agents/PROJECT.md`、完了履歴は`.agents/changelog.md`を正本とする。
- pushとdeployはユーザーの明示指示がある場合だけ行う。
