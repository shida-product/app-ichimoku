// ==UserScript==
// @name         Ichimoku クイック追加（端タブ）
// @namespace    https://github.com/shida-product/app-ichimoku
// @version      0.1.0
// @description  どのサイトからでも、画面端の小さなタブから Ichimoku にタスクを素早く追加する。普段は控えめな細い帯。クリックで追加パネル、上下ドラッグで移動、左右端へ吸着（位置は記憶）。
// @author       Ichimoku
// @match        *://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      supabase.co
// ==/UserScript==

(function () {
  "use strict";

  // =========================================================================
  // 設定（ユーザーが各自で書き換える）
  //   - SUPABASE_URL / SUPABASE_ANON_KEY は Supabase ダッシュボードの
  //     Project Settings > API から取得する。
  //   - anon key は「公開前提」のキー（RLS で守られる）なのでここに書いてよい。
  //   - service_role キーやパスワードは絶対に書かない。
  //   - APP_URL は Ichimoku 本体アプリの URL（任意）。連携が無いときの誘導リンク用。
  //   - 自前ホスト等で *.supabase.co 以外を使う場合は、上の @connect も
  //     そのドメインに合わせて追記する。
  // -------------------------------------------------------------------------
  // 認証方針: 第三者ページではパスワードを入力させない。本体アプリ（信頼でき
  //   るオリジン）にログイン済みの Supabase セッションをこのスクリプトが読み取り、
  //   GM ストレージ経由で全サイトのクイック追加に共有する。トークンは refresh
  //   トークンで自動更新する（パスワードは扱わない）。
  // =========================================================================
  const SUPABASE_URL = "https://your-project.supabase.co";
  const SUPABASE_ANON_KEY = "your-supabase-anon-key";
  const APP_URL = ""; // 例: "https://ichimoku.example.com" / "http://localhost:5173"

  const CONFIGURED =
    !SUPABASE_URL.includes("your-project") && !SUPABASE_ANON_KEY.includes("your-supabase-anon-key");

  // GM ストレージのキー
  const K_SESSION = "imk_session"; // { access_token, refresh_token, expires_at, user_id, email }
  const K_POS = "imk_tab_pos"; // { side: 'left'|'right', topRatio: number }

  // ---- ストレージ ------------------------------------------------------------
  function loadSession() {
    try {
      return JSON.parse(GM_getValue(K_SESSION, "null"));
    } catch (e) {
      return null;
    }
  }
  function saveSession(s) {
    GM_setValue(K_SESSION, JSON.stringify(s));
  }
  function clearSession() {
    GM_deleteValue(K_SESSION);
  }
  function loadPos() {
    try {
      return JSON.parse(GM_getValue(K_POS, "null")) || { side: "right", topRatio: 0.5 };
    } catch (e) {
      return { side: "right", topRatio: 0.5 };
    }
  }
  function savePos(p) {
    GM_setValue(K_POS, JSON.stringify(p));
  }

  // ---- HTTP（GM_xmlhttpRequest でページの CSP を回避）------------------------
  function gmRequest(method, url, headers, body) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: method,
        url: url,
        headers: headers,
        data: body != null ? JSON.stringify(body) : undefined,
        onload: function (res) {
          let json = null;
          try {
            json = res.responseText ? JSON.parse(res.responseText) : null;
          } catch (e) {
            /* レスポンスが空 or 非 JSON */
          }
          if (res.status >= 200 && res.status < 300) {
            resolve({ status: res.status, json: json });
          } else {
            const msg =
              (json && (json.msg || json.error_description || json.message || json.error)) ||
              "HTTP " + res.status;
            reject(new Error(msg));
          }
        },
        onerror: function () {
          reject(new Error("通信に失敗しました（ネットワーク / @connect 設定を確認）"));
        },
        ontimeout: function () {
          reject(new Error("通信がタイムアウトしました"));
        },
        timeout: 15000,
      });
    });
  }

  // ---- 認証 ------------------------------------------------------------------
  // 本体アプリのオリジンでだけ存在する localStorage のセッションを読み取り、
  // GM ストレージへ同期する。これにより第三者ページではパスワードを扱わずに
  // クイック追加できる。（第三者ページにはこのキーは存在しないので何もしない）
  function syncSessionFromApp() {
    try {
      const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
      const raw = window.localStorage.getItem("sb-" + ref + "-auth-token");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // supabase-js v2 は session を直接、v1 は { currentSession } で保持する
      const d = (parsed && parsed.currentSession) || parsed;
      if (!d || !d.access_token) return;
      const session = {
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
        user_id: d.user && d.user.id,
        email: d.user && d.user.email,
      };
      const cur = loadSession();
      if (!cur || cur.access_token !== session.access_token) saveSession(session);
    } catch (e) {
      /* localStorage 不可 / 形式違いは無視 */
    }
  }

  async function refresh(session) {
    const res = await gmRequest(
      "POST",
      SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token",
      { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      { refresh_token: session.refresh_token }
    );
    const d = res.json || {};
    const next = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
      user_id: d.user && d.user.id,
      email: d.user && d.user.email,
    };
    saveSession(next);
    return next;
  }

  // 有効なアクセストークンを返す（必要なら自動リフレッシュ）
  async function getValidSession() {
    let session = loadSession();
    if (!session || !session.access_token) return null;
    if (Math.floor(Date.now() / 1000) > session.expires_at - 60) {
      session = await refresh(session);
    }
    return session;
  }

  // ---- タスク追加 ------------------------------------------------------------
  async function addTask(title) {
    const session = await getValidSession();
    if (!session) throw new Error("__NEED_LOGIN__");

    // 並び順: fractional index 本実装（Next Action #2）までの暫定。
    // タイムスタンプ文字列は数字始まりのため、英字始まりの既存キー（"a1" 等）より
    // 先に並ぶ＝未分類・未着手セルの上側に出る。手入力なら衝突はまず起きない。
    const position = String(Date.now());

    await gmRequest(
      "POST",
      SUPABASE_URL + "/rest/v1/tasks",
      {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + session.access_token,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      {
        title: title,
        owner_id: session.user_id,
        status: "todo",
        category_id: null, // 未分類で投入。分類は本体アプリで行う
        position: position,
      }
    );
  }

  // =========================================================================
  // UI（Shadow DOM でホストサイトの CSS から隔離）
  // =========================================================================
  const host = document.createElement("div");
  host.id = "ichimoku-quick-add-host";
  host.style.cssText = "all: initial;";
  (document.body || document.documentElement).appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  const TAB_W = 30;
  const TAB_H = 64;

  root.innerHTML = [
    "<style>",
    ":host { all: initial; }",
    "* { box-sizing: border-box; font-family: -apple-system, 'Hiragino Sans', 'Yu Gothic', sans-serif; }",
    "#tab {",
    "  position: fixed; width: " + TAB_W + "px; height: " + TAB_H + "px;",
    "  background: #b2542f; opacity: .55; border-radius: 10px 0 0 10px;",
    "  display: flex; align-items: center; justify-content: center; cursor: grab;",
    "  box-shadow: 0 2px 10px rgba(0,0,0,.18); z-index: 2147483000;",
    "  transition: opacity .15s ease, width .15s ease, transform .12s ease;",
    "  user-select: none; touch-action: none;",
    "}",
    "#tab:hover { opacity: 1; width: 36px; }",
    "#tab.dragging { cursor: grabbing; opacity: 1; transform: scale(1.04); }",
    "#tab.left { border-radius: 0 10px 10px 0; }",
    "#tab .plus { color: #fff; font-size: 20px; font-weight: 700; line-height: 1; pointer-events: none; }",
    "#panel {",
    "  position: fixed; width: 300px; background: #fbf8f1; border: 1px solid #e3dccb;",
    "  border-radius: 12px; box-shadow: 0 12px 40px rgba(40,30,20,.24); padding: 14px;",
    "  opacity: 0; transform: translateX(12px) scale(.98); pointer-events: none;",
    "  transition: opacity .14s ease, transform .14s ease; z-index: 2147483001;",
    "}",
    "#panel.left:not(.open) { transform: translateX(-12px) scale(.98); }",
    "#panel.open { opacity: 1; transform: translateX(0) scale(1); pointer-events: auto; }",
    ".ttl { font-size: 13px; color: #b2542f; font-weight: 700; margin: 0 0 8px; }",
    "input { width: 100%; border: 1px solid #d6cdb8; border-radius: 8px; padding: 9px 10px;",
    "  font-size: 14px; color: #33302a; background: #fff; outline: none; margin-bottom: 8px; }",
    "input:last-of-type { margin-bottom: 0; }",
    "input:focus { border-color: #b2542f; box-shadow: 0 0 0 3px rgba(178,84,47,.15); }",
    "input::placeholder { color: #a39a89; }",
    ".row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }",
    ".hint { font-size: 12px; color: #6f685c; }",
    ".hint kbd { background: #f3e3d8; border: 1px solid #e3dccb; border-radius: 5px; padding: 1px 6px;",
    "  font-size: 11px; color: #b2542f; }",
    ".link { font-size: 12px; color: #6f685c; cursor: pointer; background: none; border: none; padding: 0; }",
    ".link:hover { color: #b2542f; text-decoration: underline; }",
    ".btn { width: 100%; margin-top: 10px; padding: 9px; border: none; border-radius: 8px;",
    "  background: #b2542f; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }",
    ".btn:disabled { opacity: .6; cursor: default; }",
    ".err { color: #a8341f; font-size: 12px; margin-top: 8px; min-height: 0; }",
    ".muted { font-size: 12px; color: #6f685c; margin-bottom: 8px; }",
    "#toast {",
    "  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%) translateY(20px);",
    "  background: #b2542f; color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 13px;",
    "  box-shadow: 0 6px 20px rgba(178,84,47,.4); opacity: 0; pointer-events: none;",
    "  transition: opacity .2s, transform .2s; z-index: 2147483002;",
    "}",
    "#toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }",
    "</style>",
    '<div id="tab" title="ドラッグで移動 / クリックで追加"><span class="plus">＋</span></div>',
    '<div id="panel"></div>',
    '<div id="toast"></div>',
  ].join("\n");

  const tab = root.getElementById("tab");
  const panel = root.getElementById("panel");
  const toast = root.getElementById("toast");

  let pos = loadPos();

  function vh() {
    return window.innerHeight;
  }
  function vw() {
    return window.innerWidth;
  }

  function applyTabPos() {
    const top = Math.max(8, Math.min(vh() - TAB_H - 8, pos.topRatio * vh() - TAB_H / 2));
    tab.style.top = top + "px";
    if (pos.side === "right") {
      tab.style.right = "0px";
      tab.style.left = "auto";
      tab.classList.remove("left");
    } else {
      tab.style.left = "0px";
      tab.style.right = "auto";
      tab.classList.add("left");
    }
  }

  function applyPanelPos() {
    const rect = tab.getBoundingClientRect();
    const pTop = Math.max(8, Math.min(vh() - 220, rect.top - 10));
    panel.style.top = pTop + "px";
    if (pos.side === "right") {
      panel.style.right = TAB_W + 10 + "px";
      panel.style.left = "auto";
      panel.classList.remove("left");
    } else {
      panel.style.left = TAB_W + 10 + "px";
      panel.style.right = "auto";
      panel.classList.add("left");
    }
  }

  // ---- パネル内容（認証状態で出し分け）-------------------------------------
  function renderPanel() {
    if (!CONFIGURED) {
      panel.innerHTML =
        '<p class="ttl">設定が必要です</p>' +
        '<p class="muted">スクリプト冒頭の SUPABASE_URL と SUPABASE_ANON_KEY を、' +
        "あなたの Supabase プロジェクトの値に書き換えてください。</p>";
      return;
    }
    const session = loadSession();
    if (session && session.access_token) {
      panel.innerHTML =
        '<p class="ttl">＋ Ichimoku にタスクを追加</p>' +
        '<input id="title" type="text" placeholder="やることを入力…" autocomplete="off" />' +
        '<div class="row"><span class="hint"><kbd>Enter</kbd> で追加</span>' +
        '<button class="link" id="logout">' +
        (session.email ? session.email + " / " : "") +
        "ログアウト</button></div>" +
        '<div class="err" id="err"></div>';
      const title = root.getElementById("title");
      const err = root.getElementById("err");
      title.addEventListener("keydown", async function (e) {
        if (e.key === "Escape") return closePanel();
        if (e.key !== "Enter" || !title.value.trim()) return;
        const v = title.value.trim();
        title.value = "";
        err.textContent = "";
        try {
          await addTask(v);
          closePanel();
          showToast("タスクを追加しました ✓");
        } catch (ex) {
          if (ex.message === "__NEED_LOGIN__") {
            clearSession();
            renderPanel();
          } else {
            title.value = v;
            err.textContent = "追加に失敗: " + ex.message;
          }
        }
      });
      root.getElementById("logout").addEventListener("click", function () {
        clearSession();
        renderPanel();
      });
      setTimeout(function () {
        title.focus();
      }, 60);
    } else {
      // 連携なし: 第三者ページではパスワードを扱わない。本体アプリで
      // ログイン → そのタブをこのスクリプトが拾ってセッションを共有する。
      panel.innerHTML =
        '<p class="ttl">本体アプリでログインしてください</p>' +
        '<p class="muted">安全のため、ここではパスワードを入力しません。' +
        "Ichimoku 本体アプリにログイン済みのタブを開くと、自動で連携されます。</p>" +
        (APP_URL ? '<button class="btn" id="openApp">Ichimoku を開く</button>' : "") +
        '<div class="row"><span class="hint"></span>' +
        '<button class="link" id="recheck">連携を再確認</button></div>';
      if (APP_URL) {
        root.getElementById("openApp").addEventListener("click", function () {
          window.open(APP_URL, "_blank", "noopener");
        });
      }
      root.getElementById("recheck").addEventListener("click", function () {
        syncSessionFromApp();
        renderPanel();
      });
    }
  }

  // ---- 開閉 ------------------------------------------------------------------
  let open = false;
  function openPanel() {
    renderPanel();
    applyPanelPos();
    panel.classList.add("open");
    open = true;
  }
  function closePanel() {
    panel.classList.remove("open");
    open = false;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(function () {
      toast.classList.remove("show");
    }, 1600);
  }

  // ---- ドラッグ（つまみのみ・上下移動＋左右端スナップ）----------------------
  let dragging = false;
  let moved = false;
  let startY = 0;
  tab.addEventListener("pointerdown", function (e) {
    dragging = true;
    moved = false;
    startY = e.clientY;
    tab.classList.add("dragging");
    tab.setPointerCapture(e.pointerId);
    closePanel();
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    if (Math.abs(e.clientY - startY) > 3) moved = true;
    pos.topRatio = Math.max(0, Math.min(1, e.clientY / vh()));
    pos.side = e.clientX < vw() / 2 ? "left" : "right";
    applyTabPos();
  });
  window.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    tab.classList.remove("dragging");
    applyTabPos();
    savePos(pos);
  });
  tab.addEventListener("click", function () {
    if (moved) {
      moved = false;
      return;
    }
    open ? closePanel() : openPanel();
  });

  // 外側クリックで閉じる
  document.addEventListener(
    "mousedown",
    function (e) {
      if (!open) return;
      const path = e.composedPath ? e.composedPath() : [];
      if (path.indexOf(panel) === -1 && path.indexOf(tab) === -1) closePanel();
    },
    true
  );

  window.addEventListener("resize", function () {
    applyTabPos();
    if (open) applyPanelPos();
  });

  // 端タブが被って邪魔なサイト向けの保険：拡張メニューからも開ける（画面に常駐しない）
  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("Ichimoku: タスクを追加", function () {
      if (!open) openPanel();
    });
  }

  // 本体アプリのオリジンならログイン済みセッションを拾って全サイトへ共有する
  syncSessionFromApp();

  applyTabPos();
})();
