# ADAPTERS — ツール別の読み込み経路

正本は常に `.agents/`。各ツールは **Adapter 層** 経由で同じ内容に到達する。

## 4 層モデル

| 層              | 場所                   | 役割                                                          |
| --------------- | ---------------------- | ------------------------------------------------------------- |
| **Core**        | `.agents/`             | RULES, BOOTSTRAP, handover, locks, lessons, workflows, skills |
| **Entry**       | ルートの `*.md`        | ツール起動時の最初の導線                                      |
| **Tool Skills** | 下表の skills フォルダ | トリガー用（中身は `.agents/skills/` を実行）                 |
| **Editor**      | `.vscode/`             | 拡張推奨・ワークスペース設定                                  |

## ツール別マトリクス

| ツール           | 常時読み込み            | プロジェクト skills            | 起動・終了の正本       |
| ---------------- | ----------------------- | ------------------------------ | ---------------------- |
| **Cursor**       | `.cursor/rules/*.mdc`   | `.cursor/skills/*/SKILL.md`    | `.agents/BOOTSTRAP.md` |
| **Antigravity**  | `GEMINI.md`             | `.agent/skills/*/SKILL.md`     | 同上                   |
| **Claude Code**  | `CLAUDE.md`（`@` 展開） | `.claude/skills/*/SKILL.md`    | 同上                   |
| **Codex / 汎用** | `AGENTS.md`             | （なし・BOOTSTRAP を直接読む） | 同上                   |

## 共通の取得契約

[AGENTS.md](../AGENTS.md)だけが開始・再開条件を定義する。BOOTSTRAPとskillsはその入口。CLAUDEの自動importはAGENTSのみで、RULES・仕様・教訓の追加取得はAGENTSの条件による。宣言量と実際の読込ログは区別する。

## skills の二重管理をしない

| 正本（手順の中身） | `.agents/skills/session-start.md` / `session-close.md` |
| Adapter（トリガーのみ） | `.cursor/` `.claude/` `.agent/` の各 `SKILL.md` |

Adapter の `SKILL.md` は「`.agents/skills/xxx.md` の手順を実行せよ」とだけ書く。

## IDE 固有（git 管理外）

| 拡張                          | ツール                 |
| ----------------------------- | ---------------------- |
| `jlcodes.antigravity-cockpit` | Antigravity            |
| `anysphere.cursorpyright`     | Cursor                 |
| `anthropic.claude-code`       | 任意（ターミナル併用） |
