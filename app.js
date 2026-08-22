(() => {
  const STORAGE_KEY = "jot-items-v1";

  /** @typedef {{id:string,title:string,note:string,type:'inbox'|'task'|'idea',due:string|null,done:boolean,createdAt:number}} Item */

  /** @returns {Item[]} */
  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to load items", e);
      return [];
    }
  }

  /** @param {Item[]} items */
  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  const NOTES_STORAGE_KEY = "jot-daily-notes-v1";

  /** @returns {Record<string,string>} */
  function loadDailyNotes() {
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("Failed to load daily notes", e);
      return {};
    }
  }

  function saveDailyNotes(notes) {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }

  let items = loadItems();
  let dailyNotes = loadDailyNotes();

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDue(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function dateStrFromTimestamp(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDayHeading(dateStr) {
    if (dateStr === todayStr()) return "Today";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  const TYPE_LABELS = { inbox: "Inbox", task: "Task", idea: "Idea" };

  // ---------- Capture ----------
  const captureTitle = document.getElementById("capture-title");
  const captureNote = document.getElementById("capture-note");
  const captureSave = document.getElementById("capture-save");

  captureSave.addEventListener("click", () => {
    const title = captureTitle.value.trim();
    const note = captureNote.value.trim();
    if (!title && !note) return;

    items.unshift({
      id: uid(),
      title: title || note.slice(0, 60),
      note: title ? note : "",
      type: "inbox",
      due: null,
      done: false,
      createdAt: Date.now(),
    });
    saveItems(items);
    captureTitle.value = "";
    captureNote.value = "";
    captureTitle.focus();
    render();
  });

  captureTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      captureSave.click();
    }
  });

  // ---------- Nav ----------
  const navButtons = document.querySelectorAll(".nav-btn");
  const views = document.querySelectorAll(".view");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.view;
      views.forEach((v) => v.classList.toggle("active", v.id === `view-${target}`));
    });
  });

  // ---------- Rendering ----------
  function renderList(listEl, emptyEl, list, kind) {
    listEl.innerHTML = "";
    emptyEl.classList.toggle("show", list.length === 0);

    list.forEach((item) => {
      const li = document.createElement("li");
      li.className = "item";

      if (kind === "tasks") {
        const check = document.createElement("div");
        check.className = "item-check" + (item.done ? " checked" : "");
        check.textContent = item.done ? "✓" : "";
        check.addEventListener("click", (e) => {
          e.stopPropagation();
          item.done = !item.done;
          saveItems(items);
          render();
        });
        li.appendChild(check);
      }

      const body = document.createElement("div");
      body.className = "item-body";

      const title = document.createElement("div");
      title.className = "item-title" + (item.done ? " done" : "");
      title.textContent = item.title;
      body.appendChild(title);

      if (item.note) {
        const note = document.createElement("div");
        note.className = "item-note";
        note.textContent = item.note;
        body.appendChild(note);
      }

      if (item.type === "task" && item.due) {
        const meta = document.createElement("div");
        meta.className = "item-meta";
        const badge = document.createElement("span");
        const overdue = !item.done && item.due < todayStr();
        badge.className = "due-badge" + (overdue ? " overdue" : "");
        badge.textContent = (overdue ? "Overdue: " : "Due ") + formatDue(item.due);
        meta.appendChild(badge);
        body.appendChild(meta);
      }

      li.appendChild(body);

      const chevron = document.createElement("div");
      chevron.className = "item-chevron";
      chevron.textContent = "›";
      li.appendChild(chevron);

      li.addEventListener("click", () => openSheet(item.id));
      listEl.appendChild(li);
    });
  }

  function render() {
    const inbox = items.filter((i) => i.type === "inbox").sort((a, b) => b.createdAt - a.createdAt);
    const tasks = items
      .filter((i) => i.type === "task")
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.due && b.due) return a.due < b.due ? -1 : 1;
        if (a.due) return -1;
        if (b.due) return 1;
        return b.createdAt - a.createdAt;
      });
    const ideas = items.filter((i) => i.type === "idea").sort((a, b) => b.createdAt - a.createdAt);

    renderList(document.getElementById("inbox-list"), document.getElementById("inbox-empty"), inbox, "inbox");
    renderList(document.getElementById("tasks-list"), document.getElementById("tasks-empty"), tasks, "tasks");
    renderList(document.getElementById("ideas-list"), document.getElementById("ideas-empty"), ideas, "ideas");

    document.getElementById("inbox-count").textContent = inbox.length || "";
    document.getElementById("tasks-count").textContent = tasks.filter((t) => !t.done).length || "";
    document.getElementById("ideas-count").textContent = ideas.length || "";

    renderDailyFeed();
  }

  function renderDailyFeed() {
    const feed = document.getElementById("daily-feed");
    feed.innerHTML = "";

    const itemsByDate = new Map();
    items.forEach((item) => {
      const date = dateStrFromTimestamp(item.createdAt);
      if (!itemsByDate.has(date)) itemsByDate.set(date, []);
      itemsByDate.get(date).push(item);
    });

    const dates = new Set([todayStr(), ...Object.keys(dailyNotes).filter((d) => dailyNotes[d].trim()), ...itemsByDate.keys()]);
    const sortedDates = [...dates].sort((a, b) => (a < b ? 1 : -1));

    sortedDates.forEach((date) => {
      const card = document.createElement("div");
      card.className = "day-card";

      const heading = document.createElement("div");
      heading.className = "day-heading";
      heading.textContent = formatDayHeading(date);
      card.appendChild(heading);

      const noteBox = document.createElement("textarea");
      noteBox.className = "day-note";
      noteBox.placeholder = date === todayStr() ? "Write today's notes / to-dos…" : "No notes for this day.";
      noteBox.rows = 4;
      noteBox.value = dailyNotes[date] || "";
      noteBox.addEventListener("input", () => {
        dailyNotes[date] = noteBox.value;
        saveDailyNotes(dailyNotes);
      });
      card.appendChild(noteBox);

      const dayItems = (itemsByDate.get(date) || []).sort((a, b) => a.createdAt - b.createdAt);
      if (dayItems.length) {
        const log = document.createElement("ul");
        log.className = "day-log";
        dayItems.forEach((item) => {
          const li = document.createElement("li");
          li.className = "day-log-item";

          const badge = document.createElement("span");
          badge.className = `type-badge type-${item.type}`;
          badge.textContent = TYPE_LABELS[item.type];
          li.appendChild(badge);

          const text = document.createElement("span");
          text.className = "day-log-title" + (item.done ? " done" : "");
          text.textContent = item.title;
          li.appendChild(text);

          li.addEventListener("click", () => openSheet(item.id));
          log.appendChild(li);
        });
        card.appendChild(log);
      }

      feed.appendChild(card);
    });
  }

  // ---------- Sheet (edit / sort) ----------
  const sheet = document.getElementById("sheet");
  const sheetBackdrop = document.getElementById("sheet-backdrop");
  const sheetTitle = document.getElementById("sheet-title");
  const sheetNote = document.getElementById("sheet-note");
  const sheetDueRow = document.getElementById("sheet-due-row");
  const sheetDue = document.getElementById("sheet-due");
  const sheetSortActions = document.getElementById("sheet-sort-actions");

  let editingId = null;
  let pendingType = null;

  function openSheet(id) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    editingId = id;
    pendingType = item.type;

    sheetTitle.value = item.title;
    sheetNote.value = item.note;
    sheetDue.value = item.due || "";

    sheetSortActions.style.display = item.type === "inbox" ? "flex" : "none";
    sheetDueRow.classList.toggle("hidden", pendingType !== "task");

    sheetBackdrop.classList.add("show");
    sheet.classList.add("show");
  }

  function closeSheet() {
    sheetBackdrop.classList.remove("show");
    sheet.classList.remove("show");
    editingId = null;
    pendingType = null;
  }

  sheetBackdrop.addEventListener("click", closeSheet);
  document.getElementById("sheet-cancel").addEventListener("click", closeSheet);

  document.querySelectorAll("[data-make]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingType = btn.dataset.make; // 'task' or 'idea'
      sheetSortActions.style.display = "none";
      sheetDueRow.classList.toggle("hidden", pendingType !== "task");
    });
  });

  document.getElementById("sheet-save").addEventListener("click", () => {
    const item = items.find((i) => i.id === editingId);
    if (!item) return;

    const title = sheetTitle.value.trim();
    if (!title) {
      sheetTitle.focus();
      return;
    }

    item.title = title;
    item.note = sheetNote.value.trim();
    item.type = pendingType;
    item.due = pendingType === "task" && sheetDue.value ? sheetDue.value : null;

    saveItems(items);
    closeSheet();
    render();
  });

  document.getElementById("sheet-delete").addEventListener("click", () => {
    items = items.filter((i) => i.id !== editingId);
    saveItems(items);
    closeSheet();
    render();
  });

  // ---------- Init ----------
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
