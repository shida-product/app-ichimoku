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

### プロジェクト境界（2026-08-01更新）

Ichimokuは、個人のタスクと予定を扱う独立アプリ。個人AIの既定入口は標準Geminiとし、AIなしでも全基本機能を直接操作できる。全体統治はGrimoire、実装・詳細仕様の正本は本リポジトリ。

ActのAI社員としての開発とAct–Ichimoku連携は保留。既存Gemは検証資産として保存する。Ichimokuをタスク正本とし、Google Tasksは必須経路にしない。将来のAI連携は標準Geminiを第一候補に、AI非依存の認証済みTool/API境界で行う。判断の正本は[ADR-0003](../docs/adr/0003-gemini-entry-personal-first.md)。

初期目標はSKの個人利用。将来社外提供する場合も一つのURL・DBを`owner_id`＋RLSで利用者分離するが、社外ベータ前にIchimoku専用・組織所有の本番Supabaseプロジェクトへ移す。

2026-08-01にREADME、仕様書v1.7、ADR-0003、Google Calendar手順をこの方針へ統一済み。品質確認はPrettier合格、lint 0 error / 既存warning 7件、代替出力先でVite build成功。通常の`dist`出力だけはOneDrive/Windowsのファイルロックで終了コード1になる。

### ⚠ 最重要：実 DB 未適用（2026-06-21 現在）

コードは全機能実装済みだが、**Supabase には一切適用していない**。ローカルは `npm run dev` のプレビューモック（`IS_PREVIEW`）で動作確認する。リポジトリ改名後のbaseは`/app-ichimoku/`。

- 旧Tampermonkeyクイック追加とプレビュー用擬似UIは、ActをGemとして運用する方針への変更に伴い廃止。Gem起動ランチャーの正本は`agent-act`リポジトリへ移した。

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

共有 Supabase の `public` 同居アプリが anon 全公開（🔴）。対応手順・修正 SQL は **[docs/supabase-security-audit.md](../docs/supabase-security-audit.md)** に集約済み。

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

| 優先 | タスク                                                                                                   | 状態 |
| :--: | -------------------------------------------------------------------------------------------------------- | :--: |
|  1   | **個人利用の実 DB 適用**（上記 Current Focus の手順）。CRUD / RLS / TZ / 並び順を目視検証                |  ◐   |
|  2   | fractional index 並び順の実 DB 検証（`src/lib/order.ts` 実装済み）                                       |  ◐   |
|  3   | 個人の日常運用でタスク・予定・締切の不足と摩擦を記録し、品質ゲートを通す                                 |  ☐   |
|  4   | **Google アカウント連携＋双方向同期**は保留。複数接続・OAuth・競合をADR化後に着手                        |  ☐   |
|  5   | **AI非依存Tool/API境界**は将来設計。標準Geminiから安全に接続できる提供条件が整ってから着手               |  ☐   |
|  6   | **本番ホスティング決定**：GitHub Pagesは公開モックのサンプル専用。本番はCloudflare Pages等を比較して決定 |  ☐   |
|  7   | **社外ベータ準備**：専用・組織所有Supabase、利用規約、プライバシー、削除、バックアップ、OAuth検証        |  ☐   |
|  8   | **他アプリのセキュリティ修正**（別セッション）: 手順は `docs/supabase-security-audit.md`                 |  ☐   |
|  9   | **`.agents/changelog.md`の文字コード修復**：不正UTF-8と重複箇所を別タスクで保全・差分確認して復旧        |  ☐   |

凡例: ☐ 未着手 / ◐ 進行中 / ✅ 完了

> 全 16 ステップの詳細追跡は `C:\Users\murak\.gemini\antigravity-ide\brain\5f2388c4-19ca-4350-b2a7-4da5cc780d19\task.md`

---

## 確定仕様・境界

| 項目               | 内容                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **リポジトリ**     | `https://github.com/shida-product/app-ichimoku.git`（public、branch: `main`）                         |
| **仕様正本**       | `task-board-spec-v1.md`（v1.7）                                                                       |
| **操作モデル正本** | `prototype-overlay.html`                                                                              |
| **デザイン正本**   | `src/index.css`（Google Blue 配色・セマンティックトークン必須・生の hex 禁止）                        |
| **デザイン詳細**   | `docs/design.md`                                                                                      |
| **技術スタック**   | Vite 8 + React 19 + TypeScript + Tailwind CSS v4（`@tailwindcss/vite`）                               |
| **認証/DB**        | Supabase Auth + Postgres RLS（`using (auth.uid() = owner_id)`）+ スキーマ `ichimoku`                  |
| **カレンダー方式** | v1は自作UI・アプリ内予定。Google Calendar双方向同期は複数接続とOAuth境界のADR確定まで保留             |
| **スキーマ隔離**   | `ichimoku` スキーマ。`public` への GRANT 禁止。`config push` 禁止                                     |
| **AIとの境界**     | 個人AI入口は標準Gemini。Actは保留。将来連携はGemへDB権限を与えず、認証済みのAI非依存Tool/APIで行う    |
| **公開境界**       | GitHub Pagesは公開モックのサンプル専用。実DB設定・実利用者データを接続せず、本番ホスティングとは分離  |
| **提供境界**       | 初期はSK個人利用。社外ベータ前に専用・組織所有Supabaseへ分離し、同一DB内は`owner_id`＋RLSで利用者分離 |
| **全体統治**       | プロジェクト間の関係・採用技術・共通原則はProject Grimoire、実装と詳細仕様は本リポジトリ              |

### UI 設計原則（整理を生まない）

- 「整理を生まない／数値で急かさない」方針（ADR-0002）
- 中央モーダル封印・自動保存原則（予定詳細のみ保存ボタン例外）
- オーバーレイは常に 1 枚（`OverlayContext` で管理）
- 優先度・予定色は不採用。**締切時刻のみ**消化直結シグナルとして持つ
- カテゴリ・勤務地の色は `src/index.css` の `--cat-1..6` スロット参照（自由 hex 禁止）
- コンポーネントに生の hex や `zinc-*` 等を直書きせず、必ずセマンティックトークン経由

### プレビューモード

`VITE_PREVIEW_MOCK=true` または DEV かつ Supabase 未設定 → ログイン不要でモックデータ表示（本番無効）。`.env.example` 参照。
