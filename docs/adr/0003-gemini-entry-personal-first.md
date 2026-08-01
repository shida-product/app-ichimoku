# ADR-0003: 標準Geminiを個人AI入口としIchimokuの個人利用を優先する

Status: accepted

Date: 2026-08-01

## Context

ActをクラシックGemとして試作し、仕事用・個人用GoogleアカウントでCalendarとTasksの基本操作を検証した。壁打ち、整理、要約、Google Workspace連携は標準Geminiでも行えるため、Actを汎用AI社員として開発すると機能が重複する。

Ichimokuの固有価値はAIの人格ではなく、個人のタスク、締切、予定を1画面・遷移ゼロで可視化し、本人が確実に手修正できることにある。Google Tasksを中継するとタスク正本が二つになり、同期競合と確認対象が増える。

## Decision

- 当初目標はSKによる個人利用とし、実DBでの日常運用を先に完成させる。
- 個人利用のAI入口は標準Geminiとする。
- ActのAI社員としての開発とAct–Ichimoku直接連携は保留する。
- Ichimokuをタスクの正本とし、Google Tasksへの接続を必須にしない。
- タスクと予定は別エンティティ、別入口、別表示として維持する。
- Google Calendar連携は将来機能とし、複数アカウントの接続境界とOAuth運用を先に決める。
- 将来のAI連携は、標準Geminiを第一候補に、AIの種類へ依存しない認証済みTool/API境界で実装する。
- 標準GeminiのメモリがIchimoku操作を妨げる実例が確認された場合だけ、用途限定Gemによるメモリ分離を検討する。
- フロントエンドはVite + React + TypeScript、認証とDBはSupabase Auth + Postgres + RLSを維持する。現在の要件にNext.js等のサーバーフレームワークを追加する根拠はない。

## 提供境界

- GitHub Pagesは実データを接続しない公開モックのサンプル共有専用とする。
- 本番利用者は一つのIchimoku URLを使い、利用者ごとにSupabaseを登録・管理しない。
- 同一アプリ・同一DB内のデータは`owner_id`とRLSで利用者ごとに分離する。
- SKの共有Supabaseは個人検証に限る。社外ベータ前にIchimoku専用かつ組織所有の本番Supabaseプロジェクトへ分離する。
- 社外提供では利用規約、プライバシーポリシー、データ削除、障害対応、バックアップ、OAuth検証を品質ゲートへ追加する。

## Consequences

- 利用者が確認する主な対象は標準GeminiとIchimokuの二つになる。
- Actの再開やGoogle Tasks同期より、Ichimoku本体の実DB品質を優先できる。
- GeminiからIchimokuを直接操作する機能は、適切なTool/API接続方式が利用可能になるまで提供しない。
- Supabaseの現在の構成は個人検証には使えるが、社外提供の本番構成とはみなさない。

## Strongest objection

標準Geminiに統合すると、一般的な会話メモリが業務操作へ混入し、Act固有の役割境界が失われる可能性がある。ただし現時点で実害は確認されていない。先に専用Gemを常用すると入口と保守対象を増やすため、実害が継続して確認された時点でメモリ分離Gemを追加する方が可逆的である。

## Revisit conditions

- 標準Geminiから認証済みの外部Tool/APIを安定して呼べる。
- 標準Geminiのメモリ干渉が再現可能な運用障害になる。
- Google Tasksまたは複数Google Calendarとの同期が、日常利用で明確に必要になる。
- 社外ベータへ進む判断が確定する。
