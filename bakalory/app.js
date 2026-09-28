/* ============================================================
   بكالوري v4.0 — Google Auth + Media Posts + Books
   ============================================================ */
'use strict';

/* ----- CONFIG ----- */
const CONFIG = {
  APP_NAME: "بكالوري",
  VERSION: "4.0.0",
  STORAGE_KEY: "bakalory_v4",
  THEME_KEY: "bak_theme_v3",
  ROUTE_KEY: "bak_route_v3",

  GOOGLE_CLIENT_ID: "172881524344-tfuoims9g7olpi0g28kf9i7nno7dqa3u.apps.googleusercontent.com",

  ADMIN_EMAILS: [
    "felixghdar@gmail.com",
    "felix.dev.9.8.9@gmail.com",
    "ahmaroabd1@gmail.com",
  ],
  CONTACTS: {
    admins: "https://t.me/H100A100bii",
    dev: "https://t.me/d4_ev",
    admin: "https://t.me/llliliiillll",
  },
};

const TYPES = {
  SUMMARY:  { label: "ملخص",   icon: "file-text" },
  REVIEW:   { label: "مراجعة", icon: "repeat" },
  PDF:      { label: "PDF",     icon: "file-type" },
  FILE:     { label: "ملف",     icon: "file" },
  IMAGE:    { label: "صورة",   icon: "image" },
  AUDIO:    { label: "صوت",    icon: "music" },
  VIDEO:    { label: "فيديو",  icon: "video" },
  YOUTUBE:  { label: "يوتيوب", icon: "youtube" },
  TIKTOK:   { label: "تيك توك", icon: "music-2" },
  EXERCISE: { label: "تدريب",  icon: "pencil" },
};

/* ----- DATA SEED ----- */
const Data = {
  seed() {
    return {
      user: null,
      users: [],
      progress: {},
      favorites: [],
      attempts: [],
      views: [],
      plan: [],
      badges: [],
      notifications: [],
      subjects: [],
      lessons: [],
      contents: [],
      exams: [],
      events: [],
      posts: [],
      books: [],
    };
  },
};

/* ----- STORE ----- */
const Store = {
  state: null,
  _timer: null,
  init() {
    try {
      this.state = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || null;
    } catch { this.state = null; }
    if (!this.state) this.state = Data.seed();
    else if (this.state.__v !== CONFIG.VERSION) this.state = this.migrate(this.state);
    this.state.__v = CONFIG.VERSION;
    this.persist();
  },
  migrate(old) {
    const fresh = Data.seed();
    return {
      ...fresh,
      user: old.user || null,
      users: old.users || [],
      progress: old.progress || {},
      favorites: old.favorites || [],
      attempts: old.attempts || [],
      views: old.views || [],
      plan: old.plan || [],
      badges: old.badges || [],
      notifications: old.notifications || [],
      subjects: old.subjects || [],
      lessons: old.lessons || [],
      contents: old.contents || [],
      exams: old.exams || [],
      events: old.events || [],
      posts: old.posts || [],
      books: old.books || [],
    };
  },
  persist() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        if (e.name === "QuotaExceededError") {
          this.state.views = (this.state.views || []).slice(0, 10);
          this.state.notifications = this.state.notifications.slice(0, 20);
          try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state)); } catch {}
        }
      }
    }, 200);
  },
};

/* ----- SERVICES ----- */
const Progress = {
  lesson(id) { return Store.state.progress[id]?.completed || false; },
  subject(sid) {
    const lessons = Store.state.lessons.filter(l => l.subjectId === sid && l.status === "PUBLISHED");
    const done = lessons.filter(l => this.lesson(l.id)).length;
    return { done, total: lessons.length, pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
  },
  global() {
    const total = Store.state.lessons.filter(l => l.status === "PUBLISHED").length;
    const done = Object.values(Store.state.progress).filter(p => p.completed).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  },
  toggle(lid, force) {
    const cur = this.lesson(lid);
    const target = force !== undefined ? force : !cur;
    if (target) Store.state.progress[lid] = { completed: true, completedAt: Date.now() };
    else delete Store.state.progress[lid];
    Achievements.evaluate();
    Store.persist();
    return target;
  },
};

const Subjects = {
  get(id) { return Store.state.subjects.find(s => s.id === id); },
  all() { return Store.state.subjects; },
  lessons(sid) {
    return Store.state.lessons.filter(l => l.subjectId === sid && l.status === "PUBLISHED").sort((a, b) => a.order - b.order);
  },
};

const Contents = {
  forSubject(sid) { return Store.state.contents.filter(c => c.subjectId === sid && c.status === "PUBLISHED"); },
  forLesson(lid) { return Store.state.contents.filter(c => c.lessonId === lid && c.status === "PUBLISHED").sort((a, b) => (a.order || 0) - (b.order || 0)); },
  latest(n = 8) { return [...Store.state.contents].filter(c => c.status === "PUBLISHED").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, n); },
  byId(id) { return Store.state.contents.find(c => c.id === id); },
};

const Favorites = {
  has(id) { return Store.state.favorites.includes(id); },
  toggle(id) {
    const i = Store.state.favorites.indexOf(id);
    if (i >= 0) Store.state.favorites.splice(i, 1);
    else Store.state.favorites.push(id);
    Store.persist();
    return i < 0;
  },
  list() {
    return Store.state.favorites.map(id => {
      const c = Contents.byId(id);
      if (c) return { kind: "content", data: c };
      const l = Store.state.lessons.find(x => x.id === id);
      if (l) return { kind: "lesson", data: l };
      const b = Books.byId(id);
      if (b) return { kind: "book", data: b };
      return null;
    }).filter(Boolean);
  },
};

const Exams = {
  all() { return Store.state.exams.filter(e => e.status === "PUBLISHED"); },
  bySlug(slug) { return Store.state.exams.find(e => e.publicSlug === slug && e.status === "PUBLISHED"); },
  byId(id) { return Store.state.exams.find(e => e.id === id); },
  attemptsFor(examId) { return Store.state.attempts.filter(a => a.examId === examId).sort((a, b) => b.submittedAt - a.submittedAt); },
  latestAttempt(examId) { return this.attemptsFor(examId)[0]; },
  submit(examId, answers, timeSpent) {
    const exam = this.byId(examId);
    if (!exam) return null;
    let score = 0, total = 0, correct = 0, wrong = 0;
    const details = exam.questions.map(q => {
      total += q.points;
      const ua = answers[q.id];
      const isCorrect = ua === q.correctAnswer;
      if (isCorrect) { score += q.points; correct++; } else if (ua) wrong++;
      return { qid: q.id, userAnswer: ua || null, correct: isCorrect };
    });
    const attempt = {
      id: Utils.uid(), examId, score, total, correct, wrong,
      answered: details.filter(d => d.userAnswer).length,
      submittedAt: Date.now(), timeSpent, details, answers,
    };
    Store.state.attempts.push(attempt);
    Achievements.evaluate();
    Store.persist();
    return attempt;
  },
};

const Plan = {
  all() { return [...Store.state.plan].sort((a, b) => a.dueDate - b.dueDate); },
  today() {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    const e = new Date(s); e.setDate(e.getDate() + 1);
    return Store.state.plan.filter(p => p.dueDate >= s.getTime() && p.dueDate < e.getTime()).sort((a, b) => a.dueDate - b.dueDate);
  },
  upcoming() {
    const e = new Date(); e.setHours(0, 0, 0, 0); e.setDate(e.getDate() + 7);
    return Store.state.plan.filter(p => p.dueDate >= Date.now() && p.dueDate <= e.getTime() && !p.done).sort((a, b) => a.dueDate - b.dueDate);
  },
  add(item) { Store.state.plan.push({ id: Utils.uid(), done: false, createdAt: Date.now(), ...item }); Store.persist(); },
  toggle(id) { const it = Store.state.plan.find(p => p.id === id); if (it) { it.done = !it.done; Store.persist(); } return it?.done; },
  remove(id) { Store.state.plan = Store.state.plan.filter(p => p.id !== id); Store.persist(); },
};

const Notifications = {
  all() { return [...Store.state.notifications].sort((a, b) => b.createdAt - a.createdAt); },
  unread() { return Store.state.notifications.filter(n => !n.read).length; },
  add(title, body, link) { Store.state.notifications.unshift({ id: Utils.uid(), title, body, link, read: false, createdAt: Date.now() }); Store.persist(); },
  read(id) { const n = Store.state.notifications.find(x => x.id === id); if (n) { n.read = true; Store.persist(); } },
  readAll() { Store.state.notifications.forEach(n => (n.read = true)); Store.persist(); },
};

/* ----- BOOKS SERVICE ----- */
const Books = {
  all() { return [...Store.state.books].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); },
  byId(id) { return Store.state.books.find(b => b.id === id); },
  add(data) {
    Store.state.books.push({ id: "b_" + Utils.uid(), createdAt: Date.now(), ...data });
    Store.persist();
  },
  update(id, data) {
    const b = this.byId(id);
    if (b) { Object.assign(b, data); Store.persist(); }
  },
  remove(id) {
    Store.state.books = Store.state.books.filter(b => b.id !== id);
    Store.persist();
  },
  removeAll() { Store.state.books = []; Store.persist(); },
};

const ViewsLog = {
  record(contentId, lessonId, subjectId) {
    Store.state.views = (Store.state.views || []).filter(v => v.contentId !== contentId).slice(0, 49);
    Store.state.views.unshift({ contentId, lessonId, subjectId, at: Date.now() });
    Store.persist();
  },
  lastLesson() {
    const v = (Store.state.views || []).find(x => x.lessonId);
    return v ? Store.state.lessons.find(l => l.id === v.lessonId) : null;
  },
};

const Achievements = {
  catalog() {
    return [
      { code: "first_lesson", title: "الخطوة الأولى", desc: "أكملت أول درس", icon: "star" },
      { code: "five_lessons", title: "منتظم", desc: "أكملت 5 دروس", icon: "medal" },
      { code: "ten_lessons", title: "مجتهد", desc: "أكملت 10 دروس", icon: "trophy" },
      { code: "first_exam", title: "مُختبَر", desc: "حللت أول اختبار", icon: "clipboard-check" },
      { code: "five_exams", title: "متمكن", desc: "حللت 5 اختبارات", icon: "target" },
      { code: "plan_master", title: "منظّم", desc: "أكملت 5 مهام", icon: "list-checks" },
    ];
  },
  earned(code) { return Store.state.badges.includes(code); },
  award(code) { if (!this.earned(code)) { Store.state.badges.push(code); Store.persist(); return true; } return false; },
  evaluate() {
    const done = Object.values(Store.state.progress).filter(p => p.completed).length;
    if (done >= 1) this.award("first_lesson");
    if (done >= 5) this.award("five_lessons");
    if (done >= 10) this.award("ten_lessons");
    if (Store.state.attempts.length >= 1) this.award("first_exam");
    if (Store.state.attempts.length >= 5) this.award("five_exams");
    const planDone = Store.state.plan.filter(p => p.done).length;
    if (planDone >= 5) this.award("plan_master");
  },
};

/* ----- UTILS ----- */
const Utils = {
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
  date(ts, opts) { return new Intl.DateTimeFormat("ar-EG", opts || { day: "numeric", month: "long", year: "numeric" }).format(new Date(ts)); },
  dateShort(ts) { return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(ts)); },
  timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "الآن";
    if (s < 3600) return `قبل ${Math.floor(s / 60)} دقيقة`;
    if (s < 86400) return `قبل ${Math.floor(s / 3600)} ساعة`;
    if (s < 604800) return `قبل ${Math.floor(s / 86400)} يوم`;
    return this.date(ts);
  },
  minutesToTime(m) { const m2 = Math.max(0, m | 0); return `${String(Math.floor(m2 / 60)).padStart(2, "0")}:${String(m2 % 60).padStart(2, "0")}`; },
  youtubeId(url) {
    if (!url) return null;
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : (String(url).length === 11 ? url : null);
  },
  fileExt(path) { return (String(path || "").split(".").pop() || "").toUpperCase().slice(0, 4); },
  icon(name, size = 18, cls = "") { return `<i data-lucide="${name}" ${cls ? `class="${cls}"` : ""} width="${size}" height="${size}"></i>`; },
  async fileToDataURL(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  },
};

