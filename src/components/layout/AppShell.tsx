import { LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useAppData } from "@/store/AppDataContext";
import { useOverlay } from "@/store/OverlayContext";
import { Button } from "@/components/ui/button";
import { SidePeek } from "@/components/overlay/SidePeek";
import { Board } from "@/features/board/Board";
import { BoardDndProvider } from "@/features/board/BoardDndProvider";
import { HighlightProvider } from "@/features/board/HighlightContext";
import { Calendar } from "@/features/calendar/Calendar";
import { DeadlineRail } from "@/features/deadlines/DeadlineRail";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { CompletedHistory } from "@/features/tasks/CompletedHistory";
import { CategoryManager } from "@/features/categories/CategoryManager";
import { EventDetailPanel } from "@/features/calendar/EventDetailPanel";
import { ShiftManager } from "@/features/shifts/ShiftManager";

/**
 * AppShell — 1画面・遷移ゼロのベースレイアウト（仕様 §7 / §3.7）。
 * トップバー＋3カラム（近日締切｜タスクボード｜カレンダー）を固定配置し、
 * 編集・追加はオーバーレイ（side-peek）で重ねる。近日締切を左カラムに常時縦並びで置くことで
 * 見落としを防ぐ。タスク追加・予定追加の入口は各ブロックのヘッダに配置し、
 * 追加と編集は同一の詳細パネルに一本化している。
 */
export function AppShell() {
  const { user, signOut } = useAuth();
  const { tasks, deleteTask } = useAppData();
  const { active, close } = useOverlay();

  // 閉じる際、空のまま終えた下書きタスク（追加直後で未入力）は破棄する。
  // 予定は保存ボタン式（option B）で保存時のみ作成するため、破棄処理は不要。
  const closePeek = () => {
    if (active.kind === "task" && active.draft) {
      const t = tasks.find((x) => x.id === active.taskId);
      if (t && !t.title.trim()) deleteTask(t.id);
    }
    close();
  };

  // side-peek（task / category / event / history / shiftTypes）の中身を 1 枚で出し分け
  const peek =
    active.kind === "task"
      ? { label: "タスク", node: <TaskDetailPanel taskId={active.taskId} onClose={closePeek} /> }
      : active.kind === "category"
        ? { label: "カテゴリ管理", node: <CategoryManager onClose={closePeek} /> }
        : active.kind === "event"
          ? {
              label: active.eventId ? "予定" : "予定を追加",
              node: (
                <EventDetailPanel
                  key={active.eventId ?? "new"}
                  eventId={active.eventId}
                  initialDate={active.initialDate}
                  onClose={closePeek}
                />
              ),
            }
          : active.kind === "history"
            ? { label: "完了履歴", node: <CompletedHistory onClose={closePeek} /> }
            : active.kind === "shiftTypes"
              ? { label: "勤務地管理", node: <ShiftManager onClose={closePeek} /> }
              : null;

  return (
    <div className="mx-auto flex h-screen w-full max-w-[1900px] flex-col overflow-hidden">
      {/* ── トップバー ── */}
      <header className="flex items-center gap-3 px-[22px] pt-[14px] pb-2">
        <h1 className="m-0 font-display text-[22px] font-bold tracking-[0.04em]">Ichimoku</h1>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground md:inline">
            {user?.email ?? "プレビュー（モックデータ）"}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut />
            ログアウト
          </Button>
        </div>
      </header>

      {/* ── 本体（3カラム: 近日締切｜タスクボード｜カレンダー）──
          近日締切とボードを同一 DnD 文脈に置き、締切カードを完了ゾーンへドロップ可能に。
          HighlightProvider で締切カード ⇄ ボードのホバー連動（該当タスク強調）を共有する。
          各カラムは grid 子要素として縦に伸びて高さが揃う。lg 未満では縦積みにフォールバック。
          カレンダーは快適幅で上限固定し、余った横幅はボードへ（列が増える）。 */}
      <HighlightProvider>
        <BoardDndProvider>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-[22px] pt-2 pb-4 lg:grid-cols-[minmax(220px,260px)_1fr_minmax(340px,460px)]">
            <DeadlineRail />
            <Board />
            <Calendar />
          </div>
        </BoardDndProvider>
      </HighlightProvider>

      {/* side-peek（1 枚） */}
      <SidePeek
        open={peek !== null}
        onOpenChange={(o) => !o && closePeek()}
        label={peek?.label ?? "詳細パネル"}
      >
        {peek?.node}
      </SidePeek>
    </div>
  );
}
