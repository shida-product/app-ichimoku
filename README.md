# Ichimoku（イチモク）

> 利用者個人の日々の作業を **1 画面・遷移ゼロ** で消化していくタスク消化型ツール。
> タスクボード・締切・カレンダーを並置し、画面を切り替えずに「今やること」と「迫る締切」が一目で分かる。

---

## プロジェクト境界

Ichimokuは、利用者個人のタスクと予定を一か所で扱う独立アプリです。AIとは切り離して単独利用でき、個人AIの既定入口には標準Geminiを使います。

- リポジトリ名は、実体がアプリであることを示す`app-ichimoku`
- 人間はAIを介さず、Ichimokuを直接操作できる
- ActのAI社員としての開発は保留し、既存Gemは検証資産として保存する
- 将来のAI連携は標準Geminiを第一候補とし、特定のGemに依存しないTool/API境界で行う
- AI連携が停止してもIchimokuの基本機能は動作し続ける
- AnimaとFastはIchimokuの構成要素ではない
- 全体の統治・採用技術・プロジェクト間の関係はProject Grimoire、Ichimokuの実装と詳細仕様は本リポジトリを正本とする

---

## 北極星（設計の最上位原則）

**考えさせない・忘れさせない・整理させない。**
記憶や意志力に頼らせず、システム側が「今やること」と「迫る締切」を前へ押し出す。
この原則に反する機能（重い整理・手入力の多い計画機能、仕分けを増やす設定）は採用しない。

## コンセプト（3 カラム・1 画面）

| カラム                   | 役割                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| **締切**（左・常時）     | 締切のあるタスクを締切順に縦並びで常時表示。緊急度で色分けし、埋もれを防ぐ。                   |
| **タスクボード**（中央） | カテゴリ単位の単一リスト。ドラッグで並べ替え・カテゴリ移動、下部の完了ゾーンへドロップで消化。 |
| **カレンダー**（右）     | 今日起点の無限スクロール・アジェンダ。予定・締切・勤務地（その日の拠点）を表示。               |

入力・編集は画面を切り替えず、右からの **スライドイン（side-peek）** とアンカー **ポップ** で重ねて行う（中央モーダルは封印）。

---

## 技術スタック

| レイヤー     | 採用                                                     |
| ------------ | -------------------------------------------------------- |
| フロント     | Vite + React 19 + TypeScript                             |
| スタイル     | Tailwind CSS v4（`@tailwindcss/vite`）＋ shadcn/Radix UI |
| 状態/データ  | TanStack Query（楽観的更新）                             |
| ボード DnD   | dnd-kit                                                  |
| カレンダー   | 自作（無限スクロール・アジェンダ）                       |
| バックエンド | Supabase（Postgres + Auth + RLS）                        |
| サンプル公開 | GitHub Pages（公開・モック限定）                         |
| 本番 hosting | 未決定（Cloudflare Pages + Access等を候補に別途決定）    |

ルーティングは持たない（1 画面・遷移ゼロ）。ログイン ↔ メイン画面は `AuthContext` の状態で出し分ける。

## 提供段階

- 当初目標はSKによる個人利用。まず1人分の実DB動作と日常運用を完成させる。
- 将来社外へ提供する場合も、利用者ごとにURLやDBを分けず、1つのアプリとDBを共有する。
- 各行の`owner_id`とRLSで利用者データを分離し、利用者へSupabase登録や管理を求めない。
- 現在のSK共有Supabaseは個人検証に限って利用できる。社外ベータの前に、Ichimoku専用かつ組織所有の本番Supabaseプロジェクトへ分離する。
- GitHub Pagesは公開モックのサンプル共有専用であり、実DBや実利用者データを接続しない。

---

## セットアップ

前提: Node.js（`package.json` の各依存に準拠）。Windows では PowerShell から `npm.cmd` を使う。

```bash
npm install        # 依存インストール
npm run dev        # 開発サーバー（http://localhost:5173）
npm run build      # 型チェック（tsc -b）＋本番ビルド（dist/）
npm run lint       # ESLint
npm run format     # Prettier
```

### 環境変数（`.env.local`）

