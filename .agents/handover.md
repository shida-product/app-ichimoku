# AI 引き継ぎドキュメント

> 「次の AI が 1 分で現在地に戻る」ための短い handover。
> 詳細ログは `.agents/changelog.md`、恒久ルールは `.agents/RULES.md` / `.agents/lessons.md`。

## セッション開始時（AI が自律的に実行）

1. `.agents/RULES.md` と `.agents/lessons.md` を読む。
2. `.agents/state/locks.md` で他セッションの編集状況を確認する。
3. この handover の Current Focus / Next Actions / Boundaries を確認する。
4. 着手ドメインに応じて `.agents/RULES.md` §9-2 の Workflow Routing に従う。
5. 編集開始前に `locks.md` に自分の行を追記する（`ai-session.md` 参照）。

## セッション終了時（AI が自律的に実行）

`.agents/workflows/session-close.md` に従い、このファイルを更新する。ユーザーからの明示指示は不要。

---

## Current Focus

### プロジェクト境界（2026-07-31確定）

Ichimokuは独立したタスク管理アプリ。ActはIchimokuに内包されず、人間と同様にIchimokuをToolとして利用する。全体統治はGrimoire、実装・詳細仕様の正本は本リポジトリ。

### ⚠ 最重要：実 DB 未適用（2026-06-21 現在）

コードは全機能実装済みだが、**Supabase には一切適用していない**。ローカルは `npm run dev` のプレビューモック（`IS_PREVIEW`）で動作確認中（現在 `http://localhost:5175/Ichimoku/` でサーバー起動中）。

- プレビューモード限定のデモ機能として、画面端にブラウザ拡張（Tampermonkey）の挙動を模倣した擬似UI（つまみ＆クイック追加パネル）を追加しました。プレビュー上で実際にタスクのモック追加デモを行えます。デザインは本体アプリのGoogle配色トンマナに統合済みです。

実DB化に必要な残手順:

1. `.env.local` に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を設定
2. `npx supabase init` → `npx supabase link` → `npx supabase db push`  
   （**`config push` は禁止** ＝ 共有プロジェクト内の他アプリ API 設定を壊す）
3. Supabase ダッシュボード → API Settings → Exposed schemas に `ichimoku` を追加
4. ブラウザで CRUD・RLS・TZ・並び順を目視検証
5. `src/lib/date.ts` の `APP_TODAY` を実日付化・mutation 失敗トースト実装

### バックエンド整備（2026-06-19）

- Supabase が **他アプリ（ringo*\* / ogi*\* / reception_tickets 等）と同一プロジェクト同居**のため、Ichimoku を専用スキーマ `ichimoku` に隔離。
- マイグレーション 3 本（`20260615.../20260616.../20260618...`）を全面書き換え。RLS・トリガー `set_updated_at()` もスキーマ内へ。GRANT は `authenticated`/`service_role` のみ（**anon 除外**）。
- `src/lib/supabase.ts` を `createClient<any,"ichimoku">(..., { db:{ schema:"ichimoku" } })` に変更済み。
- 検証: lint 0 error / build 成功。**実 DB 未適用**。

### セキュリティ監査（別セッション対応）

共有 Supabase の `public` 同居アプリが anon 全公開（🔴）。対応手順・修正 SQL は **[docs/supabase-security-audit.md](../../docs/supabase-security-audit.md)** に集約済み。

- ①questionnaire ②ringo → 情報充足・実行可
- ③ogi → ログインメール未確認
- ④reception → 端末操作/PII 要確認

### 直近の実装完了事項（2026-06-18）

