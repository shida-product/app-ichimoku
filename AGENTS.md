# Codex / 汎用 AI 入口

> 共通ルールの正本：`C:/dev/keystone/rules/CORE.md`

Codex やその他の汎用 AI エージェント向け入口。
**手順の正本は `.agents/BOOTSTRAP.md`**。

## 作業前（必ず読む）

1. [.agents/BOOTSTRAP.md](.agents/BOOTSTRAP.md) — 起動・終了手順（正本）
2. [.agents/RULES.md](.agents/RULES.md) — 憲法
3. [.agents/handover.md](.agents/handover.md)
4. [.agents/state/locks.md](.agents/state/locks.md)
5. [.agents/lessons.md](.agents/lessons.md)

## 作業前（session-start）

[.agents/skills/session-start.md](.agents/skills/session-start.md) を実行。

## 作業後（session-close）

[.agents/skills/session-close.md](.agents/skills/session-close.md) を実行。

## 索引

- 全体像: [orchestration.md](.agents/orchestration.md)
- ツール別経路: [ADAPTERS.md](.agents/ADAPTERS.md)
- Claude 入口: `CLAUDE.md` / Antigravity 入口: `GEMINI.md`

## ビルド / テスト / Lint

`.agents/RULES.md` §7 を参照。
