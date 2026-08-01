# Encoding Lessons

## 📌 Master Rules

1. **ファイルの文字コードは UTF-8 を正とする**（`.editorconfig` / `.vscode/settings.json` と整合）。
2. **Windows PowerShell の `Set-Content` や `>` リダイレクトでソースファイルを書き換えない**。
3. 日本語を含む Git 出力は UTF-8 で読み取る（`.agents/workflows/terminal-encoding.md` 参照）。

---

### 2026-06-05 [Encoding][Windows] PowerShell リダイレクトはソースファイル破損の原因

- **❌ Anti-pattern:**
  `Get-Content file.py | ... | Set-Content file.py` や `echo ... > file.md` で日本語ファイルを上書きする。

- **✅ Solution / Rule:**
  ファイル編集はエディタの書き込み API または AI の専用編集ツールを使う。ターミナル出力の保存が必要な場合は `[System.IO.File]::WriteAllText()` で UTF-8 明示。

### 2026-08-01 [Encoding][Markdown] 不正UTF-8を含む履歴ファイルを通常編集しない

- **❌ Anti-pattern:**
  編集ツールが不正UTF-8を検出したファイルを、文字化けした表示結果からそのまま上書きして履歴を失う。

- **✅ Solution / Rule:**
  対象ファイルの編集を止め、文字コードと破損範囲を別タスクで確認する。復旧時は元ファイルを保持したうえで変換結果を差分確認し、通常の機能変更と混ぜない。

---

> 教訓数: 2 / 最終追記: 2026-08-01 / Master Rules: 3
