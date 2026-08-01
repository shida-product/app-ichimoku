# Google カレンダー連携 セットアップ手順書（双方向・読み書き）

> **Status: deferred / legacy single-account draft（2026-08-01）**
>
> 個人版Ichimokuの実DB検証を優先するため、現時点ではこの手順を実行しない。複数Googleアカウントの接続単位、トークン保存、書き込み先選択、失効・削除手順をADRで確定してから更新する。標準GeminiはAI入口の候補であり、Act GemやGoogle Tasksを前提にしない。社外提供前にはOAuth同意画面、検証、プライバシーポリシー、専用本番環境を改めて確認する。

> 目的: Ichimoku の自作カレンダーに Google カレンダーの予定を表示し、アプリ側から予定の作成・編集も行えるようにする（双方向）。
> この手順書は **君（人間）が Google Cloud / Supabase の管理画面で行う作業** をまとめたもの。コード側は別途 AI が実装する。
> 所要時間: 約 20〜30 分。費用: **無料**（API 利用料なし。テストユーザー枠なら審査も不要）。

---

## 0. 前提と全体像

| 項目           | 値                                                                  |
| -------------- | ------------------------------------------------------------------- |
| 同期方向       | 双方向（読み書き）                                                  |
| 使用スコープ   | `https://www.googleapis.com/auth/calendar.events`（予定の読み書き） |
| 認証基盤       | Supabase Auth の Google プロバイダ（既存の Supabase Auth に相乗り） |
| テストユーザー | btb.grandioso.08@gmail.com（自分）                                  |
| 料金           | API 無料 / テスト段階は審査不要（最大100人まで手動登録）            |

全体の流れ:

```
[Google Cloud]
  プロジェクト作成 → Calendar API 有効化 → OAuth 同意画面設定（テストユーザー登録）
       → OAuth クライアントID（Web）発行 → クライアントID / シークレット取得
                                   ↓
[Supabase]
  Authentication → Providers → Google を有効化 → クライアントID / シークレット登録
       → コールバックURLを Google 側のリダイレクトURIに登録（相互設定）
                                   ↓
[AI に渡す]
  クライアントID / シークレット / プロジェクトURL を共有 → コード実装へ
```

---

## 1. Google Cloud プロジェクト作成

1. https://console.cloud.google.com/ にログイン（連携したい Google アカウントで）。
2. 画面上部のプロジェクト選択ドロップダウン →「新しいプロジェクト」。
3. プロジェクト名: 例 `ichimoku` → 「作成」。
4. 作成後、上部ドロップダウンでそのプロジェクトが選択されていることを確認。

---

## 2. Google Calendar API を有効化

1. 左メニュー（≡）→「API とサービス」→「ライブラリ」。
2. 検索窓に `Google Calendar API` と入力 → ヒットしたものをクリック。
3. 「有効にする」をクリック。

---

## 3. OAuth 同意画面の設定

1. 左メニュー →「API とサービス」→「OAuth 同意画面」。
2. User Type は **「外部」** を選択 →「作成」。
   - （Google Workspace 組織内のみで使うなら「内部」も可。個人 Gmail なら「外部」）
3. アプリ情報を入力:
   - アプリ名: `Ichimoku`
   - ユーザーサポートメール: btb.grandioso.08@gmail.com
   - デベロッパーの連絡先メール: btb.grandioso.08@gmail.com
   - （ロゴ・ドメインは今は空でOK）→「保存して次へ」。
4. **スコープ**画面:
   - 「スコープを追加または削除」をクリック。
   - フィルタ欄に `calendar.events` と入力。
   - `.../auth/calendar.events`（Google カレンダーの予定の表示・編集・共有・完全な削除）にチェック →「更新」。
   - →「保存して次へ」。
5. **テストユーザー**画面:
   - 「+ ADD USERS」→ `btb.grandioso.08@gmail.com` を追加 →「保存して次へ」。
   - ※ ここに登録したアカウントだけが、審査なしで連携できる（最大100人）。
6. 概要を確認 →「ダッシュボードに戻る」。
   - 公開ステータスは **「テスト」** のままでOK（一般公開する時だけ審査申請する）。

---

## 4. OAuth クライアント ID（Web アプリ）を発行

1. 左メニュー →「API とサービス」→「認証情報」。
2. 上部「+ 認証情報を作成」→「OAuth クライアント ID」。
3. アプリケーションの種類: **「ウェブ アプリケーション」**。
4. 名前: 例 `ichimoku-web`。
5. **承認済みのリダイレクト URI** に以下を追加（**ここが超重要**）:

   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```

   - `<PROJECT_REF>` は Supabase プロジェクト固有の文字列。
   - 見つけ方: Supabase ダッシュボード → 対象プロジェクト → Project Settings → Data API（または API） に表示される `Project URL`（例 `https://abcdefgh.supabase.co`）の `https://` と `.supabase.co` の間。
   - 正確な URL は次章「6. Supabase 側」でも Supabase 画面にそのまま表示されるので、それをコピペするのが確実。

