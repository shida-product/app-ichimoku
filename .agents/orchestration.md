# AI オーケストレーション（概要）

複数 AI・複数エディタ・複数セッションに耐える **最小構成** の司令塔ドキュメント。
詳細手順は各 workflow に委譲し、ここでは全体像だけを示す。

## 設計原則

1. **正本は `.agents/` だけ** — ルール・状態・手順は git 管理。ツール非依存。
2. **AI / エディタの割当てはしない** — どのツールでも同じ手順で動く。
3. **人間は監査役** — コーディングは AI、人間はレビューと目視チェック。
4. **自律引き継ぎ** — 意味が変わった既存記録だけ更新し、locksは共有調整時だけ使う。
5. **コミットは関心事ごと・固まってから** — 逐一コミットしない。push は指示時のみ。

## 3 層モデル

| 層              | 場所                                      | 役割                                                               |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| **Core**        | `.agents/`                                | BOOTSTRAP, RULES, handover, locks, lessons, workflows, **skills/** |
| **Entry**       | `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`   | ツール起動時の導線                                                 |
| **Tool Skills** | `.cursor/` `.claude/` `.agent/` の skills | トリガーのみ → `.agents/skills/` を実行                            |
| **Editor**      | `.vscode/`                                | 推奨拡張・ワークスペース設定                                       |

索引: [ADAPTERS.md](ADAPTERS.md)

## セッションライフサイクル

[AGENTS.md](../AGENTS.md)を起点に、安全核・Git・Goalを確認し、必要な仕様と既存gateへ進む。終了は[session-close](workflows/session-close.md)で意味が変わった記録だけ更新する。

## 状態ファイルの役割分担

| ファイル         | 書く内容                   | 書かない内容       |
| ---------------- | -------------------------- | ------------------ |
| `handover.md`    | 復元不能な判断・人間待ち・外部状態 | Git由来の状態・完了済み詳細ログ   |
| `state/locks.md` | 編集中ファイル             | —                  |
| `lessons/`       | 再発防止の教訓             | —                  |
| `changelog.md`   | マイルストーンの判断理由   | ファイル単位の差分 |

## 参照先

| 目的               | ファイル                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| 起動・終了（正本） | [BOOTSTRAP.md](BOOTSTRAP.md)                                                                            |
| ツール別経路       | [ADAPTERS.md](ADAPTERS.md)                                                                              |
| 憲法               | [RULES.md](RULES.md)                                                                                    |
| スキル正本         | [skills/session-start.md](skills/session-start.md) / [skills/session-close.md](skills/session-close.md) |
| セッション開始     | [workflows/ai-session.md](workflows/ai-session.md)                                                      |
| セッション終了     | [workflows/session-close.md](workflows/session-close.md)                                                |
| ロック             | [state/locks.md](state/locks.md)                                                                        |
| Git                | [workflows/git-safety.md](workflows/git-safety.md)                                                      |
| 人間レビュー       | [workflows/review-checklist.md](workflows/review-checklist.md)                                          |
| 拡張機能・IDE同期  | [workflows/extensions.md](workflows/extensions.md)                                                      |
