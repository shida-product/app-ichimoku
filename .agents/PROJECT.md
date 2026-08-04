# PROJECT — Ichimoku

## 概要

Ichimokuは、タスクボード、近日締切、カレンダーを1画面に並置する個人向けタスク消化アプリ。Vite、React、TypeScript、Supabaseを使用する。

## 正本

- 仕様：`task-board-spec-v1.md`
- 操作モデル：`prototype-overlay.html`
- デザイン：`src/index.css`と`docs/design.md`
- 設計判断：`docs/adr/`
- 完了履歴：`.agents/changelog.md`

## 境界

- 初期利用者はSK。社外ベータ前に専用・組織所有のSupabaseへ分離する。
- DBは`ichimoku`スキーマへ隔離し、`owner_id`とRLSで利用者を分離する。
- `config push`は禁止。共有Supabase内の他アプリ設定を壊さない。
- GitHub Pagesは実DBへ接続しない公開モック専用。本番hostingは未決定。
- 個人AIの既定入口は標準Gemini。Act連携とGoogle Calendar双方向同期はADR確定まで保留する。
- UIは「整理を生まない」「数値で急かさない」を原則とし、色はセマンティックトークン経由で指定する。

## 検証

```bash
npm run format
npm run lint
npm run build
```