| 内容                                                         | 状態 |
| ------------------------------------------------------------ | ---- |
| 優先度・予定色を撤回し**締切時刻のみ**残す（方針A）          | ✅   |
| ADR-0002「整理を生まない原則」確定                           | ✅   |
| タスク詳細に**完了ボタン**追加（未完了のみ表示）             | ✅   |
| 3カラムレイアウト（締切左・ボード中・カレンダー右）正式採用  | ✅   |
| ボード列分配を高さ貪欲マソンリー化・未分類4列・レーン件数    | ✅   |
| カレンダー：予定/タスク締切を種別アイコンで自動描き分け      | ✅   |
| 締切カラム：直近10件＋「他◯件」展開トグル                    | ✅   |
| 双方向ホバーハイライト（ボード⇄締切カラム⇄カレンダー）       | ✅   |
| 勤務地チップを各日の日付直下・縦置きに                       | ✅   |
| 時刻入力を15分刻みプルダウンに統一（`src/lib/time.ts` 集約） | ✅   |
| MiniRangeCalendar ドラッグ複数日選択                         | ✅   |
| 祝日自前計算（`src/lib/holidays.ts`・暫定）                  | ✅   |
| mockData を 18 active タスク・拡充予定で充実                 | ✅   |
| README.md 新規作成・仕様書 v1.5 更新                         | ✅   |

> 詳細は `.agents/changelog.md` を参照。

---

## Next Actions

| 優先 | タスク                                                                                                                                              | 状態 |
| :--: | --------------------------------------------------------------------------------------------------------------------------------------------------- | :--: |
|  1   | **実 DB 適用**（上記 Current Focus の手順）。CRUD / RLS / TZ / 並び順を目視検証                                                                     |  ◐   |
|  2   | fractional index 並び順の実 DB 検証（`src/lib/order.ts` 実装済み）                                                                                  |  ◐   |
|  3   | Step 12-13. **Google アカウント連携＋双方向同期**（`docs/google-calendar-setup.md`）。祝日も Google「日本の祝日」で置換（`holidays.ts` 暫定を撤去） |  ☐   |
|  4   | Step 16. **Cloudflare Pages デプロイ**                                                                                                              |  ☐   |
|  5   | **他アプリのセキュリティ修正**（別セッション）: 手順は `docs/supabase-security-audit.md`                                                            |  ☐   |

凡例: ☐ 未着手 / ◐ 進行中 / ✅ 完了

> 全 16 ステップの詳細追跡は `C:\Users\murak\.gemini\antigravity-ide\brain\5f2388c4-19ca-4350-b2a7-4da5cc780d19\task.md`

---

## 確定仕様・境界

| 項目               | 内容                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **リポジトリ**     | `https://github.com/shida-product/Ichimoku.git`（public、branch: `main`）                                         |
| **仕様正本**       | `task-board-spec-v1.md`（v1.5）                                                                                   |
| **操作モデル正本** | `prototype-overlay.html`                                                                                          |
| **デザイン正本**   | `src/index.css`（Google Blue 配色・セマンティックトークン必須・生の hex 禁止）                                    |
| **デザイン詳細**   | `docs/design.md`                                                                                                  |
| **技術スタック**   | Vite 8 + React 19 + TypeScript + Tailwind CSS v4（`@tailwindcss/vite`）                                           |
| **認証/DB**        | Supabase Auth + Postgres RLS（`using (auth.uid() = owner_id)`）+ スキーマ `ichimoku`                              |
| **カレンダー方式** | 自作 UI + Google Calendar API 双方向（`calendar.events` scope）。OAuth は Supabase Auth Google プロバイダに相乗り |
| **スキーマ隔離**   | `ichimoku` スキーマ。`public` への GRANT 禁止。`config push` 禁止                                                 |
| **Actとの境界**    | Ichimokuは独立アプリ。Actは外部の専属秘書型AIとして、人間と同じく許可されたTool経由で利用                         |
| **全体統治**       | プロジェクト間の関係・採用技術・共通原則はProject Grimoire、実装と詳細仕様は本リポジトリ                          |

### UI 設計原則（整理を生まない）

- 「整理を生まない／数値で急かさない」方針（ADR-0002）
- 中央モーダル封印・自動保存原則（予定詳細のみ保存ボタン例外）
- オーバーレイは常に 1 枚（`OverlayContext` で管理）
- 優先度・予定色は不採用。**締切時刻のみ**消化直結シグナルとして持つ
- カテゴリ・勤務地の色は `src/index.css` の `--cat-1..6` スロット参照（自由 hex 禁止）
- コンポーネントに生の hex や `zinc-*` 等を直書きせず、必ずセマンティックトークン経由

### プレビューモード

`VITE_PREVIEW_MOCK=true` または DEV かつ Supabase 未設定 → ログイン不要でモックデータ表示（本番無効）。`.env.example` 参照。