6. 「作成」をクリック。
7. ポップアップに表示される **クライアント ID** と **クライアント シークレット** を控える（後でコピーできるが、ここで保存しておくと楽）。

---

## 5. （任意）ローカル開発用リダイレクトの確認

- Google 側に登録するリダイレクト URI は **Supabase の callback だけ** でよい（`localhost` は Google 側に登録不要）。
- アプリの戻り先（`http://localhost:5173` など）は **Supabase の Redirect URLs 許可リスト** 側で設定する（次章）。Google 側ではない。

---

## 6. Supabase 側で Google プロバイダを有効化

1. Supabase ダッシュボード → 対象プロジェクト → 左メニュー「Authentication」→「Providers」（または「Sign In / Providers」）。
2. 一覧から **Google** を選択し、トグルを ON。
3. 次を入力:
   - **Client ID (for OAuth)**: 手順4で取得したクライアント ID
   - **Client Secret (for OAuth)**: 手順4で取得したクライアント シークレット
4. 同じ画面に表示される **Callback URL (for OAuth)** をコピー。
   - これが `https://<PROJECT_REF>.supabase.co/auth/v1/callback`。
   - **手順4-5でこの値を Google のリダイレクト URI に登録していなければ、ここで戻って登録する**（相互一致が必須）。
5. 「Save」。
6. 左メニュー「Authentication」→「URL Configuration」:
   - **Site URL**: 開発中は `http://localhost:5173`（Vite の既定ポート。実際のポートに合わせる）。本番は採用した本番ホスティングのURL。公開モック専用のGitHub Pages URLは本番OAuthへ登録しない。
   - **Redirect URLs** に `http://localhost:5173/**` を追加（開発用）。本番 URL も後で追加。

---

## 7. リフレッシュトークンに関する注意（双方向の肝）

双方向（書き込み）では、ユーザーが画面を離れてもトークンを更新できる **リフレッシュトークン** が要る。これはコード側で `access_type=offline` と `prompt=consent` を付けてリクエストする（AI 実装担当が対応）。

→ **君の作業としては特になし。** 「初回の連携時に Google の同意画面がもう一度出る」程度の体感差だけ覚えておけばOK。

---

## 8. 完了後、AI に渡すもの

以下を共有してくれれば実装に入れる（シークレットはチャットに貼らず、安全な方法で渡すのが理想だが、ローカル開発なら `.env.local` に直接記入でも可）:

| 渡すもの                              | 用途                                               | 置き場所                                 |
| ------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| Supabase Project URL                  | 既存                                               | `.env.local` の `VITE_SUPABASE_URL`      |
| Supabase anon key                     | 既存                                               | `.env.local` の `VITE_SUPABASE_ANON_KEY` |
| Google クライアント ID / シークレット | Supabase 管理画面に登録済みなら **コードには不要** | Supabase 側に保存済み                    |

※ Google のクライアント ID / シークレットは **Supabase の管理画面に入れるだけ** で、アプリのコードや `.env` に書く必要はない（Supabase が OAuth を仲介するため）。コード側は Supabase の `signInWithOAuth({ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/calendar.events', queryParams: { access_type: 'offline', prompt: 'consent' } } })` を呼ぶだけ。

---

## 9. 一般公開（多人数配布）するときだけ必要になること

- OAuth 同意画面を「テスト」→「本番環境に公開」に変更。
- `calendar.events` は機微スコープのため **Google の検証（無料・審査あり）** が必要になる。
- 提出物: プライバシーポリシー URL、アプリのデモ動画、ドメイン所有権の確認など。
- **今のフェーズ（自分＋少人数）では不要。** テストユーザー枠で運用する限り審査なしで使える。

---

## チェックリスト（この通りに進めば完了）

- [ ] Google Cloud でプロジェクト作成
- [ ] Google Calendar API を有効化
- [ ] OAuth 同意画面: 外部 / アプリ名 / サポートメール
- [ ] スコープ `calendar.events` を追加
- [ ] テストユーザーに自分のメールを登録
- [ ] OAuth クライアント ID（Web）を発行
- [ ] リダイレクト URI に Supabase callback を登録
- [ ] Supabase で Google プロバイダ ON + Client ID/Secret 登録
- [ ] Supabase の URL Configuration に Site URL / Redirect URLs を設定
- [ ] クライアント ID/シークレットが Google と Supabase で一致していることを確認