`.env.example` をコピーして設定する。

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# VITE_PREVIEW_MOCK=true   # 任意
```

- **プレビュー（モック）モード**: DEV かつ「Supabase 未設定」または `VITE_PREVIEW_MOCK=true` のとき、
  ログインを介さずメモリ内モックデータでメイン画面を表示する（本番ビルドでは常に無効）。
  D&D・追加・編集・並べ替えなどがネットワークなしで一通り触れるため、目視チェックに使う。
- 秘密情報（Supabase キー）はコード／チャットに出さない。`.env.local` は Danger Zone。

### Supabase（DB）

スキーマは [`supabase/migrations/`](supabase/migrations/) にある。Supabase プロジェクトに順に適用する。
全テーブルに `owner_id` ＋ RLS（`auth.uid() = owner_id`）を設定し、同一 DB でも完全に個人専用に隔離される。

> 注意: ビルドが出力フェーズで止まる場合、Windows のファイルロックが原因のことがある。
> `Remove-Item -Path dist -Recurse -Force` で `dist` を掃除してから再ビルドする。

---

## ディレクトリ構成（抜粋）

```
src/
  components/
    layout/AppShell.tsx        # 1画面・3カラムのベースシェル
    overlay/                   # SidePeek / AnchoredPopover
    ui/                        # shadcn ベースの汎用UI
  features/
    board/                     # タスクボード（Board/Lane/TaskCard/CompleteZone/DnD）
    deadlines/                 # 締切カラム（DeadlineRail）
    calendar/                  # カレンダー（Calendar/Agenda/EventDetailPanel/MiniRangeCalendar）
    tasks/                     # タスク詳細・完了履歴
    categories/ shifts/        # カテゴリ・勤務地の管理パネル
    auth/                      # 認証コンテキスト
    _shared/                   # 詳細パネル共通枠・ColorPicker・ManageListPanel
  store/
    AppDataContext.tsx         # 全データソース（TanStack Query + Supabase CRUD）
    OverlayContext.tsx         # オーバーレイ一元管理（常に1枚）
    mockData.ts                # プレビュー用モック
  lib/                         # types / date / time / palette / order / calendar / supabase ほか
supabase/migrations/           # DB スキーマ（RLS 込み）
docs/                          # 設計ドキュメント・ADR
```

---

## 主な機能

- タスク: クイック追加（Enter で未分類へ）／詳細 side-peek（自動保存・メモ・複数リンク・締切〔日付＋任意の時刻〕・対応中★）
- 締切: 締切順の常時一覧、緊急度の色分け、完了ゾーンへドラッグで消化
- 完了: 完了＝即アーカイブ → 完了履歴 side-peek（undo・新しい順）→ 30 日で物理削除
- カレンダー: 無限スクロール・アジェンダ。予定（保存ボタン式・日付はドラッグ/2クリックで複数日選択）と締切タスクを種別から自動で描き分け
- 勤務地: その日の拠点を日付の真下に色付きチップで表示（マスタ＋1日1割当）
- カテゴリ／勤務地の管理（追加・名称編集・色・並べ替え・削除）

> 設定を増やして「整理作業」を生まない方針（[ADR-0002](docs/adr/0002-task-event-fields-phase1.md)）。
> 優先度・予定の手動色分けは不採用。区別は種別から自動で描く。

---

## ドキュメント

| 種別                                    | ファイル                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 要件・データモデル・操作モデル（正本）  | [`task-board-spec-v1.md`](task-board-spec-v1.md)                                               |
| 操作モデルの実挙動リファレンス          | [`prototype-overlay.html`](prototype-overlay.html)                                             |
| デザイン（配色・トークン・レイアウト）  | [`docs/design.md`](docs/design.md)（実体は [`src/index.css`](src/index.css)）                  |
| 設計判断（ADR）                         | [`docs/adr/`](docs/adr/)                                                                       |
| Google カレンダー連携の準備手順（将来） | [`docs/google-calendar-setup.md`](docs/google-calendar-setup.md)                               |
| 個人AI入口と提供段階の判断              | [`docs/adr/0003-gemini-entry-personal-first.md`](docs/adr/0003-gemini-entry-personal-first.md) |

## ロードマップ（抜粋）

- ◐ Supabase 配線（実装済み・**実 DB 検証待ち**）／fractional index 並び順の実 DB 検証
- ☐ 標準Geminiから利用できる、AI非依存のIchimoku Tool/API境界を将来設計（Act連携は保留）
- ☐ Google アカウント連携＋カレンダー双方向同期（繰り返し予定 `rrule` もここで本格実装）
- ☐ 本番ホスティングとアクセス制御の決定（GitHub Pagesは公開モックのサンプル専用）
- ☐ 社外ベータ前に専用・組織所有のSupabaseプロジェクトへ分離

---

## 開発運用（AI エージェント）

本リポジトリは複数の AI エージェント・セッションで開発するため、運用の正本を [`.agents/`](.agents/) に置く
（起動・終了手順は [`.agents/BOOTSTRAP.md`](.agents/BOOTSTRAP.md)、行動指針は [`.agents/RULES.md`](.agents/RULES.md)）。
編集ロックの共有・引き継ぎ（handover）・教訓（lessons）をファイルで管理する。

## ライセンス

ライセンス未設定。GitHubリポジトリ`shida-product/app-ichimoku`はpublicですが、オープンソースライセンスによる再利用許諾は行っていません。