/* ----- UI ----- */
const UI = {
  afterRender() {
    if (window.lucide) lucide.createIcons();
    Actions._observeFade();
  },
  toast(msg, kind = "", ms = 2400) {
    const el = document.createElement("div");
    el.className = "toast " + kind;
    const icons = { success: "check-circle-2", error: "alert-circle", info: "info", "": "info" };
    el.innerHTML = `${Utils.icon(icons[kind] || "info", 16)} <span>${Utils.esc(msg)}</span>`;
    document.getElementById("toast-area").appendChild(el);
    this.afterRender();
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "all 300ms cubic-bezier(.2,.8,.2,1)";
      setTimeout(() => el.remove(), 300);
    }, ms);
  },
  modal({ title, body, footer, size = "", onClose }) {
    const root = document.getElementById("modal-root");
    const wrap = document.createElement("div");
    wrap.className = "modal-bg show";
    wrap.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="icon-btn" data-close aria-label="إغلاق">${Utils.icon("x", 20)}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
      </div>`;
    root.appendChild(wrap);
    this.afterRender();
    const close = () => { wrap.remove(); onClose && onClose(); };
    wrap.querySelector("[data-close]").onclick = close;
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
    wrap.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    return { close, el: wrap };
  },
  confirm(message, { title = "تأكيد", confirmText = "تأكيد", cancelText = "إلغاء", danger = false } = {}) {
    return new Promise(res => {
      const m = this.modal({
        title,
        body: `<p style="color:var(--text-2);font-size:var(--t-sm);line-height:1.8">${Utils.esc(message)}</p>`,
        footer: `<button class="btn btn-secondary" data-x>${cancelText}</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${confirmText}</button>`,
        onClose: () => res(false),
      });
      m.el.querySelector("[data-x]").onclick = () => res(false);
      m.el.querySelector("[data-ok]").onclick = () => { res(true); m.close(); };
    });
  },
};

/* ----- COMPONENTS ----- */
const C = {
  subjectCard(s, num) {
    const p = Progress.subject(s.id);
    const last = ViewsLog.lastLesson();
    const isMine = last?.subjectId === s.id;
    const displayNum = num !== undefined ? String(num).padStart(2, "0") : "";
    return `
      <div class="sc" style="--c:${s.color}" onclick="Router.go('subject','${s.id}')">
        ${displayNum ? `<span class="sc-num">${displayNum}</span>` : ""}
        <div class="sc-top">
          <div class="sc-icon">${Utils.icon(s.icon, 26)}</div>
          ${isMine ? `<span class="tag tag-teal sc-badge">${Utils.icon("play", 11)} تابع</span>` : ""}
          ${p.pct === 100 ? `<span class="tag tag-success sc-badge">${Utils.icon("check", 11)} مكتمل</span>` : ""}
        </div>
        <div class="sc-body">
          <h3 class="sc-name">${Utils.esc(s.name)}</h3>
          <p class="sc-desc">${Utils.esc(s.desc || "")}</p>
        </div>
        <div class="sc-progress">
          <div class="progress lg"><span style="width:${p.pct}%;background:${s.color}"></span></div>
          <div class="sc-foot">
            <span>${p.done} / ${p.total} درس</span>
            <span class="sc-pct">${p.pct}%</span>
          </div>
        </div>
      </div>`;
  },
  contentItem(c) {
    const s = Subjects.get(c.subjectId);
    const type = TYPES[c.type] || TYPES.FILE;
    return `
      <div class="ci" onclick="Router.go('lesson','${c.lessonId || ""}')">
        <div class="ci-thumb">${Utils.icon(type.icon, 22)}</div>
        <div class="ci-body">
          <div class="ci-title">${Utils.esc(c.title)}</div>
          <div class="ci-desc">${Utils.esc(c.description || "")}</div>
          <div class="ci-meta">
            ${s ? `<span class="tag" style="background:${s.color}1a;color:${s.color};border-color:transparent">${Utils.esc(s.name)}</span>` : ""}
            <span class="tag">${type.label}</span>
          </div>
        </div>
      </div>`;
  },
  lessonRow(l, num) {
    const done = Progress.lesson(l.id);
    return `
      <div class="lesson-row ${done ? "done" : ""}" onclick="Router.go('lesson','${l.id}')">
        <div class="lesson-num">${done ? Utils.icon("check", 18) : num}</div>
        <div class="lesson-info">
          <div class="lesson-title">${Utils.esc(l.title)}</div>
          <div class="lesson-desc">${Utils.esc(l.description || "")}</div>
        </div>
        ${done ? '<span class="tag tag-success">مكتمل</span>' : '<span class="tag">جديد</span>'}
      </div>`;
  },
  empty(iconName, title, desc, actionHtml = "") {
    return `
      <div class="empty-state">
        <div class="empty-state-orb"></div>
        <div class="empty-state-content">
          <div class="empty-state-icon">${Utils.icon(iconName, 40)}</div>
          <h3>${title}</h3>
          ${desc ? `<p>${desc}</p>` : ""}
          ${actionHtml || ""}
        </div>
      </div>`;
  },
  planRow(p) {
    const s = Subjects.get(p.subjectId);
    return `
      <div class="lesson-row" style="cursor:default">
        <div class="lesson-num" style="cursor:pointer;${p.done ? "background:var(--success-soft);color:var(--success)" : ""}" onclick="event.stopPropagation();Actions.togglePlan('${p.id}')">
          ${p.done ? Utils.icon("check", 16) : Utils.icon("circle", 16)}
        </div>
        <div class="lesson-info">
          <div class="lesson-title" ${p.done ? 'style="text-decoration:line-through;color:var(--text-3)"' : ""}>${Utils.esc(p.title)}</div>
          <div class="lesson-desc">${s ? Utils.esc(s.name) + " • " : ""}${Utils.dateShort(p.dueDate)}</div>
        </div>
        <button class="icon-btn" style="width:34px;height:34px;color:var(--danger)" onclick="event.stopPropagation();Actions.deletePlan('${p.id}')">
          ${Utils.icon("trash-2", 16)}
        </button>
      </div>`;
  },
  notifItem(n) {
    const style = n.read ? "" : "border-color:color-mix(in srgb,var(--primary) 30%,var(--border));background:color-mix(in srgb,var(--primary) 4%,var(--surface))";
    return `
      <div class="ci" style="${style};margin-bottom:var(--s-2)" onclick="Actions.readNotif('${n.id}')">
        <div class="ci-thumb">${Utils.icon("bell", 20)}</div>
        <div class="ci-body">
          <div class="ci-title">${Utils.esc(n.title)}</div>
          ${n.body ? `<div class="ci-desc">${Utils.esc(n.body)}</div>` : ""}
          <div class="ci-meta">
            <span>${Utils.timeAgo(n.createdAt)}</span>
            ${!n.read ? '<span class="tag tag-primary">جديد</span>' : ""}
          </div>
        </div>
      </div>`;
  },
  postCard(p) {
    let media = "";
    if (p.mediaType === "image" && p.mediaUrl) {
      media = `<div style="border-radius:12px;overflow:hidden;margin-bottom:12px;background:var(--surface-2);max-height:500px">
        <img src="${Utils.esc(p.mediaUrl)}" alt="" style="width:100%;display:block;object-fit:cover" loading="lazy">
      </div>`;
    } else if (p.mediaType === "youtube" && p.mediaUrl) {
      const vid = Utils.youtubeId(p.mediaUrl);
      if (vid) media = `<div style="border-radius:12px;overflow:hidden;margin-bottom:12px;aspect-ratio:16/9;background:#000">
        <iframe src="https://www.youtube.com/embed/${vid}" style="width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe>
      </div>`;
    } else if (p.mediaType === "tiktok" && p.mediaUrl) {
      media = `<div style="margin-bottom:12px"><a href="${Utils.esc(p.mediaUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${Utils.icon("music-2", 14)} مشاهدة على TikTok</a></div>`;
    }

    return `
      <div class="card" style="margin-bottom:16px">
        <div style="font-weight:700;font-family:var(--font-display);font-size:var(--t-lg);margin-bottom:10px">${Utils.esc(p.title)}</div>
        ${media}
        ${p.body ? `<p style="font-size:var(--t-sm);color:var(--text-2);line-height:1.9;margin:0">${Utils.esc(p.body)}</p>` : ""}
        <div style="font-size:11px;color:var(--text-3);margin-top:12px">${Utils.timeAgo(p.createdAt)}</div>
      </div>`;
  },
  bookCard(b) {
    return `
      <div class="book-card" onclick="Router.go('book','${b.id}')">
        <div class="book-cover">
          ${b.cover
            ? `<img src="${Utils.esc(b.cover)}" alt="${Utils.esc(b.title)}" loading="lazy">`
            : `<div class="book-cover-placeholder">${Utils.icon("book-open", 42)}</div>`}
        </div>
        <div class="book-info">
          <h3 class="book-title">${Utils.esc(b.title)}</h3>
          ${b.author ? `<div class="book-author">${Utils.icon("user", 12)} ${Utils.esc(b.author)}</div>` : ""}
          <p class="book-desc">${Utils.esc(b.description || "")}</p>
        </div>
      </div>`;
  },
};

/* ----- SHELL ----- */
const Shell = {
  topbar() {
    const u = Store.state.user;
    const unread = Notifications.unread();
    return `
      <header class="topbar" id="topbar">
        <div class="topbar-inner">
          <button class="icon-btn" onclick="Shell.openSidebar()">${Utils.icon("menu", 22)}</button>
          <a class="brand" onclick="Router.go('home')">
            <svg class="brand-mark" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="14" fill="#1e3a5f"/>
              <path d="M20 18 L20 46 M28 18 L28 46 M36 18 L36 46" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
              <path d="M32 50 L42 34 L37 34 L44 22 L51 34 L46 34 L36 50 Z" fill="#3ba7b8"/>
            </svg>
            <span>بكالوري</span>
          </a>
          <div class="topbar-spacer"></div>
          <button class="search-pill" onclick="Router.go('search')">
            ${Utils.icon("search", 16)} <span>ابحث...</span> <kbd>⌘K</kbd>
          </button>
          <button class="icon-btn" onclick="Router.go('search')" id="mobileSearch">${Utils.icon("search", 20)}</button>
          <button class="icon-btn has-badge" onclick="Router.go('notifications')">
            ${Utils.icon("bell", 20)}
            ${unread ? `<span class="badge">${unread}</span>` : ""}
          </button>
          <button class="icon-btn" onclick="Shell.toggleTheme()">
            ${Utils.icon(document.documentElement.dataset.theme === "light" ? "moon" : "sun", 20)}
          </button>
          <div class="avatar" onclick="Router.go('account')">
            ${u?.picture ? `<img src="${u.picture}" alt="">` : (u?.name?.[0] || "?")}
          </div>
        </div>
      </header>`;
  },

  bottomNav(active) {
    const items = [
      { r: "home", i: "home", t: "الرئيسية" },
      { r: "subjects", i: "book-open", t: "المواد" },
      { r: "books", i: "library", t: "الكتب" },
      { r: "exams", i: "clipboard-check", t: "الاختبارات" },
      { r: "account", i: "user", t: "حسابي" },
    ];
    return `
      <nav class="bottom-nav">
        <div class="inner">
          ${items.map(x => `
            <a class="bn-item ${active === x.r ? "active" : ""}" onclick="Router.go('${x.r}')">
              ${Utils.icon(x.i, 22)}<span>${x.t}</span>
            </a>`).join("")}
        </div>
      </nav>`;
  },

  sidebar() {
    const u = Store.state.user;
    const unread = Notifications.unread();
    const items = [
      { r: "home", i: "home", t: "الرئيسية" },
      { r: "subjects", i: "book-open", t: "المواد" },
      { r: "books", i: "library", t: "الكتب" },
      { r: "exams", i: "clipboard-check", t: "الاختبارات" },
      { r: "favorites", i: "bookmark", t: "المفضلة" },
      { r: "plan", i: "list-checks", t: "خطة المذاكرة" },
      { r: "calendar", i: "calendar", t: "التقويم" },
      { r: "achievements", i: "award", t: "الشارات" },
      { r: "notifications", i: "bell", t: "الإشعارات", badge: unread },
      { r: "account", i: "user", t: "حسابي" },
      { r: "settings", i: "settings", t: "الإعدادات" },
    ];
    const isAdmin = CONFIG.ADMIN_EMAILS.includes((u?.email || "").toLowerCase());

    return `
      <div class="overlay" id="ov" onclick="Shell.closeSidebar()"></div>
      <aside class="sidebar" id="sb">
        <div class="sidebar-head">
          <div class="sidebar-user">
            <div class="avatar">${u?.picture ? `<img src="${u.picture}" alt="">` : (u?.name?.[0] || "?")}</div>
            <div class="info">
              <div class="name">${Utils.esc(u?.name || "زائر")}</div>
              <div class="sub">${Utils.esc(u?.email || "سجّل الدخول للبدء")}</div>
            </div>
          </div>
          <button class="icon-btn" onclick="Shell.closeSidebar()">${Utils.icon("x", 20)}</button>
        </div>
        <nav class="sidebar-nav">
          ${items.map(x => `
            <a class="nav-item" data-route="${x.r}" onclick="Router.go('${x.r}');Shell.closeSidebar()">
              ${Utils.icon(x.i, 18)}<span>${x.t}</span>${x.badge ? `<span class="badge">${x.badge}</span>` : ""}
            </a>`).join("")}
          ${isAdmin ? `
            <div class="nav-section" style="margin-top:var(--s-3)">الإدارة</div>
            <a class="nav-item" onclick="Router.go('admin');Shell.closeSidebar()">
              ${Utils.icon("shield", 18)}<span>لوحة التحكم</span>
            </a>` : ""}
        </nav>
        <div class="sidebar-foot">
          <a class="foot-link" href="${CONFIG.CONTACTS.admins}" target="_blank">${Utils.icon("users", 15)} جروب المسؤولين</a>
          <a class="foot-link" href="${CONFIG.CONTACTS.dev}" target="_blank">${Utils.icon("code-2", 15)} المطور</a>
        </div>
      </aside>`;
  },
  openSidebar() { document.getElementById("ov")?.classList.add("show"); document.getElementById("sb")?.classList.add("open"); },
  closeSidebar() { document.getElementById("ov")?.classList.remove("show"); document.getElementById("sb")?.classList.remove("open"); },
  toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(CONFIG.THEME_KEY, next);
    UI.toast(next === "light" ? "الوضع الفاتح مفعّل" : "الوضع الليلي مفعّل");
    Router.render();
  },
  syncNav(route) {
    document.querySelectorAll(".nav-item[data-route]").forEach(el => {
      el.classList.toggle("active", el.dataset.route === route);
    });
  },
};

