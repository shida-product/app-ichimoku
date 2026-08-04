# RULES — Ichimoku 固有ルール

> **共通ルールの正本は `C:/dev/keystone/rules/CORE.md`。先にそちらを読むこと。**
> 言語・文字化け対策・コミット作法・秘密情報・推測の排除・作業の区切り・`.agents/` の役割分担は CORE.md が正本。ここには複製しない。
>
> このファイルは **Ichimoku でしか起きないこと** だけを持つ。

---

## 1. プロジェクト概要

| 項目 | 内容 |
| --- | --- |
| 名称 | **Ichimoku**（イチモク）— 経営者向けタスク消化型ツール |
| 概要 | 1画面・遷移ゼロで タスクボード＋近日締切レーン＋カレンダーを並置 |
| 主言語 | TypeScript（Vite + React 19） |
| バックエンド | Supabase（Postgres + Auth + RLS） |
| サンプル公開 | GitHub Pages（公開・モック限定） |
| 本番 hosting | 未決定（Cloudflare Pages + Access 等を候補に別途決定） |
| 仕様書 | `task-board-spec-v1.md` |
| UIプロト | `prototype-overlay.html` |
| 本番 URL | 未デプロイ |

---

## 2. Danger Zone（明示指示なしに触らない）

1. **`.env.local`** — Supabase の URL / キー
2. **Supabase マイグレーション**と本番DBへの直接操作
3. **本番デプロイ・アクセス制御設定**
4. **`git push --force`**（特に `main`）
5. **`package-lock.json`** — 意図的更新を除く

---

## 3. 検証コマンド

| 対象 | コマンド |
| --- | --- |
| Web 整形 | `npm run format` |
| Web リント | `npm run lint` |
| Web ビルド | `npm run build` |

> 文字化け検査は **Keystone が中央で実行する**（`.githooks/pre-commit` が自動で呼ぶ）。
> 手動実行する場合: `node C:/dev/keystone/bin/lint-encoding.cjs`

---

## 4. Workflow Routing（着手前に何を読むか）

| 作業内容 | 読み込むファイル |
| --- | --- |
| 起動・終了手順 | `.agents/BOOTSTRAP.md` |
| ツール別読み込み経路 | `.agents/ADAPTERS.md` |
| オーケストレーション全体像 | `.agents/orchestration.md` |
| 編集ロック・並列調整 | `.agents/state/locks.md` |
| AI セッション運用 | `.agents/workflows/ai-session.md` |
| 作業完了時の自律引き継ぎ | `.agents/workflows/session-close.md` |
| Git 操作・コミット | `.agents/workflows/git-safety.md` |
| 人間によるレビュー | `.agents/workflows/review-checklist.md` |
| 推奨拡張・IDE 同期方針 | `.agents/workflows/extensions.md` |
| エンコーディング事故の詳細 | `.agents/lessons/encoding.md` |
| セキュリティ全般 | `.agents/lessons/security.md` |

---

## 5. commit 関所

`.githooks/pre-commit` は **Keystone を呼ぶシム**。検査ロジックはこのリポに無い。
有効化は各クローンで1回: `git config core.hooksPath .githooks`