/* ----- VIEWS ----- */
const Views = {
  landing() {
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container">
          <section style="position:relative;min-height:70dvh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:var(--s-12) 0;overflow:hidden">
            <div class="bubble bubble-primary" style="width:500px;height:500px;top:10%;inset-inline-end:-150px"></div>
            <div class="bubble bubble-accent" style="width:400px;height:400px;bottom:15%;inset-inline-start:-120px"></div>
            <div style="position:relative;z-index:1;max-width:640px">
              <span class="eyebrow">منصة تعليمية · تانية بكالوري</span>
              <h1 class="display" style="font-size:clamp(44px,8vw,96px);margin:20px 0 24px">
                ذاكر بذكاء.<br>
                <span style="color:var(--text-3);font-weight:300;font-style:italic">اوصل لهدفك.</span>
              </h1>
              <p style="font-size:var(--t-lg);color:var(--text-2);max-width:520px;margin:0 auto 40px;line-height:1.7">
                كل ما تحتاجه لمذاكرة تانية بكالوري — ملخصات، مذكرات، فيديوهات، وكتب، في مكان واحد.
              </p>
              <div class="flex gap-3 justify-center flex-wrap">
                <button class="btn btn-primary btn-lg" onclick="Auth.signIn()">
                  ${Utils.icon("log-in", 18)} ابدأ المذاكرة
                </button>
                <button class="btn btn-ghost btn-lg" onclick="Router.go('about')">اعرف أكتر</button>
              </div>
            </div>
          </section>
        </div>
      </main>`;
  },

  home() {
    const u = Store.state.user;
    if (!u) return this.landing();

    const g = Progress.global();
    const nextLesson = this._nextLesson();
    const lastLesson = ViewsLog.lastLesson();
    const latestBooks = Books.all().slice(0, 4);
    const posts = Store.state.posts.slice(0, 3);
    const exams = Exams.all().slice(0, 3);
    const today = Plan.today();
    const badges = Achievements.catalog().filter(b => Achievements.earned(b.code));
    const target = nextLesson || lastLesson;
    const mainSubjects = Store.state.subjects.filter(s => !s.isOther);

    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page" style="position:relative">
          <div class="bubble bubble-primary" style="width:400px;height:400px;top:-100px;inset-inline-end:-100px;opacity:.15"></div>
          <div class="page-head" style="position:relative;z-index:1">
            <span class="eyebrow">${Utils.date(Date.now(), { weekday: "long", day: "numeric", month: "long" })}</span>
            <h1 class="title">أهلًا ${Utils.esc((u.name || "طالب").split(" ")[0])}</h1>
            <p class="sub">جاهز تكمل مذاكرتك؟</p>
          </div>

          <div class="grid grid-4 section">
            <div class="stat fade-up" style="--c:var(--primary)">
              <div class="stat-icon">${Utils.icon("trending-up", 20)}</div>
              <div class="stat-label">التقدم العام</div>
              <div class="stat-value">${g.pct}<small>%</small></div>
              <div class="progress lg" style="margin-top:12px"><span style="width:${g.pct}%"></span></div>
            </div>
            <div class="stat fade-up" style="--c:var(--success)">
              <div class="stat-icon">${Utils.icon("check-circle-2", 20)}</div>
              <div class="stat-label">دروس مكتملة</div>
              <div class="stat-value">${g.done}</div>
            </div>
            <div class="stat fade-up" style="--c:var(--teal)">
              <div class="stat-icon">${Utils.icon("clipboard-check", 20)}</div>
              <div class="stat-label">اختبارات محلولة</div>
              <div class="stat-value">${Store.state.attempts.length}</div>
            </div>
            <div class="stat fade-up" style="--c:var(--accent)">
              <div class="stat-icon">${Utils.icon("award", 20)}</div>
              <div class="stat-label">شارات</div>
              <div class="stat-value">${badges.length}</div>
            </div>
          </div>

          ${target ? `
            <section class="section fade-up">
              <div class="card" style="display:flex;gap:var(--s-4);align-items:center;flex-wrap:wrap;padding:var(--s-5);border-color:var(--primary)">
                <div class="sc-icon" style="--c:var(--primary);width:56px;height:56px">${Utils.icon(nextLesson ? "play" : "history", 26)}</div>
                <div style="flex:1;min-width:220px">
                  <div class="eyebrow" style="margin-bottom:6px">${nextLesson ? "تابع من حيث توقفت" : "ابدأ أول درس"}</div>
                  <div style="font-family:var(--font-display);font-weight:700;font-size:var(--t-lg);margin-bottom:4px">${Utils.esc(target.title)}</div>
                  <div style="font-size:var(--t-xs);color:var(--text-2)">${Utils.esc(Subjects.get(target.subjectId)?.name || "")}</div>
                </div>
                <button class="btn btn-primary" onclick="Router.go('lesson','${target.id}')">
                  ${Utils.icon("play", 16)} ${nextLesson ? "ابدأ الآن" : "متابعة"}
                </button>
              </div>
            </section>` : ""}

          <section class="section" style="position:relative;z-index:1">
            <div class="section-head">
              <div>
                <span class="eyebrow">المواد · ${String(mainSubjects.length).padStart(2, "0")}</span>
                <h2 class="section-title">${Utils.icon("book-open", 22)} موادي</h2>
              </div>
              ${mainSubjects.length ? `<button class="btn btn-ghost btn-sm" onclick="Router.go('subjects')">عرض الكل</button>` : ""}
            </div>
            ${mainSubjects.length
              ? `<div class="grid grid-4">${mainSubjects.slice(0, 4).map((s, i) => C.subjectCard(s, i + 1)).join("")}</div>`
              : C.empty("sparkles", "المنصة فاضية دلوقتي", "الأدمن لسه مضافش مواد. تابعنا قريبًا!")}
          </section>

          ${latestBooks.length ? `
            <section class="section">
              <div class="section-head">
                <div>
                  <span class="eyebrow">المكتبة · ${String(Books.all().length).padStart(2, "0")}</span>
                  <h2 class="section-title">${Utils.icon("library", 22)} أحدث الكتب</h2>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Router.go('books')">عرض الكل</button>
              </div>
              <div class="books-grid">
                ${latestBooks.map(b => C.bookCard(b)).join("")}
              </div>
            </section>` : ""}

          ${posts.length ? `
            <section class="section">
              <div class="section-head">
                <div>
                  <span class="eyebrow">الإعلانات</span>
                  <h2 class="section-title">${Utils.icon("megaphone", 22)} آخر الإعلانات</h2>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Router.go('posts')">عرض الكل</button>
              </div>
              ${posts.map(p => C.postCard(p)).join("")}
            </section>` : ""}

          ${exams.length ? `
            <section class="section">
              <div class="section-head">
                <div>
                  <span class="eyebrow">الاختبارات · ${String(exams.length).padStart(2, "0")}</span>
                  <h2 class="section-title">${Utils.icon("clipboard-check", 22)} اختبر نفسك</h2>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Router.go('exams')">الكل</button>
              </div>
              <div class="grid grid-2">
                ${exams.map(e => {
                  const att = Exams.latestAttempt(e.id);
                  return `<div class="ci" onclick="Router.go('exam','${e.publicSlug}')">
                    <div class="ci-thumb">${Utils.icon("file-question", 20)}</div>
                    <div class="ci-body">
                      <div class="ci-title">${Utils.esc(e.title)}</div>
                      <div class="ci-meta">
                        <span>${e.questions.length} أسئلة</span>
                        ${e.duration ? `<span>• ${e.duration} د</span>` : ""}
                        ${att ? `<span class="tag tag-success">${att.score}/${att.total}</span>` : ""}
                      </div>
                    </div>
                  </div>`;
                }).join("")}
              </div>
            </section>` : ""}

          ${today.length ? `
            <section class="section">
              <div class="section-head">
                <div>
                  <span class="eyebrow">اليوم</span>
                  <h2 class="section-title">${Utils.icon("sun", 22)} خطة اليوم</h2>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="Router.go('plan')">إدارة</button>
              </div>
              ${today.map(p => C.planRow(p)).join("")}
            </section>` : ""}
        </div>
      </main>
      ${Shell.bottomNav("home")}`;
  },

  _nextLesson() {
    for (const s of Store.state.subjects) {
      for (const l of Subjects.lessons(s.id)) {
        if (!Progress.lesson(l.id)) return l;
      }
    }
    return null;
  },

  /* ----- BOOKS LIST ----- */
  books() {
    const all = Books.all();
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          <div class="page-head">
            <span class="eyebrow">المكتبة · ${String(all.length).padStart(2, "0")}</span>
            <h1 class="title">الكتب والمراجع.</h1>
            <p class="sub">حمّل الكتب، اطّلع على الوصف، وعاين قبل التحميل.</p>
          </div>
          ${all.length
            ? `<div class="books-grid">${all.map(b => C.bookCard(b)).join("")}</div>`
            : C.empty("library", "المكتبة فاضية", "لسه مفيش كتب مضافة. تابعنا قريبًا!")}
        </div>
      </main>
      ${Shell.bottomNav("books")}`;
  },

  /* ----- BOOK DETAIL ----- */
  book(id) {
    const b = Books.byId(id);
    if (!b) return this.notFound();
    const fav = Favorites.has(id);
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          <div class="crumb">
            <a onclick="Router.go('books')">المكتبة</a>
            ${Utils.icon("chevron-left", 14)}
            <span>${Utils.esc(b.title)}</span>
          </div>

          <div class="book-detail">
            <div class="book-detail-cover">
              ${b.cover
                ? `<img src="${Utils.esc(b.cover)}" alt="${Utils.esc(b.title)}">`
                : `<div class="book-cover-placeholder">${Utils.icon("book-open", 64)}</div>`}
            </div>
            <div class="book-detail-info">
              <h1 style="font-family:var(--font-display);font-size:var(--t-2xl);font-weight:800;margin-bottom:8px">${Utils.esc(b.title)}</h1>
              ${b.author ? `<div class="book-author" style="margin-bottom:16px;font-size:14px">${Utils.icon("user", 14)} ${Utils.esc(b.author)}</div>` : ""}
              <div class="flex gap-2 flex-wrap" style="margin-bottom:20px">
                ${b.category ? `<span class="tag">${Utils.esc(b.category)}</span>` : ""}
                <span class="tag">${Utils.timeAgo(b.createdAt)}</span>
              </div>
              <div class="flex gap-2 flex-wrap" style="margin-bottom:20px">
                ${b.downloadUrl ? `<a href="${Utils.esc(b.downloadUrl)}" target="_blank" rel="noopener" class="btn btn-primary btn-lg">
                  ${Utils.icon("download", 18)} تحميل الكتاب
                </a>` : ""}
                ${b.previewUrl ? `<a href="${Utils.esc(b.previewUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-lg">
                  ${Utils.icon("eye", 18)} معاينة
                </a>` : ""}
                <button class="btn btn-ghost" onclick="Actions.toggleFav('${b.id}')">
                  ${Utils.icon(fav ? "bookmark-check" : "bookmark", 18)} ${fav ? "محفوظ" : "حفظ"}
                </button>
              </div>
            </div>
          </div>

          ${b.description ? `
            <section class="section">
              <div class="section-head"><h2 class="section-title">${Utils.icon("file-text", 22)} الوصف</h2></div>
              <div class="card" style="padding:var(--s-5);font-size:var(--t-sm);line-height:1.9;color:var(--text-2);border-inline-start:3px solid var(--primary)">
                ${Utils.esc(b.description).replace(/\n/g, "<br>")}
              </div>
            </section>` : ""}

          ${b.notes ? `
            <section class="section">
              <div class="section-head"><h2 class="section-title">${Utils.icon("info", 22)} ملاحظات</h2></div>
              <div class="card" style="padding:var(--s-5);font-size:var(--t-sm);line-height:1.9;color:var(--text-2)">
                ${Utils.esc(b.notes).replace(/\n/g, "<br>")}
              </div>
            </section>` : ""}
        </div>
      </main>
      ${Shell.bottomNav("books")}`;
  },

  subjects() {
    const main = Store.state.subjects.filter(s => !s.isOther);
    const others = Store.state.subjects.filter(s => s.isOther);

    if (!Store.state.subjects.length) {
      return `
        ${Shell.topbar()}
        ${Shell.sidebar()}
        <main class="main">
          <div class="container page">
            ${C.empty("book-open", "لا توجد مواد بعد", "لسه مفيش مواد مضافة. تابعنا قريبًا!")}
          </div>
        </main>
        ${Shell.bottomNav("subjects")}`;
    }

    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          <div class="page-head">
            <span class="eyebrow">الأساسيات · ${String(main.length).padStart(2, "0")}</span>
            <h1 class="title">المواد الأساسية.</h1>
            <p class="sub">المواد اللي كل طالب لازم يذاكرها.</p>
          </div>
          <div class="grid grid-4 section">${main.map((s, i) => C.subjectCard(s, i + 1)).join("")}</div>
          ${others.length ? `
            <div class="divider"></div>
            <div class="page-head" style="margin-top:var(--s-10)">
              <span class="eyebrow">مواد أخرى · ${String(others.length).padStart(2, "0")}</span>
              <h2 class="title" style="font-size:var(--t-xl)">مواد إضافية.</h2>
            </div>
            <div class="grid grid-4">${others.map(s => C.subjectCard(s)).join("")}</div>
          ` : ""}
        </div>
      </main>
      ${Shell.bottomNav("subjects")}`;
  },

  subject(sid) {
    const s = Subjects.get(sid);
    if (!s) return this.notFound();
    const lessons = Subjects.lessons(sid);
    const p = Progress.subject(sid);
    const contents = Contents.forSubject(sid);
    const exams = Exams.all().filter(e => e.subjectId === sid);

    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          <div class="crumb">
            <a onclick="Router.go('subjects')">المواد</a>
            ${Utils.icon("chevron-left", 14)}
            <span>${Utils.esc(s.name)}</span>
          </div>
          <div class="card section" style="border-color:${s.color};background:linear-gradient(135deg,${s.color}0d 0%,transparent 60%)">
            <div style="display:flex;gap:var(--s-5);align-items:center;flex-wrap:wrap">
              <div class="sc-icon" style="--c:${s.color};width:72px;height:72px;border-radius:18px">${Utils.icon(s.icon, 36)}</div>
              <div style="flex:1;min-width:220px">
                <h1 style="font-size:var(--t-2xl);font-weight:800;margin-bottom:6px">${Utils.esc(s.name)}</h1>
                <p style="color:var(--text-2);font-size:var(--t-sm)">${Utils.esc(s.desc || "")}</p>
              </div>
              <div style="text-align:center">
                <div style="font-family:var(--font-display);font-size:40px;font-weight:800;color:${s.color};letter-spacing:-.04em;line-height:1">${p.pct}%</div>
                <div style="font-size:11px;color:var(--text-3);font-weight:600;letter-spacing:.1em">التقدم</div>
              </div>
            </div>
            <div class="progress lg" style="margin-top:var(--s-5)">
              <span style="width:${p.pct}%;background:${s.color}"></span>
            </div>
          </div>
          <section class="section">
            <div class="section-head">
              <div>
                <span class="eyebrow">الدروس · ${lessons.length}</span>
                <h2 class="section-title">${Utils.icon("list", 22)} كل الدروس</h2>
              </div>
            </div>
            ${lessons.length ? lessons.map((l, i) => C.lessonRow(l, i + 1)).join("")
              : C.empty("book-open", "لا توجد دروس بعد", "سيتم إضافة الدروس قريبًا.")}
          </section>
          ${contents.length ? `
            <section class="section">
              <div class="section-head"><h2 class="section-title">${Utils.icon("files", 22)} محتوى إضافي</h2></div>
              <div class="grid grid-2">${contents.map(c => C.contentItem(c)).join("")}</div>
            </section>` : ""}
          ${exams.length ? `
            <section class="section">
              <div class="section-head"><h2 class="section-title">${Utils.icon("clipboard-check", 22)} اختبارات المادة</h2></div>
              <div class="grid grid-2">
                ${exams.map(e => `
                  <div class="ci" onclick="Router.go('exam','${e.publicSlug}')">
                    <div class="ci-thumb">${Utils.icon("file-question", 20)}</div>
                    <div class="ci-body">
                      <div class="ci-title">${Utils.esc(e.title)}</div>
                      <div class="ci-meta"><span>${e.questions.length} أسئلة</span>${e.duration ? `<span>• ${e.duration} د</span>` : ""}</div>
                    </div>
                  </div>`).join("")}
              </div>
            </section>` : ""}
        </div>
      </main>
      ${Shell.bottomNav("subjects")}`;
  },

  lesson(lid) {
    const l = Store.state.lessons.find(x => x.id === lid);
    if (!l) return this.notFound();
    const s = Subjects.get(l.subjectId);
    const contents = Contents.forLesson(lid);
    const done = Progress.lesson(lid);
    const fav = Favorites.has(lid);
    const exams = Exams.all().filter(e => e.lessonId === lid);

    ViewsLog.record(null, lid, l.subjectId);

    const groups = {
      summary: contents.filter(c => c.type === "SUMMARY" || c.type === "REVIEW"),
      video: contents.filter(c => c.type === "YOUTUBE" || c.type === "VIDEO"),
      tiktok: contents.filter(c => c.type === "TIKTOK"),
      docs: contents.filter(c => c.type === "PDF" || c.type === "FILE"),
      other: contents.filter(c => !["YOUTUBE", "VIDEO", "TIKTOK", "PDF", "FILE", "SUMMARY", "REVIEW"].includes(c.type)),
    };

    const renderSection = (title, icon, items) => items.length ? `
      <section class="section">
        <div class="section-head"><h2 class="section-title">${Utils.icon(icon, 22)} ${title}</h2></div>
        ${items.map(c => this.contentBlock(c)).join("")}
      </section>` : "";

    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          <div class="crumb">
            <a onclick="Router.go('subjects')">المواد</a>
            ${Utils.icon("chevron-left", 14)}
            <a onclick="Router.go('subject','${s?.id || ""}')">${Utils.esc(s?.name || "")}</a>
            ${Utils.icon("chevron-left", 14)}
            <span>${Utils.esc(l.title)}</span>
          </div>
          <div class="card section">
            <div style="display:flex;gap:var(--s-4);align-items:flex-start;flex-wrap:wrap">
              <div style="flex:1;min-width:240px">
                <span class="eyebrow">${s ? Utils.esc(s.name) : ""}</span>
                <h1 style="font-size:var(--t-2xl);font-weight:800;letter-spacing:-.02em;margin:8px 0 12px">${Utils.esc(l.title)}</h1>
                <p style="color:var(--text-2);font-size:var(--t-sm);margin-bottom:var(--s-4);line-height:1.7">${Utils.esc(l.description || "")}</p>
                <div class="flex gap-2 flex-wrap">
                  ${l.unit ? `<span class="tag">${Utils.esc(l.unit)}</span>` : ""}
                  ${done ? `<span class="tag tag-success">${Utils.icon("check", 12)} مكتمل</span>` : ""}
                  <span class="tag">${contents.length} عنصر</span>
                </div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <button class="btn ${done ? "btn-success" : "btn-primary"}" onclick="Actions.toggleComplete('${lid}')">
                  ${Utils.icon(done ? "check-circle-2" : "circle", 16)} ${done ? "تمت المذاكرة" : "علّم كمذاكرة"}
                </button>
                <button class="icon-btn" onclick="Actions.toggleFav('${lid}')">
                  ${Utils.icon(fav ? "bookmark-check" : "bookmark", 20)}
                </button>
                <button class="icon-btn" onclick="Actions.openAddPlan('${lid}','${l.subjectId}')">
                  ${Utils.icon("calendar-plus", 20)}
                </button>
              </div>
            </div>
          </div>
          ${contents.length ? `
            ${renderSection("ملخص وشرح", "file-text", groups.summary)}
            ${renderSection("فيديوهات الشرح", "youtube", groups.video)}
            ${renderSection("مقاطع سريعة", "music-2", groups.tiktok)}
            ${renderSection("ملفات ومذكرات", "file-type", groups.docs)}
            ${renderSection("محتوى آخر", "layers", groups.other)}
          ` : C.empty("inbox", "لا يوجد محتوى", "سيتم إضافة محتوى الدرس قريبًا.")}
          ${exams.length ? `
            <section class="section">
              <div class="section-head"><h2 class="section-title">${Utils.icon("clipboard-check", 22)} اختبارات مرتبطة</h2></div>
              <div class="grid grid-2">
                ${exams.map(e => `
                  <div class="ci" onclick="Router.go('exam','${e.publicSlug}')">
                    <div class="ci-thumb">${Utils.icon("file-question", 20)}</div>
                    <div class="ci-body">
                      <div class="ci-title">${Utils.esc(e.title)}</div>
                      <div class="ci-meta"><span>${e.questions.length} أسئلة</span>${e.duration ? `<span>• ${e.duration} د</span>` : ""}</div>
                    </div>
                  </div>`).join("")}
              </div>
            </section>` : ""}
        </div>
      </main>
      ${Shell.bottomNav("subjects")}`;
  },

  contentBlock(c) {
    const t = TYPES[c.type] || TYPES.FILE;
    const header = `<div class="card-head"><div class="card-title">${Utils.icon(t.icon, 18)} ${Utils.esc(c.title)}</div><span class="tag tag-primary">${t.label}</span></div>`;
    const desc = c.description ? `<p style="color:var(--text-2);font-size:var(--t-sm);margin-bottom:var(--s-4)">${Utils.esc(c.description)}</p>` : "";

    if (c.type === "YOUTUBE") {
      const vid = c.videoId || Utils.youtubeId(c.url);
      if (!vid) return `<div class="card section">${header}${desc}</div>`;
      return `<div class="card section">${header}${desc}<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${vid}" title="${Utils.esc(c.title)}" allowfullscreen loading="lazy"></iframe></div></div>`;
    }
    if (c.type === "TIKTOK") {
      return `<div class="card section">${header}${desc}<a href="${Utils.esc(c.url)}" target="_blank" rel="noopener" class="btn btn-secondary">${Utils.icon("external-link", 16)} شاهد على TikTok</a></div>`;
    }
    if (c.type === "PDF" || c.type === "FILE") {
      const ext = Utils.fileExt(c.filePath || "");
      const isPdf = ext === "PDF";
      return `<div class="card section">${header}${desc}<div class="file-row">
        <div class="file-ext ${isPdf ? "" : "generic"}">${ext || "FILE"}</div>
        <div class="file-info"><div class="file-name">${Utils.esc(c.filePath || c.title)}</div><div class="file-meta">${c.fileSize ? c.fileSize + " • " : ""}${isPdf ? "ملف PDF" : "ملف"}</div></div>
        <a href="${Utils.esc(c.filePath || "#")}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">${Utils.icon("download", 14)} تحميل</a>
      </div></div>`;
    }
    if (c.type === "SUMMARY" || c.type === "REVIEW") {
      return `<div class="card section">${header}${desc}<div style="background:var(--surface-2);padding:var(--s-5);border-radius:var(--r-md);font-size:var(--t-sm);line-height:1.9;color:var(--text-2);border-inline-start:3px solid var(--primary)">${c.body ? Utils.esc(c.body) : ""}</div></div>`;
    }
    return `<div class="card section">${header}${desc}</div>`;
  },

  exams() {
    const list = Exams.all();
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          <div class="page-head">
            <span class="eyebrow">الاختبارات · ${String(list.length).padStart(2, "0")}</span>
            <h1 class="title">اختبر نفسك.</h1>
            <p class="sub">اختبارات إلكترونية على كل درس.</p>
          </div>
          ${list.length ? `<div class="grid grid-2">
            ${list.map(e => {
              const s = Subjects.get(e.subjectId);
              const att = Exams.latestAttempt(e.id);
              return `<div class="card" style="display:flex;flex-direction:column;gap:var(--s-4)">
                <div style="display:flex;gap:var(--s-3);align-items:flex-start">
                  <div class="sc-icon" style="--c:${s?.color || "var(--primary)"}">${Utils.icon("file-question", 22)}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-family:var(--font-display);font-weight:700;font-size:var(--t-md);margin-bottom:4px">${Utils.esc(e.title)}</div>
                    <div style="font-size:var(--t-xs);color:var(--text-2)">${Utils.esc(e.description || "")}</div>
                  </div>
                </div>
                <div class="flex gap-2 flex-wrap">
                  <span class="tag">${e.questions.length} أسئلة</span>
                  ${e.duration ? `<span class="tag">${e.duration} دقيقة</span>` : ""}
                  ${att ? `<span class="tag tag-success">آخر نتيجة: ${att.score}/${att.total}</span>` : ""}
                </div>
                <button class="btn btn-primary btn-block" onclick="Router.go('exam','${e.publicSlug}')">
                  ${att ? "أعد المحاولة" : "ابدأ الاختبار"} ${Utils.icon("arrow-left", 16)}
                </button>
              </div>`;
            }).join("")}
          </div>` : C.empty("clipboard-x", "لا اختبارات متاحة", "سيتم إضافة الاختبارات قريبًا.")}
        </div>
      </main>
      ${Shell.bottomNav("exams")}`;
  },

  exam(slug) {
    const e = Exams.bySlug(slug);
    if (!e) return this.notFound();
    const saved = sessionStorage.getItem("bak_result_" + e.id);
    if (saved) return this.examResult(e, JSON.parse(saved));
    const s = Subjects.get(e.subjectId);
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-md page">
          <div class="crumb">
            <a onclick="Router.go('exams')">الاختبارات</a>
            ${Utils.icon("chevron-left", 14)}
            <span>${Utils.esc(e.title)}</span>
          </div>
          <div class="card section">
            <span class="eyebrow">${s ? Utils.esc(s.name) : ""}</span>
            <h1 style="font-size:var(--t-2xl);font-weight:800;margin:8px 0 12px">${Utils.esc(e.title)}</h1>
            <p style="color:var(--text-2);font-size:var(--t-sm);margin-bottom:var(--s-5)">${Utils.esc(e.description || "")}</p>
            <div class="flex gap-2 flex-wrap mb-6">
              <span class="tag">${e.questions.length} أسئلة</span>
              ${e.duration ? `<span class="tag">${e.duration} دقيقة</span>` : ""}
            </div>
            <button class="btn btn-primary btn-block btn-lg" onclick="Actions.startExam('${e.id}')">
              ${Utils.icon("play", 18)} ابدأ الاختبار
            </button>
          </div>
        </div>
      </main>
      ${Shell.bottomNav("exams")}`;
  },

  examTake(examId) {
    const e = Exams.byId(examId);
    if (!e) return this.notFound();
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-md page">
          <div class="exam-bar">
            <div class="flex items-center gap-3" style="flex:1">
              <div style="font-size:var(--t-xs);color:var(--text-2);font-weight:600">التقدم</div>
              <div class="progress lg" style="flex:1;max-width:240px"><span id="examProgress" style="width:0%"></span></div>
              <div style="font-size:var(--t-xs);color:var(--text-2)"><span id="examAnswered">0</span>/${e.questions.length}</div>
            </div>
            ${e.duration ? `<div class="timer" id="examTimer">${Utils.minutesToTime(e.duration)}</div>` : ""}
          </div>
          <form id="examForm" onsubmit="event.preventDefault();Actions.submitExam('${e.id}')">
            ${e.questions.map((q, i) => `
              <div class="q-block">
                <div class="q-head"><span>السؤال ${i + 1} من ${e.questions.length}</span><span>${q.points} درجة</span></div>
                <div class="q-text">${Utils.esc(q.question)}</div>
                <div class="options" data-qid="${q.id}">
                  ${q.options.map(o => `
                    <div class="opt" data-qid="${q.id}" data-val="${Utils.esc(o)}">
                      <div class="opt-radio"></div><div class="opt-label">${Utils.esc(o)}</div>
                    </div>`).join("")}
                </div>
              </div>`).join("")}
            <button type="submit" class="btn btn-primary btn-block btn-lg mt-6">
              ${Utils.icon("check-circle-2", 18)} إنهاء الاختبار
            </button>
          </form>
        </div>
      </main>
      ${Shell.bottomNav("exams")}`;
  },

  examResult(e, attempt) {
    const pct = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
    const unanswered = e.questions.length - attempt.answered;
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-md page">
          <div class="result-hero">
            <div class="eyebrow">نتيجتك في</div>
            <div style="font-family:var(--font-display);font-weight:700;font-size:var(--t-lg);margin-top:6px">${Utils.esc(e.title)}</div>
            <div class="result-score">${attempt.score}<span>/${attempt.total}</span></div>
            <div class="result-pct">${pct}%</div>
            <div class="result-stats">
              <div><div class="result-stat-value" style="color:var(--success)">${attempt.correct}</div><div class="result-stat-label">صحيحة</div></div>
              <div><div class="result-stat-value" style="color:var(--danger)">${attempt.wrong}</div><div class="result-stat-label">خاطئة</div></div>
              <div><div class="result-stat-value" style="color:var(--text-3)">${unanswered}</div><div class="result-stat-label">بدون إجابة</div></div>
            </div>
            <div class="flex gap-2 justify-center mt-8" style="flex-wrap:wrap">
              <button class="btn btn-primary" onclick="Actions.retryExam('${e.id}')">${Utils.icon("rotate-ccw", 16)} أعد المحاولة</button>
              <button class="btn btn-secondary" onclick="Router.go('exams')">${Utils.icon("list", 16)} كل الاختبارات</button>
            </div>
          </div>
          <section class="section mt-8">
            <div class="section-head"><h2 class="section-title">${Utils.icon("list", 22)} مراجعة الأسئلة</h2></div>
            ${e.questions.map((q, i) => {
              const d = attempt.details.find(x => x.qid === q.id);
              return `<div class="q-block">
                <div class="q-head"><span>السؤال ${i + 1}</span><span class="tag ${d?.correct ? "tag-success" : "tag-danger"}">${d?.correct ? "صحيحة" : "خاطئة"}</span></div>
                <div class="q-text">${Utils.esc(q.question)}</div>
                <div>
                  ${q.options.map(o => {
                    const isUser = d?.userAnswer === o;
                    const isCorrect = o === q.correctAnswer;
                    const cls = isCorrect ? "correct" : (isUser && !isCorrect ? "wrong" : "");
                    return `<div class="opt ${cls}"><div class="opt-radio"></div><div class="opt-label">${Utils.esc(o)} ${isUser ? '<span class="tag" style="margin-inline-start:8px">إجابتك</span>' : ""}</div></div>`;
                  }).join("")}
                </div>
              </div>`;
            }).join("")}
          </section>
        </div>
      </main>
      ${Shell.bottomNav("exams")}`;
  },

  plan() {
    const all = Plan.all();
    const today = Plan.today();
    const upcoming = Plan.upcoming();
    const doneCount = all.filter(p => p.done).length;
    const rest = all.filter(p => !today.includes(p) && !upcoming.includes(p));
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-md page">
          <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s-3);flex-wrap:wrap">
            <div>
              <span class="eyebrow">خطة المذاكرة</span>
              <h1 class="title">خطتك اليومية.</h1>
              <p class="sub">${all.filter(p => !p.done).length} مهمة متبقية • ${doneCount} مكتملة</p>
            </div>
            <button class="btn btn-primary" onclick="Actions.openAddPlan()">${Utils.icon("plus", 16)} مهمة جديدة</button>
          </div>
          ${today.length ? `<section class="section"><div class="section-head"><h2 class="section-title">${Utils.icon("sun", 22)} اليوم</h2></div>${today.map(p => C.planRow(p)).join("")}</section>` : ""}
          ${upcoming.length ? `<section class="section"><div class="section-head"><h2 class="section-title">${Utils.icon("calendar-clock", 22)} هذا الأسبوع</h2></div>${upcoming.map(p => C.planRow(p)).join("")}</section>` : ""}
          ${rest.length ? `<section class="section"><div class="section-head"><h2 class="section-title">${Utils.icon("archive", 22)} أخرى</h2></div>${rest.map(p => C.planRow(p)).join("")}</section>` : ""}
          ${!all.length ? C.empty("list-checks", "لا توجد مهام", "أضف مهامك اليومية لتنظيم مذاكرتك.",
            `<button class="btn btn-primary" onclick="Actions.openAddPlan()">${Utils.icon("plus", 16)} مهمة جديدة</button>`) : ""}
        </div>
      </main>
      ${Shell.bottomNav("plan")}`;
  },

  favorites() {
    const list = Favorites.list();
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          <div class="page-head">
            <span class="eyebrow">المفضلة · ${String(list.length).padStart(2, "0")}</span>
            <h1 class="title">محفوظاتك.</h1>
          </div>
          ${list.length ? `<div class="grid grid-2">
            ${list.map(item => {
              if (item.kind === "content") return C.contentItem(item.data);
              if (item.kind === "book") return C.bookCard(item.data);
              return C.lessonRow(item.data, "•");
            }).join("")}
          </div>` : C.empty("bookmark", "لا يوجد شيء محفوظ", "احفظ الدروس والملفات للرجوع إليها لاحقًا.")}
        </div>
      </main>
      ${Shell.bottomNav("account")}`;
  },

  notifications() {
    const list = Notifications.all();
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-narrow page">
          <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s-3);flex-wrap:wrap">
            <div>
              <span class="eyebrow">الإشعارات</span>
              <h1 class="title">آخر التنبيهات.</h1>
              <p class="sub">${Notifications.unread()} غير مقروء</p>
            </div>
            ${list.length ? `<button class="btn btn-secondary btn-sm" onclick="Actions.markAllRead()">${Utils.icon("check-check", 14)} تعليم الكل كمقروء</button>` : ""}
          </div>
          ${list.length ? list.map(n => C.notifItem(n)).join("")
            : C.empty("bell-off", "لا إشعارات", "سيظهر هنا كل جديد.")}
        </div>
      </main>
      ${Shell.bottomNav("account")}`;
  },

  calendar() {
    const events = [...(Store.state.events || [])].sort((a, b) => a.startDate - b.startDate);
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-narrow page">
          <div class="page-head">
            <span class="eyebrow">التقويم · ${String(events.length).padStart(2, "0")}</span>
            <h1 class="title">المواعيد القادمة.</h1>
          </div>
          ${events.length ? events.map(e => {
            const d = new Date(e.startDate);
            const s = Subjects.get(e.subjectId);
            return `<div class="card" style="margin-bottom:12px;display:flex;gap:14px;align-items:center">
              <div class="cal-date"><div class="d">${d.getDate()}</div><div class="m">${new Intl.DateTimeFormat("ar-EG", { month: "short" }).format(d)}</div></div>
              <div style="flex:1"><div style="font-weight:600">${Utils.esc(e.title)}</div><div style="font-size:12px;color:var(--text-3)">${s ? Utils.esc(s.name) : ""}${e.description ? " • " + Utils.esc(e.description) : ""}</div></div>
            </div>`;
          }).join("") : C.empty("calendar-x", "لا مواعيد", "سيظهر هنا مواعيد الامتحانات.")}
        </div>
      </main>
      ${Shell.bottomNav("account")}`;
  },

  achievements() {
    const cat = Achievements.catalog();
    const earned = cat.filter(b => Achievements.earned(b.code));
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-md page">
          <div class="page-head">
            <span class="eyebrow">الإنجازات · ${earned.length}/${cat.length}</span>
            <h1 class="title">الشارات.</h1>
          </div>
          <div class="grid grid-3">
            ${cat.map(b => {
              const isEarned = Achievements.earned(b.code);
              return `<div class="badge-card ${isEarned ? "" : "locked"}">
                <div class="badge-icon">${Utils.icon(b.icon, 28)}</div>
                <h4>${Utils.esc(b.title)}</h4>
                <p>${Utils.esc(b.desc)}</p>
              </div>`;
            }).join("")}
          </div>
        </div>
      </main>
      ${Shell.bottomNav("account")}`;
  },

  account() {
    const u = Store.state.user;
    if (!u) return this.landing();
    const g = Progress.global();
    const attempts = [...Store.state.attempts].sort((a, b) => b.submittedAt - a.submittedAt);
    const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score / a.total, 0) / attempts.length * 100) : 0;
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-md page">
          <div class="card section" style="display:flex;gap:var(--s-4);align-items:center;flex-wrap:wrap">
            <div class="avatar lg">${u.picture ? `<img src="${u.picture}" alt="">` : (u.name?.[0] || "?")}</div>
            <div style="flex:1;min-width:200px">
              <span class="eyebrow">الحساب</span>
              <div style="font-family:var(--font-display);font-size:var(--t-2xl);font-weight:800;margin:4px 0">${Utils.esc(u.name || "")}</div>
              <div style="color:var(--text-2);font-size:var(--t-sm)">${Utils.esc(u.email || "")}</div>
            </div>
            <button class="btn btn-secondary" onclick="Auth.signOut()">${Utils.icon("log-out", 16)} خروج</button>
          </div>
          <div class="grid grid-4 section">
            <div class="stat" style="--c:var(--primary)"><div class="stat-label">التقدم</div><div class="stat-value">${g.pct}<small>%</small></div></div>
            <div class="stat" style="--c:var(--success)"><div class="stat-label">دروس مكتملة</div><div class="stat-value">${g.done}</div></div>
            <div class="stat" style="--c:var(--teal)"><div class="stat-label">اختبارات</div><div class="stat-value">${attempts.length}</div></div>
            <div class="stat" style="--c:var(--accent)"><div class="stat-label">متوسط النتائج</div><div class="stat-value">${avg}<small>%</small></div></div>
          </div>
        </div>
      </main>
      ${Shell.bottomNav("account")}`;
  },

  settings() {
    const isDark = document.documentElement.dataset.theme !== "light";
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-narrow page">
          <div class="page-head">
            <span class="eyebrow">الإعدادات</span>
            <h1 class="title">ضبط التطبيق.</h1>
          </div>
          <div class="card" style="padding:0;overflow:hidden">
            <div class="flex items-center justify-between" style="padding:var(--s-4) var(--s-5);border-bottom:1px solid var(--border)">
              <div>
                <div style="font-weight:600">الوضع الليلي</div>
                <div style="font-size:var(--t-xs);color:var(--text-2)">تبديل بين الفاتح والداكن</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="Shell.toggleTheme()">${isDark ? "تشغيل الفاتح" : "تشغيل الليلي"}</button>
            </div>
            <div class="flex items-center justify-between" style="padding:var(--s-4) var(--s-5)">
              <div>
                <div style="font-weight:600">تسجيل الخروج</div>
                <div style="font-size:var(--t-xs);color:var(--text-2)">إنهاء الجلسة</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="Auth.signOut()">خروج</button>
            </div>
          </div>
          <p class="text-center dim" style="font-size:var(--t-xs);margin-top:var(--s-6)">بكالوري v${CONFIG.VERSION}</p>
        </div>
      </main>
      ${Shell.bottomNav("account")}`;
  },

  search() {
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-md page">
          <div class="page-head">
            <span class="eyebrow">البحث</span>
            <h1 class="title">ابحث في كل حاجة.</h1>
            <p class="sub">دروس، محتوى، اختبارات، وكتب.</p>
          </div>
          <div class="field">
            <input class="input" id="searchInput" placeholder="اكتب للبحث..." autofocus oninput="Actions.searchDebounced(this.value)">
          </div>
          <div class="flex gap-2 flex-wrap mb-6">
            <button class="btn btn-primary btn-sm" data-f="all" onclick="Actions.setSearchFilter('all',this)">الكل</button>
            <button class="btn btn-secondary btn-sm" data-f="lesson" onclick="Actions.setSearchFilter('lesson',this)">دروس</button>
            <button class="btn btn-secondary btn-sm" data-f="content" onclick="Actions.setSearchFilter('content',this)">محتوى</button>
            <button class="btn btn-secondary btn-sm" data-f="exam" onclick="Actions.setSearchFilter('exam',this)">اختبارات</button>
            <button class="btn btn-secondary btn-sm" data-f="book" onclick="Actions.setSearchFilter('book',this)">كتب</button>
          </div>
          <div id="searchResults">
            ${C.empty("search", "ابدأ الكتابة", "اكتب كلمة للبحث عن الدروس والملفات.")}
          </div>
        </div>
      </main>
      ${Shell.bottomNav("home")}`;
  },

  posts() {
    const list = [...Store.state.posts].sort((a, b) => b.createdAt - a.createdAt);
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-narrow page">
          <div class="page-head">
            <span class="eyebrow">الإعلانات · ${String(list.length).padStart(2, "0")}</span>
            <h1 class="title">آخر الأخبار.</h1>
          </div>
          ${list.length ? list.map(p => C.postCard(p)).join("")
            : C.empty("newspaper", "لا إعلانات", "سيتم نشر الإعلانات هنا.")}
        </div>
      </main>
      ${Shell.bottomNav("home")}`;
  },

  about() {
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container container-narrow page">
          <div style="text-align:center;padding:var(--s-12) 0">
            <div class="brand-mark" style="width:80px;height:80px;margin:0 auto var(--s-5)">
              <svg viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="14" fill="#1e3a5f"/>
                <path d="M20 18 L20 46 M28 18 L28 46 M36 18 L36 46" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M32 50 L42 34 L37 34 L44 22 L51 34 L46 34 L36 50 Z" fill="#3ba7b8"/>
              </svg>
            </div>
            <h1 class="display" style="font-size:var(--t-3xl);margin-bottom:var(--s-3)">بكالوري</h1>
            <p style="color:var(--text-2);font-size:var(--t-md)">منصة تعليمية لطلاب تانية بكالوري مصرية.</p>
          </div>
          <div class="card section">
            <div class="card-title">${Utils.icon("target", 18)} هدفنا</div>
            <p style="color:var(--text-2);line-height:2;font-size:var(--t-sm);margin-top:var(--s-3)">
              توفير كل ما يحتاجه الطالب في مكان واحد — ملخصات، ملفات، فيديوهات، كتب، اختبارات إلكترونية، وخطة مذاكرة ذكية.
            </p>
          </div>
          <div class="card section">
            <div class="card-title">${Utils.icon("mail", 18)} تواصل معنا</div>
            <div class="flex flex-col gap-2" style="margin-top:var(--s-3)">
              <a href="${CONFIG.CONTACTS.admins}" target="_blank" class="btn btn-secondary">${Utils.icon("users", 16)} جروب المسؤولين</a>
              <a href="${CONFIG.CONTACTS.dev}" target="_blank" class="btn btn-secondary">${Utils.icon("code-2", 16)} المطور</a>
            </div>
          </div>
        </div>
      </main>
      ${Shell.bottomNav("account")}`;
  },

  notFound() {
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        <div class="container page">
          ${C.empty("alert-circle", "الصفحة غير موجودة", "عذرًا، الصفحة اللي بتدور عليها مش موجودة.",
            `<button class="btn btn-primary" onclick="Router.go('home')">العودة للرئيسية</button>`)}
        </div>
      </main>`;
  },
};

/* ----- ADMIN ----- */
const Admin = {
  layout(active, content, title = "لوحة التحكم") {
    const tabs = [
      { r: "admin",           i: "layout-dashboard", t: "نظرة عامة" },
      { r: "admin-subjects",  i: "book-open",        t: "المواد" },
      { r: "admin-lessons",   i: "list",             t: "الدروس" },
      { r: "admin-content",   i: "file-text",        t: "المحتوى" },
      { r: "admin-exams",     i: "clipboard-check",  t: "الاختبارات" },
      { r: "admin-books",     i: "library",          t: "الكتب" },
      { r: "admin-posts",     i: "megaphone",        t: "الإعلانات" },
      { r: "admin-users",     i: "users",            t: "الطلاب" },
    ];
    return `
      <div class="container page" style="max-width:1200px">
        <div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s-3);flex-wrap:wrap;margin-bottom:var(--s-5)">
          <div>
            <span class="eyebrow">لوحة الإدارة</span>
            <h1 class="title">${title}</h1>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="Router.go('home')">
            ${Utils.icon("home", 14)} الرئيسية
          </button>
        </div>
        <div class="admin-tabs">
          ${tabs.map(t => `
            <a class="admin-tab ${active === t.r ? "active" : ""}" onclick="Router.go('${t.r}')">
              ${Utils.icon(t.i, 16)} <span>${t.t}</span>
            </a>
          `).join("")}
        </div>
        <div style="margin-top:var(--s-6)">${content}</div>
      </div>`;
  },

  async _confirmDeleteAll(itemName, count, confirmWord = "احذف") {
    return new Promise(res => {
      const body = `
        <div style="background:var(--danger-soft);border:1px solid color-mix(in srgb,var(--danger) 40%,transparent);border-radius:var(--r-md);padding:16px;margin-bottom:16px">
          <div style="font-weight:700;color:var(--danger);margin-bottom:8px;display:flex;align-items:center;gap:8px">
            ${Utils.icon("alert-triangle", 18)} تحذير شديد
          </div>
          <p style="font-size:13.5px;color:var(--text-2);line-height:1.7;margin:0">
            سيتم حذف <strong style="color:var(--danger);font-family:var(--font-display)">${count}</strong> ${itemName}.
            <br><strong style="color:var(--danger)">لا يمكن التراجع عن هذا الإجراء!</strong>
          </p>
        </div>
        <div class="field">
          <label>اكتب كلمة <code style="background:var(--danger-soft);color:var(--danger);padding:3px 8px;border-radius:6px">${confirmWord}</code> للتأكيد</label>
          <input class="input" id="danger_input" autocomplete="off" placeholder="${confirmWord}" style="text-align:center;font-weight:700">
        </div>`;
      const m = UI.modal({
        title: "تأكيد الحذف النهائي",
        body,
        footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-danger" data-ok disabled>${Utils.icon("trash-2", 14)} حذف نهائي</button>`,
        onClose: () => res(false),
      });
      const inp = m.el.querySelector("#danger_input");
      const okBtn = m.el.querySelector("[data-ok]");
      setTimeout(() => inp.focus(), 100);
      inp.oninput = () => { okBtn.disabled = inp.value.trim() !== confirmWord; };
      inp.onkeydown = e => { if (e.key === "Enter" && inp.value.trim() === confirmWord) { res(true); m.close(); } };
      m.el.querySelector("[data-x]").onclick = () => res(false);
      okBtn.onclick = () => { if (inp.value.trim() !== confirmWord) return; res(true); m.close(); };
    });
  },

  async deleteAllSubjects() {
    const count = Store.state.subjects.length;
    if (!count) return UI.toast("لا توجد مواد", "error");
    const ok = await this._confirmDeleteAll("مادة (مع كل دروسها ومحتواها واختباراتها)", count);
    if (!ok) return;
    Store.state.subjects = [];
    Store.state.lessons = [];
    Store.state.contents = [];
    Store.state.exams = [];
    Store.persist();
    UI.toast("تم حذف كل المواد", "success");
    Router.render();
  },

  async deleteAllLessons() {
    const count = Store.state.lessons.length;
    if (!count) return UI.toast("لا توجد دروس", "error");
    const ok = await this._confirmDeleteAll("درس (مع كل محتواها المرتبطة)", count);
    if (!ok) return;
    const lessonIds = Store.state.lessons.map(l => l.id);
    Store.state.lessons = [];
    Store.state.contents = Store.state.contents.filter(c => !c.lessonId || !lessonIds.includes(c.lessonId));
    Store.state.exams = Store.state.exams.filter(e => !e.lessonId || !lessonIds.includes(e.lessonId));
    Store.persist();
    UI.toast("تم حذف كل الدروس", "success");
    Router.render();
  },

  async deleteAllContents() {
    const count = Store.state.contents.length;
    if (!count) return UI.toast("لا يوجد محتوى", "error");
    const ok = await this._confirmDeleteAll("محتوى", count);
    if (!ok) return;
    Store.state.contents = [];
    Store.persist();
    UI.toast("تم حذف كل المحتوى", "success");
    Router.render();
  },

  async deleteAllExams() {
    const count = Store.state.exams.length;
    if (!count) return UI.toast("لا توجد اختبارات", "error");
    const ok = await this._confirmDeleteAll("اختبار (مع كل أسئلته ومحاولاته)", count);
    if (!ok) return;
    Store.state.exams = [];
    Store.persist();
    UI.toast("تم حذف كل الاختبارات", "success");
    Router.render();
  },

  async deleteAllBooks() {
    const count = Store.state.books.length;
    if (!count) return UI.toast("لا توجد كتب", "error");
    const ok = await this._confirmDeleteAll("كتاب", count);
    if (!ok) return;
    Books.removeAll();
    UI.toast("تم حذف كل الكتب", "success");
    Router.render();
  },

  async deleteAllPosts() {
    const count = Store.state.posts.length;
    if (!count) return UI.toast("لا توجد إعلانات", "error");
    const ok = await this._confirmDeleteAll("إعلان", count);
    if (!ok) return;
    Store.state.posts = [];
    Store.persist();
    UI.toast("تم حذف كل الإعلانات", "success");
    Router.render();
  },

  async deleteAllUsers() {
    const currentEmail = Store.state.user?.email;
    const others = Store.state.users.filter(u => u.email !== currentEmail);
    const count = others.length;
    if (!count) return UI.toast("لا يوجد طلاب آخرين", "error");
    const ok = await this._confirmDeleteAll("طالب", count);
    if (!ok) return;
    Store.state.users = Store.state.users.filter(u => u.email === currentEmail);
    Store.persist();
    UI.toast("تم حذف كل الطلاب", "success");
    Router.render();
  },

  async resetEverything() {
    const ok = await this._confirmDeleteAll("كل شيء في المنصة", "كل حاجة", "الكل");
    if (!ok) return;
    const currentUser = Store.state.user;
    const fresh = Data.seed();
    fresh.user = currentUser;
    if (currentUser) {
      fresh.users = [{
        id: currentUser.googleId || Utils.uid(),
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        username: currentUser.username,
        picture: currentUser.picture,
        role: "admin", banned: false, lastSeen: Date.now(), joinedAt: Date.now(),
      }];
    }
    Store.state = fresh;
    Store.state.__v = CONFIG.VERSION;
    Store.persist();
    UI.toast("تم إعادة تعيين المنصة", "success", 3500);
    Router.go("admin");
  },

  /* DASHBOARD */
  dashboard() {
    const users = Store.state.users || [];
    const totalAttempts = Store.state.attempts.length;
    const avgScore = totalAttempts
      ? Math.round(Store.state.attempts.reduce((s, a) => s + (a.score / a.total), 0) / totalAttempts * 100)
      : 0;
    const stats = [
      { label: "الطلاب", value: users.length, icon: "users", color: "--primary" },
      { label: "المواد", value: Store.state.subjects.length, icon: "book-open", color: "--success" },
      { label: "الدروس", value: Store.state.lessons.length, icon: "list", color: "--teal" },
      { label: "المحتوى", value: Store.state.contents.length, icon: "file-text", color: "--warn" },
      { label: "الاختبارات", value: Store.state.exams.length, icon: "clipboard-check", color: "--danger" },
      { label: "الكتب", value: Store.state.books.length, icon: "library", color: "--primary" },
      { label: "الإعلانات", value: Store.state.posts.length, icon: "megaphone", color: "--success" },
      { label: "متوسط النتائج", value: avgScore + "%", icon: "trending-up", color: "--accent" },
    ];
    const hasData = Store.state.subjects.length || Store.state.books.length || Store.state.posts.length;

    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin", `
          <div class="grid grid-4 section">
            ${stats.map(s => `
              <div class="stat" style="--c:var(${s.color})">
                <div class="stat-icon">${Utils.icon(s.icon, 20)}</div>
                <div class="stat-label">${s.label}</div>
                <div class="stat-value">${s.value}</div>
              </div>`).join("")}
          </div>
          ${!hasData ? `<section class="section">${C.empty("package", "ابدأ بإضافة أول محتوى", "روح للـ Tabs فوق وأضف مواد، دروس، كتب، إلخ.")}</section>` : ""}
          <section class="section">
            <div class="card" style="border-color:color-mix(in srgb,var(--danger) 50%,var(--border));background:linear-gradient(135deg,var(--danger-soft) 0%,transparent 60%)">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
                <div class="stat-icon" style="background:var(--danger);color:#fff;margin:0;width:48px;height:48px">${Utils.icon("alert-triangle", 24)}</div>
                <div>
                  <div style="font-weight:800;font-family:var(--font-display);font-size:var(--t-lg);color:var(--danger)">منطقة الخطر</div>
                  <div style="font-size:12.5px;color:var(--text-2);margin-top:2px">هذه الإجراءات لا يمكن التراجع عنها</div>
                </div>
              </div>
              <div class="flex gap-2 flex-wrap mb-4">
                ${Store.state.subjects.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllSubjects()">${Utils.icon("trash-2", 14)} حذف المواد</button>` : ""}
                ${Store.state.lessons.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllLessons()">${Utils.icon("trash-2", 14)} حذف الدروس</button>` : ""}
                ${Store.state.contents.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllContents()">${Utils.icon("trash-2", 14)} حذف المحتوى</button>` : ""}
                ${Store.state.exams.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllExams()">${Utils.icon("trash-2", 14)} حذف الاختبارات</button>` : ""}
                ${Store.state.books.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllBooks()">${Utils.icon("trash-2", 14)} حذف الكتب</button>` : ""}
                ${Store.state.posts.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllPosts()">${Utils.icon("trash-2", 14)} حذف الإعلانات</button>` : ""}
                ${Store.state.users.filter(u => u.email !== Store.state.user?.email).length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllUsers()">${Utils.icon("trash-2", 14)} حذف الطلاب</button>` : ""}
              </div>
              <div class="divider"></div>
              <button class="btn btn-danger btn-block btn-lg" onclick="Admin.resetEverything()" style="background:linear-gradient(180deg,#a01010,#5a0000);border:0">
                ${Utils.icon("zap", 18)} إعادة تعيين المنصة بالكامل
              </button>
            </div>
          </section>
        `, "نظرة عامة")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  /* SUBJECTS */
  subjectsPage() {
    const subs = Store.state.subjects;
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin-subjects", `
          <div class="section-head">
            <div><span class="eyebrow">المواد · ${subs.length}</span><h2 class="section-title">${Utils.icon("book-open", 22)} إدارة المواد</h2></div>
            <div class="flex gap-2 flex-wrap">
              ${subs.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllSubjects()">${Utils.icon("trash-2", 14)} حذف الكل</button>` : ""}
              <button class="btn btn-accent" onclick="Admin.openSubjectForm()">${Utils.icon("plus", 16)} مادة جديدة</button>
            </div>
          </div>
          ${subs.length ? `<div class="grid grid-3">${subs.map(s => {
            const lc = Store.state.lessons.filter(l => l.subjectId === s.id).length;
            return `<div class="card">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <div class="sc-icon" style="--c:${s.color}">${Utils.icon(s.icon, 24)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700">${Utils.esc(s.name)}</div>
                  <div style="font-size:11px;color:var(--text-3)">${s.isOther ? "مواد أخرى" : "أساسية"}</div>
                </div>
              </div>
              <div style="margin-bottom:16px"><span class="tag">${lc} درس</span></div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" style="flex:1" onclick="Admin.openSubjectForm('${s.id}')">${Utils.icon("pencil", 12)} تعديل</button>
                <button class="btn btn-danger btn-sm" onclick="Admin.deleteSubject('${s.id}')">${Utils.icon("trash-2", 12)}</button>
              </div>
            </div>`;
          }).join("")}</div>` : C.empty("package", "لا مواد بعد", "اضغط (مادة جديدة) عشان تبدأ.",
            `<button class="btn btn-accent" onclick="Admin.openSubjectForm()">${Utils.icon("plus", 16)} مادة جديدة</button>`)}
        `, "المواد")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  openSubjectForm(id) {
    const s = id ? Subjects.get(id) : null;
    const body = `
      <div class="field"><label>اسم المادة *</label><input class="input" id="f_name" value="${Utils.esc(s?.name || "")}"></div>
      <div class="field"><label>الوصف</label><input class="input" id="f_desc" value="${Utils.esc(s?.desc || "")}"></div>
      <div class="field"><label>الأيقونة (Lucide)</label><input class="input" id="f_icon" value="${Utils.esc(s?.icon || "book-open")}"></div>
      <div class="field"><label>اللون</label><input class="input" id="f_color" type="color" value="${s?.color || "#0891b2"}" style="height:50px;cursor:pointer"></div>
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="checkbox" id="f_other" style="width:auto;accent-color:var(--primary)" ${s?.isOther ? "checked" : ""}>
        <span style="font-size:var(--t-sm)">مادة من "المواد الأخرى"</span>
      </label>`;
    const m = UI.modal({ title: s ? "تعديل مادة" : "مادة جديدة", body,
      footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-primary" data-ok>${s ? "حفظ" : "إضافة"}</button>` });
    m.el.querySelector("[data-x]").onclick = () => m.close();
    m.el.querySelector("[data-ok]").onclick = () => {
      const name = m.el.querySelector("#f_name").value.trim();
      if (!name) return UI.toast("أدخل اسم المادة", "error");
      const isOther = m.el.querySelector("#f_other").checked;
      const data = {
        name, desc: m.el.querySelector("#f_desc").value.trim(),
        icon: m.el.querySelector("#f_icon").value.trim() || "book-open",
        color: m.el.querySelector("#f_color").value, isOther,
      };
      if (s) Object.assign(s, data);
      else {
        const mainCount = Store.state.subjects.filter(x => !x.isOther).length;
        Store.state.subjects.push({ id: "sub_" + Utils.uid(), ...data, order: isOther ? 0 : mainCount + 1 });
      }
      Store.persist(); m.close(); UI.toast(s ? "تم التعديل" : "تمت الإضافة", "success"); Router.render();
    };
  },

  deleteSubject(id) {
    const lc = Store.state.lessons.filter(l => l.subjectId === id).length;
    UI.confirm(`سيتم حذف المادة + ${lc} درس. متأكد؟`, { danger: true, confirmText: "حذف الكل" }).then(ok => {
      if (!ok) return;
      Store.state.subjects = Store.state.subjects.filter(s => s.id !== id);
      Store.state.lessons = Store.state.lessons.filter(l => l.subjectId !== id);
      Store.state.contents = Store.state.contents.filter(c => c.subjectId !== id);
      Store.state.exams = Store.state.exams.filter(e => e.subjectId !== id);
      Store.persist(); UI.toast("تم الحذف"); Router.render();
    });
  },

  /* LESSONS */
  lessonsPage() {
    const lessons = Store.state.lessons;
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin-lessons", `
          <div class="section-head">
            <div><span class="eyebrow">الدروس · ${lessons.length}</span><h2 class="section-title">${Utils.icon("list", 22)} إدارة الدروس</h2></div>
            <div class="flex gap-2 flex-wrap">
              ${lessons.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllLessons()">${Utils.icon("trash-2", 14)} حذف الكل</button>` : ""}
              <button class="btn btn-accent" onclick="Admin.openLessonForm()">${Utils.icon("plus", 16)} درس جديد</button>
            </div>
          </div>
          ${Store.state.subjects.length ? (lessons.length ? `<div class="card" style="padding:0;overflow:hidden">
            ${lessons.map(l => {
              const s = Subjects.get(l.subjectId);
              return `<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)">
                <div class="lesson-num" style="width:32px;height:32px;font-size:12px">${l.order}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:var(--t-sm)">${Utils.esc(l.title)}</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:2px">${Utils.esc(s?.name || "—")}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="Admin.openLessonForm('${l.id}')">${Utils.icon("pencil", 12)}</button>
                <button class="btn btn-danger btn-sm" onclick="Admin.deleteLesson('${l.id}')">${Utils.icon("trash-2", 12)}</button>
              </div>`;
            }).join("")}
          </div>` : C.empty("list", "لا دروس بعد", "اضغط (درس جديد) عشان تبدأ.")) : C.empty("package", "أضف مادة أولًا", "محتاج مادة قبل ما تضيف دروس.",
            `<button class="btn btn-accent" onclick="Admin.openSubjectForm()">${Utils.icon("plus", 16)} مادة جديدة</button>`)}
        `, "الدروس")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  openLessonForm(id) {
    if (!Store.state.subjects.length) return UI.toast("أضف مادة أولًا", "error");
    const l = id ? Store.state.lessons.find(x => x.id === id) : null;
    const body = `
      <div class="field"><label>عنوان الدرس *</label><input class="input" id="f_title" value="${Utils.esc(l?.title || "")}"></div>
      <div class="field"><label>الوصف</label><textarea class="textarea" id="f_desc">${Utils.esc(l?.description || "")}</textarea></div>
      <div class="field"><label>المادة</label><select class="select" id="f_subject">${Store.state.subjects.map(s => `<option value="${s.id}" ${l?.subjectId === s.id ? "selected" : ""}>${Utils.esc(s.name)}</option>`).join("")}</select></div>
      <div class="field"><label>الترتيب</label><input class="input" id="f_order" type="number" value="${l?.order || 1}"></div>`;
    const m = UI.modal({ title: l ? "تعديل درس" : "درس جديد", body,
      footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-primary" data-ok>${l ? "حفظ" : "إضافة"}</button>` });
    m.el.querySelector("[data-x]").onclick = () => m.close();
    m.el.querySelector("[data-ok]").onclick = () => {
      const title = m.el.querySelector("#f_title").value.trim();
      if (!title) return UI.toast("أدخل عنوان الدرس", "error");
      const data = {
        title, description: m.el.querySelector("#f_desc").value.trim(),
        subjectId: m.el.querySelector("#f_subject").value,
        order: parseInt(m.el.querySelector("#f_order").value) || 1,
      };
      if (l) Object.assign(l, data);
      else Store.state.lessons.push({ id: "l_" + Utils.uid(), ...data, status: "PUBLISHED", createdAt: Date.now() });
      Store.persist(); m.close(); UI.toast(l ? "تم التعديل" : "تمت الإضافة", "success"); Router.render();
    };
  },

  deleteLesson(id) {
    UI.confirm("حذف الدرس سيحذف كل محتواه. متأكد؟", { danger: true }).then(ok => {
      if (!ok) return;
      Store.state.lessons = Store.state.lessons.filter(l => l.id !== id);
      Store.state.contents = Store.state.contents.filter(c => c.lessonId !== id);
      Store.persist(); UI.toast("تم الحذف"); Router.render();
    });
  },

  /* CONTENT */
  contentPage() {
    const contents = Store.state.contents;
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin-content", `
          <div class="section-head">
            <div><span class="eyebrow">المحتوى · ${contents.length}</span><h2 class="section-title">${Utils.icon("file-text", 22)} إدارة المحتوى</h2></div>
            <div class="flex gap-2 flex-wrap">
              ${contents.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllContents()">${Utils.icon("trash-2", 14)} حذف الكل</button>` : ""}
              <button class="btn btn-accent" onclick="Admin.openContentForm()">${Utils.icon("plus", 16)} محتوى جديد</button>
            </div>
          </div>
          ${contents.length ? `<div class="card" style="padding:0;overflow:hidden">
            ${contents.map(c => {
              const t = TYPES[c.type] || TYPES.FILE;
              return `<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)">
                <div class="ci-thumb" style="width:38px;height:38px">${Utils.icon(t.icon, 18)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:var(--t-sm);truncate">${Utils.esc(c.title)}</div>
                  <div style="font-size:11px;color:var(--text-3)">${t.label} • ${Utils.esc(Subjects.get(c.subjectId)?.name || "—")}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="Admin.openContentForm('${c.id}')">${Utils.icon("pencil", 12)}</button>
                <button class="btn btn-danger btn-sm" onclick="Admin.deleteContent('${c.id}')">${Utils.icon("trash-2", 12)}</button>
              </div>`;
            }).join("")}
          </div>` : C.empty("file-text", "لا محتوى بعد", "أضف ملخصات، PDFs، فيديوهات.",
            `<button class="btn btn-accent" onclick="Admin.openContentForm()">${Utils.icon("plus", 16)} محتوى جديد</button>`)}
        `, "المحتوى")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  openContentForm(id) {
    if (!Store.state.subjects.length) return UI.toast("أضف مادة أولًا", "error");
    const c = id ? Contents.byId(id) : null;
    const body = `
      <div class="field"><label>النوع *</label><select class="select" id="f_type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${c?.type === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></div>
      <div class="field"><label>العنوان *</label><input class="input" id="f_title" value="${Utils.esc(c?.title || "")}"></div>
      <div class="field"><label>الوصف</label><textarea class="textarea" id="f_desc">${Utils.esc(c?.description || "")}</textarea></div>
      <div class="field"><label>المادة *</label><select class="select" id="f_subject">${Store.state.subjects.map(s => `<option value="${s.id}" ${c?.subjectId === s.id ? "selected" : ""}>${Utils.esc(s.name)}</option>`).join("")}</select></div>
      <div class="field"><label>الدرس (اختياري)</label><select class="select" id="f_lesson"><option value="">— بدون —</option>${Store.state.lessons.map(l => `<option value="${l.id}" ${c?.lessonId === l.id ? "selected" : ""}>${Utils.esc(l.title)}</option>`).join("")}</select></div>
      <div class="field"><label>الرابط</label><input class="input" id="f_url" value="${Utils.esc(c?.url || c?.filePath || "")}" placeholder="YouTube / TikTok / ملف"></div>
      <div class="field"><label>النص (للملخصات)</label><textarea class="textarea" id="f_body" style="min-height:140px">${Utils.esc(c?.body || "")}</textarea></div>`;
    const m = UI.modal({ title: c ? "تعديل محتوى" : "محتوى جديد", body, size: "lg",
      footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-primary" data-ok>${c ? "حفظ" : "إضافة"}</button>` });
    m.el.querySelector("[data-x]").onclick = () => m.close();
    m.el.querySelector("[data-ok]").onclick = () => {
      const title = m.el.querySelector("#f_title").value.trim();
      if (!title) return UI.toast("أدخل العنوان", "error");
      const type = m.el.querySelector("#f_type").value;
      const url = m.el.querySelector("#f_url").value.trim();
      const data = {
        title, type, description: m.el.querySelector("#f_desc").value.trim(),
        subjectId: m.el.querySelector("#f_subject").value,
        lessonId: m.el.querySelector("#f_lesson").value || null,
        body: m.el.querySelector("#f_body").value.trim(),
      };
      delete data.url; delete data.filePath; delete data.videoId;
      if (type === "YOUTUBE" && url) { data.url = url; data.videoId = Utils.youtubeId(url); }
      else if (type === "TIKTOK") data.url = url;
      else if (type === "PDF" || type === "FILE") data.filePath = url;
      else if (url) data.url = url;
      if (c) Object.assign(c, data);
      else Store.state.contents.push({ id: "c_" + Utils.uid(), ...data, status: "PUBLISHED", createdAt: Date.now() });
      Store.persist(); m.close(); UI.toast(c ? "تم التعديل" : "تمت الإضافة", "success"); Router.render();
    };
  },

  deleteContent(id) {
    UI.confirm("حذف المحتوى؟", { danger: true }).then(ok => {
      if (!ok) return;
      Store.state.contents = Store.state.contents.filter(c => c.id !== id);
      Store.persist(); UI.toast("تم الحذف"); Router.render();
    });
  },

  /* EXAMS */
  examsPage() {
    const exams = Store.state.exams;
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin-exams", `
          <div class="section-head">
            <div><span class="eyebrow">الاختبارات · ${exams.length}</span><h2 class="section-title">${Utils.icon("clipboard-check", 22)} إدارة الاختبارات</h2></div>
            <div class="flex gap-2 flex-wrap">
              ${exams.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllExams()">${Utils.icon("trash-2", 14)} حذف الكل</button>` : ""}
              <button class="btn btn-accent" onclick="Admin.openExamForm()">${Utils.icon("plus", 16)} اختبار جديد</button>
            </div>
          </div>
          ${exams.length ? `<div class="grid grid-2">${exams.map(e => {
            const s = Subjects.get(e.subjectId);
            const att = Exams.attemptsFor(e.id).length;
            return `<div class="card">
              <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px">
                <div class="sc-icon" style="--c:${s?.color || "var(--primary)"}">${Utils.icon("file-question", 22)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700">${Utils.esc(e.title)}</div>
                  <div style="font-size:11px;color:var(--text-3)">${Utils.esc(s?.name || "—")}</div>
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
                <span class="tag">${e.questions.length} سؤال</span>
                ${e.duration ? `<span class="tag">${e.duration} د</span>` : ""}
                <span class="tag tag-success">${att} محاولة</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" style="flex:1" onclick="Admin.openExamForm('${e.id}')">${Utils.icon("pencil", 12)} تعديل</button>
                <button class="btn btn-danger btn-sm" onclick="Admin.deleteExam('${e.id}')">${Utils.icon("trash-2", 12)}</button>
              </div>
            </div>`;
          }).join("")}</div>` : C.empty("clipboard-x", "لا اختبارات بعد", "أضف اختبار بأول سؤال.",
            `<button class="btn btn-accent" onclick="Admin.openExamForm()">${Utils.icon("plus", 16)} اختبار جديد</button>`)}
        `, "الاختبارات")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  openExamForm(id) {
    if (!Store.state.subjects.length) return UI.toast("أضف مادة أولًا", "error");
    const e = id ? Exams.byId(id) : null;
    const questions = e ? [...e.questions] : [];
    const body = `
      <div class="field"><label>عنوان الاختبار *</label><input class="input" id="f_title" value="${Utils.esc(e?.title || "")}"></div>
      <div class="field"><label>الوصف</label><textarea class="textarea" id="f_desc">${Utils.esc(e?.description || "")}</textarea></div>
      <div class="field"><label>المادة</label><select class="select" id="f_subject">${Store.state.subjects.map(s => `<option value="${s.id}" ${e?.subjectId === s.id ? "selected" : ""}>${Utils.esc(s.name)}</option>`).join("")}</select></div>
      <div class="field"><label>المدة (دقائق)</label><input class="input" id="f_duration" type="number" value="${e?.duration || 20}"></div>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-weight:700">الأسئلة</div>
        <button class="btn btn-secondary btn-sm" type="button" onclick="Admin._addQ()">${Utils.icon("plus", 12)} سؤال</button>
      </div>
      <div id="questions-container"></div>`;
    const m = UI.modal({ title: e ? "تعديل اختبار" : "اختبار جديد", body, size: "lg",
      footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-primary" data-ok>${e ? "حفظ" : "إنشاء"}</button>` });
    const qContainer = m.el.querySelector("#questions-container");
    const renderQuestions = () => {
      qContainer.innerHTML = questions.length ? questions.map((q, i) => `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-weight:700;font-size:13px">السؤال ${i + 1}</div>
            <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Admin._removeQ(${i})">${Utils.icon("trash-2", 12)}</button>
          </div>
          <div class="field"><input class="input" data-q="${i}" data-f="q" value="${Utils.esc(q.question)}" placeholder="نص السؤال"></div>
          ${[0,1,2,3].map(j => `<div class="field"><input class="input" data-q="${i}" data-f="o" data-j="${j}" value="${Utils.esc(q.options[j] || "")}" placeholder="خيار ${j+1}"></div>`).join("")}
          <div class="field"><input class="input" data-q="${i}" data-f="c" value="${Utils.esc(q.correctAnswer)}" placeholder="الإجابة الصحيحة (نفس نص أحد الخيارات)"></div>
        </div>`).join("") : `<p style="color:var(--text-3);text-align:center;padding:20px">لا أسئلة</p>`;
      qContainer.querySelectorAll("input").forEach(inp => {
        inp.oninput = () => {
          const i = +inp.dataset.q;
          if (inp.dataset.f === "q") questions[i].question = inp.value;
          else if (inp.dataset.f === "o") questions[i].options[+inp.dataset.j] = inp.value;
          else if (inp.dataset.f === "c") questions[i].correctAnswer = inp.value;
        };
      });
    };
    Admin._addQ = () => { questions.push({ id: "q_" + Utils.uid(), question: "", options: ["", "", "", ""], correctAnswer: "", points: 1 }); renderQuestions(); };
    Admin._removeQ = i => { questions.splice(i, 1); renderQuestions(); };
    renderQuestions();
    m.el.querySelector("[data-x]").onclick = () => m.close();
    m.el.querySelector("[data-ok]").onclick = () => {
      const title = m.el.querySelector("#f_title").value.trim();
      if (!title) return UI.toast("أدخل العنوان", "error");
      const validQs = questions.filter(q => q.question.trim() && q.correctAnswer.trim());
      if (!validQs.length) return UI.toast("أضف سؤال واحد على الأقل", "error");
      for (const q of validQs) {
        if (!q.options.includes(q.correctAnswer)) return UI.toast(`"${q.correctAnswer}" مش في الخيارات`, "error");
      }
      const data = {
        title, description: m.el.querySelector("#f_desc").value.trim(),
        subjectId: m.el.querySelector("#f_subject").value,
        duration: parseInt(m.el.querySelector("#f_duration").value) || null,
        questions: validQs,
      };
      if (e) Object.assign(e, data);
      else Store.state.exams.push({ id: "ex_" + Utils.uid(), publicSlug: "exam-" + Utils.uid(), ...data, status: "PUBLISHED" });
      Store.persist(); m.close(); UI.toast(e ? "تم التعديل" : "تم الإنشاء", "success"); Router.render();
    };
  },

  deleteExam(id) {
    UI.confirm("حذف الاختبار؟", { danger: true }).then(ok => {
      if (!ok) return;
      Store.state.exams = Store.state.exams.filter(e => e.id !== id);
      Store.persist(); UI.toast("تم الحذف"); Router.render();
    });
  },

  /* BOOKS ADMIN */
  booksPage() {
    const books = Books.all();
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin-books", `
          <div class="section-head">
            <div><span class="eyebrow">الكتب · ${books.length}</span><h2 class="section-title">${Utils.icon("library", 22)} إدارة الكتب</h2></div>
            <div class="flex gap-2 flex-wrap">
              ${books.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllBooks()">${Utils.icon("trash-2", 14)} حذف الكل</button>` : ""}
              <button class="btn btn-accent" onclick="Admin.openBookForm()">${Utils.icon("plus", 16)} كتاب جديد</button>
            </div>
          </div>
          ${books.length ? `<div class="card" style="padding:0;overflow:hidden">
            ${books.map(b => `
              <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border)">
                <div class="ci-thumb" style="width:38px;height:38px;background:var(--primary-soft);color:var(--primary)">
                  ${b.cover ? `<img src="${Utils.esc(b.cover)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : Utils.icon("book-open", 18)}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:var(--t-sm);truncate">${Utils.esc(b.title)}</div>
                  <div style="font-size:11px;color:var(--text-3)">${b.author ? Utils.esc(b.author) + " • " : ""}${Utils.timeAgo(b.createdAt)}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="Admin.openBookForm('${b.id}')">${Utils.icon("pencil", 12)}</button>
                <button class="btn btn-danger btn-sm" onclick="Admin.deleteBook('${b.id}')">${Utils.icon("trash-2", 12)}</button>
              </div>
            `).join("")}
          </div>` : C.empty("library", "لا كتب بعد", "أضف أول كتاب.",
            `<button class="btn btn-accent" onclick="Admin.openBookForm()">${Utils.icon("plus", 16)} كتاب جديد</button>`)}
        `, "الكتب")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  openBookForm(id) {
    const b = id ? Books.byId(id) : null;
    const body = `
      <div class="field"><label>عنوان الكتاب *</label><input class="input" id="f_title" value="${Utils.esc(b?.title || "")}"></div>
      <div class="field"><label>المؤلف</label><input class="input" id="f_author" value="${Utils.esc(b?.author || "")}"></div>
      <div class="field"><label>التصنيف</label><input class="input" id="f_category" value="${Utils.esc(b?.category || "")}" placeholder="مثال: رياضيات، أدب"></div>
      <div class="field"><label>رابط التحميل *</label><input class="input" id="f_download" value="${Utils.esc(b?.downloadUrl || "")}" placeholder="https://..."></div>
      <div class="field"><label>رابط المعاينة</label><input class="input" id="f_preview" value="${Utils.esc(b?.previewUrl || "")}" placeholder="https://..."></div>
      <div class="field"><label>الوصف *</label><textarea class="textarea" id="f_desc" style="min-height:140px">${Utils.esc(b?.description || "")}</textarea></div>
      <div class="field"><label>ملاحظات إضافية</label><textarea class="textarea" id="f_notes">${Utils.esc(b?.notes || "")}</textarea></div>
      <div class="field">
        <label>صورة الغلاف</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('f_cover_file').click()">
            ${Utils.icon("upload", 14)} رفع صورة
          </button>
          <input type="file" id="f_cover_file" accept="image/*" style="display:none">
        </div>
        <input class="input" id="f_cover_url" value="${Utils.esc(b?.cover || "")}" placeholder="أو الصق رابط صورة">
        <div id="cover-preview" style="margin-top:12px;${b?.cover ? "" : "display:none"}">
          <img id="cover-img" src="${Utils.esc(b?.cover || "")}" style="max-width:150px;border-radius:8px">
        </div>
      </div>`;
    const m = UI.modal({ title: b ? "تعديل كتاب" : "كتاب جديد", body, size: "lg",
      footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-primary" data-ok>${b ? "حفظ" : "إضافة"}</button>` });

    const coverFileInput = m.el.querySelector("#f_cover_file");
    const coverUrlInput = m.el.querySelector("#f_cover_url");
    const coverPreview = m.el.querySelector("#cover-preview");
    const coverImg = m.el.querySelector("#cover-img");
    let coverBase64 = b?.cover?.startsWith("data:") ? b.cover : "";

    coverFileInput.onchange = async () => {
      const file = coverFileInput.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        UI.toast("الصورة كبيرة جداً (الحد 500KB)", "error");
        return;
      }
      coverBase64 = await Utils.fileToDataURL(file);
      coverImg.src = coverBase64;
      coverPreview.style.display = "block";
      coverUrlInput.value = "";
    };
    coverUrlInput.oninput = () => {
      if (coverUrlInput.value.trim()) {
        coverImg.src = coverUrlInput.value.trim();
        coverPreview.style.display = "block";
        coverBase64 = "";
      }
    };

    m.el.querySelector("[data-x]").onclick = () => m.close();
    m.el.querySelector("[data-ok]").onclick = () => {
      const title = m.el.querySelector("#f_title").value.trim();
      const downloadUrl = m.el.querySelector("#f_download").value.trim();
      const description = m.el.querySelector("#f_desc").value.trim();
      if (!title) return UI.toast("أدخل عنوان الكتاب", "error");
      if (!downloadUrl) return UI.toast("أدخل رابط التحميل", "error");
      if (!description) return UI.toast("أدخل وصف الكتاب", "error");

      const cover = coverBase64 || coverUrlInput.value.trim();
      const data = {
        title, description,
        author: m.el.querySelector("#f_author").value.trim(),
        category: m.el.querySelector("#f_category").value.trim(),
        downloadUrl,
        previewUrl: m.el.querySelector("#f_preview").value.trim(),
        notes: m.el.querySelector("#f_notes").value.trim(),
        cover,
      };
      if (b) Books.update(b.id, data);
      else Books.add(data);
      m.close();
      UI.toast(b ? "تم التعديل" : "تمت الإضافة", "success");
      Router.render();
    };
  },

  deleteBook(id) {
    UI.confirm("حذف الكتاب؟", { danger: true }).then(ok => {
      if (!ok) return;
      Books.remove(id);
      UI.toast("تم الحذف");
      Router.render();
    });
  },

  /* POSTS */
  postsPage() {
    const posts = [...Store.state.posts].sort((a, b) => b.createdAt - a.createdAt);
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin-posts", `
          <div class="section-head">
            <div><span class="eyebrow">الإعلانات · ${posts.length}</span><h2 class="section-title">${Utils.icon("megaphone", 22)} إدارة الإعلانات</h2></div>
            <div class="flex gap-2 flex-wrap">
              ${posts.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllPosts()">${Utils.icon("trash-2", 14)} حذف الكل</button>` : ""}
              <button class="btn btn-accent" onclick="Admin.openPostForm()">${Utils.icon("plus", 16)} إعلان جديد</button>
            </div>
          </div>
          ${posts.length ? posts.map(p => `
            <div class="card" style="margin-bottom:12px">
              <div style="font-weight:700;font-size:var(--t-md);margin-bottom:8px">${Utils.esc(p.title)}</div>
              ${p.mediaType && p.mediaUrl ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:6px">${Utils.icon(p.mediaType === "image" ? "image" : "youtube", 12)} ${p.mediaType === "image" ? "صورة" : p.mediaType === "youtube" ? "يوتيوب" : "TikTok"}</div>` : ""}
              <div style="font-size:var(--t-xs);color:var(--text-3);margin-bottom:12px">${Utils.timeAgo(p.createdAt)}</div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" onclick="Admin.openPostForm('${p.id}')">${Utils.icon("pencil", 12)} تعديل</button>
                <button class="btn btn-danger btn-sm" onclick="Admin.deletePost('${p.id}')">${Utils.icon("trash-2", 12)} حذف</button>
              </div>
            </div>
          `).join("") : C.empty("megaphone", "لا إعلانات بعد", "انشر أول إعلان.",
            `<button class="btn btn-accent" onclick="Admin.openPostForm()">${Utils.icon("plus", 16)} إعلان جديد</button>`)}
        `, "الإعلانات")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  openPostForm(id) {
    const p = id ? Store.state.posts.find(x => x.id === id) : null;
    const body = `
      <div class="field"><label>العنوان *</label><input class="input" id="f_title" value="${Utils.esc(p?.title || "")}"></div>
      <div class="field"><label>النص</label><textarea class="textarea" id="f_body" style="min-height:140px">${Utils.esc(p?.body || "")}</textarea></div>

      <div class="field">
        <label>نوع المرفق</label>
        <select class="select" id="f_mediaType">
          <option value="">بدون</option>
          <option value="image" ${p?.mediaType === "image" ? "selected" : ""}>صورة</option>
          <option value="youtube" ${p?.mediaType === "youtube" ? "selected" : ""}>فيديو YouTube</option>
          <option value="tiktok" ${p?.mediaType === "tiktok" ? "selected" : ""}>TikTok</option>
        </select>
      </div>

      <div class="field" id="media-container">
        <label>محتوى المرفق</label>
        <input class="input" id="f_mediaUrl" value="${Utils.esc(p?.mediaUrl || "")}" placeholder="الرابط (أو ارفع صورة تحت)">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('f_image_file').click()">
            ${Utils.icon("upload", 14)} رفع صورة
          </button>
          <input type="file" id="f_image_file" accept="image/*" style="display:none">
        </div>
        <div id="post-media-preview" style="margin-top:12px;${p?.mediaUrl && p?.mediaType === "image" ? "" : "display:none"}">
          <img id="post-media-img" src="${p?.mediaType === "image" ? Utils.esc(p.mediaUrl) : ""}" style="max-width:200px;border-radius:8px">
        </div>
        <div class="field-hint">لصورة: رابط أو ارفع صورة. ليوتيوب/TikTok: الصق الرابط فقط.</div>
      </div>`;
    const m = UI.modal({ title: p ? "تعديل إعلان" : "إعلان جديد", body, size: "lg",
      footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-primary" data-ok>${p ? "حفظ" : "نشر"}</button>` });

    const mediaTypeSelect = m.el.querySelector("#f_mediaType");
    const imageFileInput = m.el.querySelector("#f_image_file");
    const mediaUrlInput = m.el.querySelector("#f_mediaUrl");
    const mediaPreview = m.el.querySelector("#post-media-preview");
    const mediaImg = m.el.querySelector("#post-media-img");
    let imageBase64 = "";

    imageFileInput.onchange = async () => {
      const file = imageFileInput.files[0];
      if (!file) return;
      if (file.size > 700 * 1024) {
        UI.toast("الصورة كبيرة جداً (الحد 700KB)", "error");
        return;
      }
      imageBase64 = await Utils.fileToDataURL(file);
      mediaTypeSelect.value = "image";
      mediaImg.src = imageBase64;
      mediaPreview.style.display = "block";
      mediaUrlInput.value = "";
    };

    mediaUrlInput.oninput = () => {
      const type = mediaTypeSelect.value;
      if (type === "image" && mediaUrlInput.value.trim()) {
        mediaImg.src = mediaUrlInput.value.trim();
        mediaPreview.style.display = "block";
        imageBase64 = "";
      } else {
        mediaPreview.style.display = "none";
      }
    };

    m.el.querySelector("[data-x]").onclick = () => m.close();
    m.el.querySelector("[data-ok]").onclick = () => {
      const title = m.el.querySelector("#f_title").value.trim();
      const bodyText = m.el.querySelector("#f_body").value.trim();
      if (!title) return UI.toast("أدخل العنوان", "error");
      const mediaType = mediaTypeSelect.value;
      let mediaUrl = imageBase64 || mediaUrlInput.value.trim();
      if (mediaType && !mediaUrl) return UI.toast("أضف محتوى المرفق أو اختر بدون", "error");
      if (!mediaType) mediaUrl = "";

      const data = { title, body: bodyText, mediaType: mediaType || "", mediaUrl };
      if (p) Object.assign(p, data);
      else Store.state.posts.unshift({ id: "p_" + Utils.uid(), ...data, createdAt: Date.now() });
      Notifications.add(title, bodyText.slice(0, 80), "posts");
      Store.persist(); m.close(); UI.toast(p ? "تم التعديل" : "تم النشر", "success"); Router.render();
    };
  },

  deletePost(id) {
    UI.confirm("حذف الإعلان؟", { danger: true }).then(ok => {
      if (!ok) return;
      Store.state.posts = Store.state.posts.filter(p => p.id !== id);
      Store.persist(); UI.toast("تم الحذف"); Router.render();
    });
  },

  /* USERS */
  usersPage() {
    const users = [...Store.state.users].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    const others = users.filter(u => u.email !== Store.state.user?.email);
    return `
      ${Shell.topbar()}
      ${Shell.sidebar()}
      <main class="main">
        ${this.layout("admin-users", `
          <div class="section-head">
            <div><span class="eyebrow">الطلاب · ${users.length}</span><h2 class="section-title">${Utils.icon("users", 22)} إدارة الطلاب</h2></div>
            ${others.length ? `<button class="btn btn-danger btn-sm" onclick="Admin.deleteAllUsers()">${Utils.icon("trash-2", 14)} حذف الكل</button>` : ""}
          </div>
          ${users.length ? `<div class="grid grid-2">${users.map(u => `
            <div class="card">
              <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
                <div class="avatar" style="width:46px;height:46px">
                  ${u.picture ? `<img src="${u.picture}">` : (u.name?.[0] || "?")}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:var(--t-sm)">${Utils.esc(u.name)}</div>
                  <div style="font-size:11px;color:var(--text-3);truncate">${Utils.esc(u.email)}</div>
                </div>
                ${CONFIG.ADMIN_EMAILS.includes((u.email || "").toLowerCase()) ? '<span class="tag tag-accent">أدمن</span>' : ""}
                ${u.banned ? '<span class="tag tag-danger">محظور</span>' : '<span class="tag tag-success">نشط</span>'}
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                <span class="tag">${u.phone || "—"}</span>
                <span class="tag">@${u.username || "—"}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn ${u.banned ? "btn-success" : "btn-danger"} btn-sm" style="flex:1" onclick="Admin.toggleBan('${u.id}')">
                  ${Utils.icon(u.banned ? "user-check" : "user-x", 12)} ${u.banned ? "إلغاء الحظر" : "حظر"}
                </button>
              </div>
            </div>
          `).join("")}</div>` : C.empty("users", "لا طلاب بعد", "أول ما حد يسجل هتلاقيه هنا.")}
        `, "الطلاب")}
      </main>
      ${Shell.bottomNav("home")}`;
  },

  toggleBan(userId) {
    const u = Store.state.users.find(x => x.id === userId);
    if (!u) return;
    if (u.email === Store.state.user?.email) return UI.toast("مش هتقدر تحظر نفسك", "error");
    u.banned = !u.banned;
    Store.persist();
    UI.toast(u.banned ? "تم الحظر" : "تم إلغاء الحظر", "success");
    Router.render();
  },
};

/* ----- ROUTER ----- */
const Router = {
  current: { route: "home", param: null },
  go(route, param) {
    if (route.startsWith("admin")) {
      const u = Store.state.user;
      if (!u || !CONFIG.ADMIN_EMAILS.includes((u.email || "").toLowerCase())) {
        UI.toast("هذه الصفحة مخصصة للإدارة", "error");
        return this.go("home");
      }
    }
    this.current = { route, param };
    sessionStorage.setItem(CONFIG.ROUTE_KEY, JSON.stringify(this.current));
    this.render();
    window.scrollTo({ top: 0, behavior: "instant" });
  },
  render() {
    const { route, param } = this.current;
    const app = document.getElementById("app");
    const u = Store.state.user;

    if (u && u.banned) {
      app.innerHTML = `
        <div style="min-height:100dvh;display:grid;place-items:center;padding:32px;text-align:center">
          <div>
            <div style="font-size:64px;margin-bottom:16px">🚫</div>
            <h2 style="margin-bottom:8px">تم حظر حسابك</h2>
            <p style="color:#666;margin-bottom:24px">تواصل مع الإدارة</p>
            <a href="${CONFIG.CONTACTS.admins}" target="_blank" style="padding:10px 20px;background:#0e7490;color:#fff;border-radius:8px;font-weight:600;text-decoration:none">تواصل معنا</a>
          </div>
        </div>`;
      return;
    }

    const requiresAuth = ["subjects", "subject", "lesson", "books", "book", "exams", "exam", "exam-take",
      "favorites", "plan", "calendar", "notifications", "achievements", "account", "settings", "search", "posts",
      "admin", "admin-subjects", "admin-lessons", "admin-content", "admin-exams", "admin-books", "admin-posts", "admin-users"];

    if (requiresAuth.includes(route) && !u) {
      app.innerHTML = Views.landing();
    } else {
      let html = "";
      switch (route) {
        case "home":              html = Views.home(); break;
        case "subjects":          html = Views.subjects(); break;
        case "subject":           html = Views.subject(param); break;
        case "lesson":            html = Views.lesson(param); break;
        case "books":             html = Views.books(); break;
        case "book":              html = Views.book(param); break;
        case "exams":             html = Views.exams(); break;
        case "exam":              html = Views.exam(param); break;
        case "exam-take":         html = Views.examTake(param); break;
        case "favorites":         html = Views.favorites(); break;
        case "notifications":     html = Views.notifications(); break;
        case "calendar":          html = Views.calendar(); break;
        case "plan":              html = Views.plan(); break;
        case "achievements":      html = Views.achievements(); break;
        case "account":           html = Views.account(); break;
        case "settings":          html = Views.settings(); break;
        case "search":            html = Views.search(); break;
        case "posts":             html = Views.posts(); break;
        case "about":             html = Views.about(); break;
        case "admin":             html = Admin.dashboard(); break;
        case "admin-subjects":    html = Admin.subjectsPage(); break;
        case "admin-lessons":     html = Admin.lessonsPage(); break;
        case "admin-content":     html = Admin.contentPage(); break;
        case "admin-exams":       html = Admin.examsPage(); break;
        case "admin-books":       html = Admin.booksPage(); break;
        case "admin-posts":       html = Admin.postsPage(); break;
        case "admin-users":       html = Admin.usersPage(); break;
        default:                  html = Views.notFound();
      }
      app.innerHTML = html;
    }
    UI.afterRender();
    Shell.syncNav(route);
    if (route === "exam-take" && param) Actions.startExamTimer(Exams.byId(param));
  },
};

/* ----- ACTIONS ----- */
const Actions = {
  toggleComplete(lid) { const done = Progress.toggle(lid); UI.toast(done ? "تم التعليم كمذاكرة ✓" : "تم إلغاء الإكمال"); Router.render(); },
  toggleFav(id) { const added = Favorites.toggle(id); UI.toast(added ? "أُضيف للمفضلة" : "أُزيل من المفضلة"); Router.render(); },
  readNotif(id) { Notifications.read(id); Router.render(); },
  markAllRead() { Notifications.readAll(); Router.render(); UI.toast("تم تعليم الكل كمقروء"); },
  togglePlan(id) { Plan.toggle(id); Router.render(); },
  deletePlan(id) { Plan.remove(id); UI.toast("تم الحذف"); Router.render(); },

  openAddPlan(lessonId, subjectId) {
    const lessonsHtml = (subjectId ? Subjects.lessons(subjectId) : Store.state.lessons)
      .map(l => `<option value="${l.id}" ${lessonId === l.id ? "selected" : ""}>${Utils.esc(l.title)}</option>`).join("");
    const body = `
      <div class="field"><label>عنوان المهمة</label><input class="input" id="p_title" placeholder="مثال: مراجعة الدرس"></div>
      <div class="field"><label>المادة</label><select class="select" id="p_subject">${Store.state.subjects.map(s => `<option value="${s.id}" ${subjectId === s.id ? "selected" : ""}>${Utils.esc(s.name)}</option>`).join("")}</select></div>
      <div class="field"><label>الدرس (اختياري)</label><select class="select" id="p_lesson"><option value="">— بدون —</option>${lessonsHtml}</select></div>
      <div class="field"><label>التاريخ</label><input class="input" id="p_date" type="date" value="${new Date().toISOString().split("T")[0]}"></div>`;
    const m = UI.modal({ title: "مهمة جديدة", body,
      footer: `<button class="btn btn-secondary" data-x>إلغاء</button><button class="btn btn-primary" data-ok>حفظ</button>` });
    m.el.querySelector("[data-x]").onclick = () => m.close();
    m.el.querySelector("[data-ok]").onclick = () => {
      const title = m.el.querySelector("#p_title").value.trim();
      if (!title) return UI.toast("أدخل عنوان المهمة", "error");
      Plan.add({
        title, subjectId: m.el.querySelector("#p_subject").value,
        lessonId: m.el.querySelector("#p_lesson").value || null,
        dueDate: new Date(m.el.querySelector("#p_date").value).getTime(),
      });
      m.close(); UI.toast("تمت الإضافة", "success"); Router.render();
    };
  },

  startExam(examId) { Actions._examAnswers = {}; Router.go("exam-take", examId); },
  retryExam(examId) { sessionStorage.removeItem("bak_result_" + examId); Actions._examAnswers = {}; Router.go("exam-take", examId); },

  selectOpt(el, qid, val) {
    const parent = el.closest(".options");
    parent.querySelectorAll(".opt").forEach(x => x.classList.remove("selected"));
    el.classList.add("selected");
    Actions._examAnswers = Actions._examAnswers || {};
    Actions._examAnswers[qid] = val;
    Actions._updateExamProgress();
  },

  _updateExamProgress() {
    const form = document.getElementById("examForm");
    if (!form) return;
    const total = form.querySelectorAll(".q-block").length;
    const answered = Object.keys(Actions._examAnswers || {}).length;
    const pct = total ? Math.round((answered / total) * 100) : 0;
    const p = document.getElementById("examProgress");
    const a = document.getElementById("examAnswered");
    if (p) p.style.width = pct + "%";
    if (a) a.textContent = answered;
  },

  submitExam(examId) {
    const exam = Exams.byId(examId);
    if (!exam) return;
    const answered = Object.keys(Actions._examAnswers || {}).length;
    const proceed = answered === exam.questions.length
      ? Promise.resolve(true)
      : UI.confirm(`لم تجب على ${exam.questions.length - answered} سؤال. تسليم؟`, { confirmText: "تسليم" });
    proceed.then(ok => {
      if (!ok) return;
      clearInterval(Actions._timerInt);
      const timeSpent = Math.floor((Date.now() - (Actions._examStart || Date.now())) / 1000);
      const attempt = Exams.submit(examId, { ...Actions._examAnswers }, timeSpent);
      sessionStorage.setItem("bak_result_" + examId, JSON.stringify(attempt));
      Actions._examAnswers = {};
      UI.toast(`درجتك: ${attempt.score}/${attempt.total}`, "success", 3200);
      Router.go("exam", exam.publicSlug);
    });
  },

  startExamTimer(exam) {
    clearInterval(Actions._timerInt);
    if (!exam || !exam.duration) return;
    Actions._examStart = Date.now();
    Actions._examEnd = Actions._examStart + exam.duration * 60 * 1000;
    Actions._timerInt = setInterval(() => {
      const el = document.getElementById("examTimer");
      if (!el) { clearInterval(Actions._timerInt); return; }
      const remaining = Math.max(0, Actions._examEnd - Date.now());
      el.textContent = Utils.minutesToTime(Math.ceil(remaining / 60000));
      el.classList.toggle("warn", remaining < 5 * 60 * 1000 && remaining >= 60 * 1000);
      el.classList.toggle("danger", remaining < 60 * 1000);
      if (remaining <= 0) {
        clearInterval(Actions._timerInt);
        UI.toast("انتهى الوقت — جارٍ التسليم", "error");
        Actions.submitExam(exam.id);
      }
    }, 500);
  },

  searchDebounced: (function () {
    let t;
    return function (q) { clearTimeout(t); t = setTimeout(() => Actions._doSearch(q, Actions._filter || "all"), 260); };
  })(),

  setSearchFilter(f, btn) {
    Actions._filter = f;
    btn.parentElement.querySelectorAll("button").forEach(b => { b.classList.remove("btn-primary"); b.classList.add("btn-secondary"); });
    btn.classList.remove("btn-secondary"); btn.classList.add("btn-primary");
    Actions._doSearch(document.getElementById("searchInput")?.value || "", f);
  },

  _doSearch(q, filter) {
    const query = (q || "").trim().toLowerCase();
    const box = document.getElementById("searchResults");
    if (!box) return;
    let results = [];
    if (filter === "all" || filter === "lesson") {
      Store.state.lessons.filter(l => l.status === "PUBLISHED").forEach(l => {
        if (!query || l.title.toLowerCase().includes(query) || (l.description || "").toLowerCase().includes(query)) results.push({ kind: "lesson", data: l });
      });
    }
    if (filter === "all" || filter === "content") {
      Store.state.contents.filter(c => c.status === "PUBLISHED").forEach(c => {
        if (query && (c.title.toLowerCase().includes(query) || (c.description || "").toLowerCase().includes(query))) results.push({ kind: "content", data: c });
      });
    }
    if (filter === "all" || filter === "exam") {
      Store.state.exams.filter(e => e.status === "PUBLISHED").forEach(e => {
        if (query && (e.title.toLowerCase().includes(query) || (e.description || "").toLowerCase().includes(query))) results.push({ kind: "exam", data: e });
      });
    }
    if (filter === "all" || filter === "book") {
      Books.all().forEach(b => {
        if (query && (b.title.toLowerCase().includes(query) || (b.description || "").toLowerCase().includes(query) || (b.author || "").toLowerCase().includes(query))) results.push({ kind: "book", data: b });
      });
    }
    if (!results.length) {
      box.innerHTML = C.empty("search", "لا توجد نتائج", query ? `لم نجد شيئًا لـ "${Utils.esc(query)}"` : "اكتب كلمة للبحث");
      UI.afterRender();
      return;
    }
    box.innerHTML = `<div class="grid grid-2">${results.slice(0, 30).map(r => {
      if (r.kind === "lesson") return C.lessonRow(r.data, "•");
      if (r.kind === "content") return C.contentItem(r.data);
      if (r.kind === "book") return C.bookCard(r.data);
      if (r.kind === "exam") {
        const s = Subjects.get(r.data.subjectId);
        return `<div class="ci" onclick="Router.go('exam','${r.data.publicSlug}')">
          <div class="ci-thumb">${Utils.icon("file-question", 22)}</div>
          <div class="ci-body">
            <div class="ci-title">${Utils.esc(r.data.title)}</div>
            <div class="ci-meta"><span class="tag">اختبار</span><span>${Utils.esc(s?.name || "")}</span></div>
          </div>
        </div>`;
      }
      return "";
    }).join("")}</div>`;
    UI.afterRender();
  },

  _observeFade() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    document.querySelectorAll(".fade-up:not(.visible)").forEach(el => observer.observe(el));
  },
};

/* ----- AUTH (Google) ----- */
const Auth = {
  signIn() {
    if (CONFIG.GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      this._initGoogle();
      window.google.accounts.id.prompt();
      return;
    }
    this._showConfirmForm({ googleId: "g_" + Utils.uid(), name: "", email: "", picture: "" });
  },

  _initGoogle() {
    if (this._googleInited) return;
    this._googleInited = true;
    window.google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: (response) => this._handleGoogleResponse(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
  },

  _handleGoogleResponse(response) {
    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      this._showConfirmForm({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      });
    } catch (e) {
      UI.toast("فشل تسجيل الدخول", "error");
      console.error(e);
    }
  },

  _showConfirmForm(user) {
    const body = `
      <p style="color:var(--text-2);font-size:var(--t-sm);margin-bottom:var(--s-4);line-height:1.7">
        مرحبًا بك في بكالوري! أكمل بياناتك للبدء.
      </p>
      <div class="field"><label>الاسم</label><input class="input" id="i_name" value="${Utils.esc(user.name || "")}" placeholder="اسمك الكامل"></div>
      <div class="field"><label>البريد الإلكتروني</label><input class="input" id="i_email" type="email" value="${Utils.esc(user.email || "")}" placeholder="you@gmail.com"></div>
      <div class="field"><label>رقم الهاتف</label><input class="input" id="i_phone" placeholder="01xxxxxxxxx" type="tel"></div>
      <div class="field"><label>اسم المستخدم</label><input class="input" id="i_user" placeholder="ahmed_2025"></div>
      <label style="display:flex;align-items:center;gap:var(--s-2);cursor:pointer">
        <input type="checkbox" id="i_confirm" style="width:auto;accent-color:var(--primary)">
        <span style="font-size:var(--t-sm)">أؤكد أنني طالب في تانية بكالوري مصرية</span>
      </label>`;
    const m = UI.modal({ title: "تأكيد بياناتك", body,
      footer: `<button class="btn btn-primary btn-block" data-ok>ابدأ الآن</button>` });
    m.el.querySelector("[data-ok]").onclick = () => {
      const name = m.el.querySelector("#i_name").value.trim();
      const email = m.el.querySelector("#i_email").value.trim();
      const phone = m.el.querySelector("#i_phone").value.trim();
      const username = m.el.querySelector("#i_user").value.trim();
      if (!name || !email || !phone || !username) return UI.toast("أكمل جميع الحقول", "error");
      if (!email.includes("@") || !email.includes(".")) return UI.toast("البريد الإلكتروني غير صحيح", "error");
      if (!m.el.querySelector("#i_confirm").checked) return UI.toast("يجب تأكيد أنك طالب بكالوري", "error");
      const newUser = { ...user, name, email, phone, username, confirmedAt: Date.now() };
      Store.state.user = newUser;
      const userRecord = {
        id: newUser.googleId || Utils.uid(),
        name, email, phone, username, picture: newUser.picture,
        role: CONFIG.ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "student",
        banned: false, lastSeen: Date.now(), joinedAt: Date.now(),
      };
      const idx = Store.state.users.findIndex(u => u.id === userRecord.id);
      if (idx >= 0) Store.state.users[idx] = { ...Store.state.users[idx], ...userRecord, joinedAt: Store.state.users[idx].joinedAt };
      else Store.state.users.push(userRecord);
      Store.persist();
      m.close();
      UI.toast(`أهلًا بك، ${name.split(" ")[0]}!`, "success", 3000);
      Router.go("home");
    };
  },

  signOut() {
    UI.confirm("هل تريد تسجيل الخروج؟", { confirmText: "خروج", danger: true }).then(ok => {
      if (!ok) return;
      const currentId = Store.state.user?.googleId;
      if (currentId) {
        const u = Store.state.users.find(x => x.id === currentId);
        if (u) u.lastSeen = Date.now();
      }
      Store.state.user = null;
      Store.persist();
      if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
      Router.go("home");
      UI.toast("تم تسجيل الخروج");
    });
  },
};

/* ----- EVENT DELEGATION ----- */
document.addEventListener("click", e => {
  const opt = e.target.closest(".opt[data-qid]");
  if (opt) Actions.selectOpt(opt, opt.dataset.qid, opt.dataset.val);
});

/* ----- BOOT ----- */
(function boot() {
  const saved = localStorage.getItem(CONFIG.THEME_KEY);
  if (saved) document.documentElement.dataset.theme = saved;
  else if (window.matchMedia("(prefers-color-scheme: light)").matches) document.documentElement.dataset.theme = "light";
  else document.documentElement.dataset.theme = "dark";

  Store.init();

  const savedRoute = sessionStorage.getItem(CONFIG.ROUTE_KEY);
  if (savedRoute) { try { Router.current = JSON.parse(savedRoute); } catch {} }

  if (CONFIG.GOOGLE_CLIENT_ID && window.google?.accounts?.id) Auth._initGoogle();
  else setTimeout(() => { if (CONFIG.GOOGLE_CLIENT_ID && window.google?.accounts?.id) Auth._initGoogle(); }, 1000);

  window.addEventListener("error", e => console.error("App Error:", e.error));
  window.addEventListener("unhandledrejection", e => console.error("Unhandled Promise:", e.reason));

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      Shell.closeSidebar();
      document.querySelector(".modal-bg.show [data-close]")?.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      if (Store.state.user) Router.go("search");
    }
  });

  window.addEventListener("scroll", () => {
    const tb = document.getElementById("topbar");
    if (tb) tb.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  Router.render();
})();
