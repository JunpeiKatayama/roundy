import { pagesToLines } from "./pdf-lines.js";
import { expandBlocks, mergeWithPrevious, parseLines, splitBlock } from "./parser.js";
import { labelToJapanese, translatePattern } from "./translator.js";
import { loadLibrary, loadSettings, saveLibrary, saveSettings, takeLegacyState } from "./storage.js";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const MIN_TEXT_LENGTH = 40;
const SWIPE_DISTANCE = 60;
const FONT_STEPS = [0.9, 1, 1.15, 1.3, 1.5, 1.75];

const app = document.getElementById("app");
const sheet = document.getElementById("sheet");
const toastEl = document.getElementById("toast");

let library = loadLibrary();
let settings = loadSettings();
let wakeLock = null;
let wantsWakeLock = false;
let cleanupScreen = () => {};

// DOM 組み立て。PDF由来の文字列は必ず textContent で入れる
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "class") el.className = value;
    else if (key in el && key !== "list") el[key] = value;
    else if (value !== false && value != null) el.setAttribute(key, value);
  }
  el.append(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

function iconButton(name, label, onclick, extra = {}) {
  return h("button", { type: "button", class: "icon-btn", "aria-label": label, title: label, onclick, ...extra }, icon(name));
}

let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 3200);
}

function openSheet(title, ...content) {
  sheet.replaceChildren(
    h("div", { class: "sheet-head" }, h("h2", {}, title), h("button", { type: "button", class: "text-btn", onclick: () => sheet.close() }, "閉じる")),
    h("div", { class: "sheet-body" }, content)
  );
  sheet.showModal();
}

function confirmSheet(title, message, actionLabel) {
  return new Promise((resolve) => {
    let result = false;
    sheet.addEventListener("close", () => resolve(result), { once: true });
    openSheet(
      title,
      h("p", {}, message),
      h("button", {
        type: "button",
        class: "btn btn-danger",
        onclick: () => {
          result = true;
          sheet.close();
        },
      }, actionLabel)
    );
  });
}

// ---------- データ ----------

function persist() {
  if (!saveLibrary(library)) toast("保存できませんでした。不要な作品を削除してください。");
}

const findPattern = (id) => library.find((p) => p.id === id);

function addPattern(name, parsed) {
  const pattern = {
    id: `p${Date.now().toString(36)}`,
    name,
    info: parsed.info,
    blocks: parsed.blocks,
    index: 0,
    tally: {},
    done: false,
    updatedAt: Date.now(),
  };
  library.unshift(pattern);
  persist();
  return pattern;
}

function migrateLegacy() {
  const state = takeLegacyState();
  if (!state) return;
  const parsed = parseLines(state.patternBlocks.flatMap((b) => b.content.split("\n")));
  if (!parsed.blocks.length) return;
  const pattern = addPattern("前回の作品", parsed);
  pattern.index = Math.min(state.currentBlockIndex ?? 0, expandBlocks(pattern.blocks).length - 1);
  persist();
}

// ---------- PDF 読み込み ----------

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const script = h("script", { src: PDFJS_URL });
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("pdfjs"));
    document.head.append(script);
  });
}

async function readPages(file) {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    pages.push({ items: content.items, height: page.getViewport({ scale: 1 }).height });
  }
  return pages;
}

function failureMessage(error) {
  if (error.message === "pdfjs") return "PDFの読み込み機能を取得できませんでした。ネットにつないでからもう一度選んでください。";
  if (error.name === "PasswordException") return "パスワード付きのPDFは読み込めません。ロックを解除したPDFを選んでください。";
  return "このファイルはPDFとして読み込めませんでした。別のファイルを選んでください。";
}

async function importFile(file, onState) {
  if (!file) return;
  if (file.type && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    toast("PDFファイルを選んでください。");
    return;
  }
  onState(true);
  try {
    const pages = await readPages(file);
    const length = pages.reduce((sum, p) => sum + p.items.reduce((n, i) => n + i.str.trim().length, 0), 0);
    if (length < MIN_TEXT_LENGTH) {
      toast("文字のないPDFです。スキャンや画像のPDFは読み取れません。");
      return;
    }
    const parsed = parseLines(pagesToLines(pages));
    const pattern = addPattern(file.name.replace(/\.pdf$/i, ""), parsed);
    if (!parsed.found) toast("段の見出しを見つけられませんでした。文章のまま取り込んだので、確認画面で整えてください。");
    location.hash = `#/review/${pattern.id}`;
  } catch (error) {
    console.error(error);
    toast(failureMessage(error));
  } finally {
    onState(false);
  }
}

// ---------- ライブラリ画面 ----------

function stitchRow(ratio) {
  return h("div", {
    class: "stitches",
    role: "progressbar",
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": Math.round(ratio * 100),
    "aria-label": "進み具合",
    style: `--p:${(ratio * 100).toFixed(2)}%`,
  });
}

const progressRatio = (pattern, steps) => (pattern.done ? 1 : steps.length ? pattern.index / steps.length : 0);

function renderLibrary() {
  const input = h("input", { type: "file", accept: "application/pdf,.pdf", class: "visually-hidden", id: "file" });
  const status = h("p", { class: "drop-status", hidden: true }, "PDFを読み取っています");
  const setBusy = (busy) => {
    status.hidden = !busy;
    drop.classList.toggle("busy", busy);
  };
  input.addEventListener("change", () => {
    importFile(input.files[0], setBusy);
    input.value = "";
  });
  const drop = h(
    "label",
    { class: "drop", htmlFor: "file" },
    input,
    h("span", { class: "drop-title" }, "編み図のPDFを開く"),
    h("span", { class: "drop-sub" }, "ここへドラッグするか、タップして選びます。PDFは端末の中だけで処理します。"),
    status
  );
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    importFile(e.dataTransfer.files[0], setBusy);
  });

  const items = library.map((pattern) => {
    const steps = expandBlocks(pattern.blocks);
    const step = steps[pattern.index];
    return h(
      "li",
      { class: "work" },
      h(
        "a",
        { href: `#/read/${pattern.id}`, class: "work-link" },
        h("span", { class: "work-name" }, pattern.name),
        h("span", { class: "work-meta" }, pattern.done ? "編み上がり" : `${step?.section ? `${step.section}  ` : ""}${step?.label ?? ""}`),
        stitchRow(progressRatio(pattern, steps))
      ),
      h("a", { class: "text-btn", href: `#/review/${pattern.id}` }, "整える"),
      h("button", {
        type: "button",
        class: "text-btn",
        onclick: async () => {
          if (!(await confirmSheet("作品を削除", `「${pattern.name}」と進み具合を削除します。元に戻せません。`, "削除する"))) return;
          library = library.filter((p) => p !== pattern);
          persist();
          render();
        },
      }, "削除")
    );
  });

  app.replaceChildren(
    h(
      "main",
      { class: "page library" },
      h("h1", { class: "wordmark" }, "Roundy"),
      h("p", { class: "lead" }, "英語の編み図を、1段ずつ日本語つきで。"),
      drop,
      items.length ? h("section", {}, h("h2", { class: "list-title" }, "編んでいる作品"), h("ul", { class: "works" }, items)) : null
    )
  );
}

// ---------- 確認画面 ----------

function renderReview(pattern) {
  const update = (blocks) => {
    pattern.blocks = blocks;
    pattern.updatedAt = Date.now();
    persist();
    renderReview(pattern);
  };
  const steps = expandBlocks(pattern.blocks);
  let lastSection = null;
  const rows = [];
  pattern.blocks.forEach((block, i) => {
    if (block.section !== lastSection) {
      lastSection = block.section;
      rows.push(h("h3", { class: "review-section" }, block.section || "はじめ"));
    }
    const area = h("textarea", {
      class: "review-text",
      rows: Math.min(6, Math.ceil(block.text.length / 34) + 1),
      value: block.text,
      "aria-label": `${block.label || "説明"} の本文`,
      onchange: (e) => {
        block.text = e.target.value;
        persist();
      },
    });
    rows.push(
      h(
        "article",
        { class: `review-block ${block.kind}` },
        h("p", { class: "review-label" }, block.label || "説明"),
        block.notes.map((note) => h("p", { class: "review-note" }, note)),
        area,
        h(
          "div",
          { class: "review-actions" },
          h("button", { type: "button", class: "text-btn", disabled: i === 0, onclick: () => update(mergeWithPrevious(pattern.blocks, i)) }, "前とつなげる"),
          h("button", { type: "button", class: "text-btn", onclick: () => update(splitBlock(pattern.blocks, i, area.selectionStart)) }, "カーソル位置で分ける"),
          h("button", { type: "button", class: "text-btn", onclick: () => update(pattern.blocks.filter((b) => b !== block)) }, "削除")
        )
      )
    );
  });

  const nameInput = h("input", {
    class: "name-input",
    value: pattern.name,
    "aria-label": "作品の名前",
    onchange: (e) => {
      pattern.name = e.target.value.trim() || pattern.name;
      persist();
    },
  });

  app.replaceChildren(
    h(
      "main",
      { class: "page review" },
      h("a", { href: "#/", class: "back" }, icon("back"), "作品一覧"),
      h("h1", { class: "review-title" }, "読み取り結果の確認"),
      nameInput,
      h("p", { class: "lead" }, `${steps.length}段に分けました。見出しのずれや、編み図ではない文章があれば直してください。`),
      rows.length ? rows : h("p", {}, "段を読み取れませんでした。"),
      h(
        "div",
        { class: "review-bar" },
        h("a", { class: `btn btn-primary${steps.length ? "" : " disabled"}`, href: `#/read/${pattern.id}` }, "編み始める")
      )
    )
  );
}

// ---------- 読書画面 ----------

async function setWakeLock(on) {
  wantsWakeLock = on;
  if (!on) {
    await wakeLock?.release();
    wakeLock = null;
    return true;
  }
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => (wakeLock = null));
    return true;
  } catch {
    wantsWakeLock = false;
    return false;
  }
}

function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  applySettings();
}

function applySettings() {
  document.documentElement.style.setProperty("--font-scale", settings.fontScale);
  if (settings.theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = settings.theme;
}

function openSettings(pattern, steps, go) {
  const sections = [];
  steps.forEach((step, i) => {
    if (!sections.length || sections.at(-1).name !== step.section) sections.push({ name: step.section, index: i });
  });
  const choice = (key, options) =>
    h(
      "div",
      { class: "segmented", role: "group" },
      options.map(([value, label]) =>
        h("button", {
          type: "button",
          "aria-pressed": String(settings[key] === value),
          onclick: (e) => {
            updateSettings({ [key]: value });
            e.target.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.target)));
            go(pattern.index);
          },
        }, label)
      )
    );
  const fontIndex = () => FONT_STEPS.indexOf(settings.fontScale);
  const stepFont = (delta) => {
    const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, fontIndex() + delta))];
    updateSettings({ fontScale: next });
  };
  openSheet(
    "表示とメニュー",
    h("h3", {}, "文字の大きさ"),
    h("div", { class: "stepper" }, iconButton("minus", "小さくする", () => stepFont(-1)), iconButton("plus", "大きくする", () => stepFont(1))),
    h("h3", {}, "大きく表示する言語"),
    choice("primary", [["ja", "日本語"], ["en", "英語"]]),
    h("h3", {}, "画面の色"),
    choice("theme", [["auto", "端末に合わせる"], ["light", "明るい"], ["dark", "暗い"]]),
    sections.length > 1 && [
      h("h3", {}, "パーツへ移動"),
      h("div", { class: "jump-list" }, sections.map(({ name, index }) =>
        h("button", { type: "button", class: "text-btn", onclick: () => { sheet.close(); go(index); } }, name || "はじめ")
      )),
    ],
    pattern.info.length > 0 && [
      h("h3", {}, "材料と略語"),
      h("div", { class: "info-text" }, pattern.info.map((line) => h("p", {}, line))),
    ],
    h("h3", {}, "編み図の修正"),
    h("a", { class: "text-btn", href: `#/review/${pattern.id}`, onclick: () => sheet.close() }, "読み取り結果を整える")
  );
}

function renderReader(pattern) {
  const steps = expandBlocks(pattern.blocks);
  if (!steps.length) {
    location.hash = `#/review/${pattern.id}`;
    return;
  }
  pattern.index = Math.min(pattern.index, steps.length - 1);

  const go = (index) => {
    pattern.done = false;
    pattern.index = Math.max(0, Math.min(steps.length - 1, index));
    pattern.updatedAt = Date.now();
    persist();
    draw();
  };
  const finish = () => {
    pattern.done = true;
    pattern.updatedAt = Date.now();
    persist();
    draw();
  };
  const forward = () => (pattern.index === steps.length - 1 ? finish() : go(pattern.index + 1));
  const back = () => (pattern.done ? go(pattern.index) : go(pattern.index - 1));

  const copy = async (step) => {
    const text = `${step.label}: ${step.text}\n${translatePattern(step.text)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("コピーしました");
    } catch {
      toast("コピーできませんでした");
    }
  };

  const tally = (step) => {
    const key = `${pattern.index}`;
    const value = pattern.tally[key] ?? 0;
    const change = (delta) => {
      pattern.tally[key] = Math.max(0, value + delta);
      persist();
      draw();
    };
    return h(
      "div",
      { class: "tally" },
      h("span", { class: "tally-label" }, "回数"),
      iconButton("minus", "回数を減らす", () => change(-1), { disabled: value === 0 }),
      h("output", { class: "tally-value" }, value),
      iconButton("plus", "回数を増やす", () => change(1))
    );
  };

  const wakeButton = () => {
    const button = iconButton("sun", "画面を消さない", async () => {
      const on = !wantsWakeLock;
      if (!(await setWakeLock(on))) toast("画面をつけたままにできませんでした");
      else toast(on ? "画面をつけたままにします" : "画面の自動消灯を元に戻しました");
      button.setAttribute("aria-pressed", String(wantsWakeLock));
    }, { "aria-pressed": String(wantsWakeLock) });
    return "wakeLock" in navigator ? button : null;
  };

  const draw = () => {
    const step = steps[pattern.index];
    const nextStep = steps[pattern.index + 1];
    const isLast = pattern.index === steps.length - 1;
    const ja = translatePattern(step.text);
    const primaryJa = settings.primary === "ja";
    const showBoth = ja !== step.text;
    const numberParts = step.number === null ? null : `${step.number}`;

    const body = pattern.done
      ? h(
          "section",
          { class: "finished" },
          h("h1", {}, "編み上がり"),
          h("p", {}, `${pattern.name}を最後まで編みました。`),
          h("a", { class: "btn", href: "#/" }, "作品一覧へ")
        )
      : h(
          "section",
          { class: "round", "aria-live": "polite" },
          h(
            "div",
            { class: "round-head" },
            h("div", { class: "round-number" }, numberParts ?? ""),
            h(
              "div",
              { class: "round-caption" },
              h("p", { class: "round-label" }, step.number === null ? step.label || "説明" : labelToJapanese(step)),
              h("p", { class: "round-source" }, [step.number === null ? null : step.label, step.range ? `${step.range.label} の ${step.range.index}回目` : null].filter(Boolean).join("、"))
            ),
            step.count !== null && h("p", { class: "round-count" }, h("strong", {}, step.count), "目")
          ),
          step.notes.map((note) => h("p", { class: "note" }, translatePattern(note))),
          h(
            "div",
            { class: "pattern-text" },
            h("p", { class: "primary", lang: primaryJa ? "ja" : "en" }, h("mark", {}, primaryJa ? ja : step.text)),
            showBoth && h("p", { class: "secondary", lang: primaryJa ? "en" : "ja" }, primaryJa ? step.text : ja)
          ),
          h("div", { class: "round-tools" }, tally(step), iconButton("copy", "この段をコピー", () => copy(step)), wakeButton()),
          nextStep &&
            h(
              "aside",
              { class: "upcoming" },
              h("p", { class: "upcoming-label" }, `次は ${nextStep.section !== step.section ? `${nextStep.section} ` : ""}${labelToJapanese(nextStep) || "説明"}`),
              h("p", { class: "upcoming-text" }, translatePattern(nextStep.text))
            )
        );

    app.replaceChildren(
      h(
        "div",
        { class: "reader" },
        h(
          "header",
          { class: "reader-top" },
          h("a", { href: "#/", class: "icon-btn", "aria-label": "作品一覧へ戻る", title: "作品一覧" }, icon("back")),
          h("p", { class: "reader-title" }, step.section || pattern.name),
          h("p", { class: "reader-position" }, `${pattern.index + 1} / ${steps.length}`),
          iconButton("menu", "表示とメニュー", () => openSettings(pattern, steps, go))
        ),
        stitchRow(progressRatio(pattern, steps) + (pattern.done ? 0 : 1 / steps.length)),
        h("main", { class: "reader-body" }, body),
        h(
          "nav",
          { class: "reader-nav", "aria-label": "段の移動" },
          h("button", { type: "button", class: "btn nav-back", disabled: pattern.index === 0 && !pattern.done, onclick: back }, icon("prev"), "戻る"),
          !pattern.done && h("button", { type: "button", class: "btn btn-primary nav-forward", onclick: forward }, isLast ? [icon("check"), "編み上がり"] : ["次の段", icon("next")])
        )
      )
    );
  };

  const onKey = (event) => {
    if (sheet.open) return;
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      if (!pattern.done) forward();
    } else if (event.key === "ArrowLeft") {
      back();
    }
  };

  let touch = null;
  const onTouchStart = (e) => {
    touch = e.target.closest("button, a, textarea") ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && !pattern.done) forward();
    if (dx > 0) back();
  };

  document.addEventListener("keydown", onKey);
  app.addEventListener("touchstart", onTouchStart, { passive: true });
  app.addEventListener("touchend", onTouchEnd);
  cleanupScreen = () => {
    document.removeEventListener("keydown", onKey);
    app.removeEventListener("touchstart", onTouchStart);
    app.removeEventListener("touchend", onTouchEnd);
    setWakeLock(false);
  };
  draw();
}

// ---------- 画面の切り替え ----------

function render() {
  cleanupScreen();
  cleanupScreen = () => {};
  const [, screen, id] = location.hash.split("/");
  const pattern = id ? findPattern(id) : null;
  if (screen === "read" && pattern) renderReader(pattern);
  else if (screen === "review" && pattern) renderReview(pattern);
  else renderLibrary();
  window.scrollTo(0, 0);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wantsWakeLock && !wakeLock) setWakeLock(true);
});

window.addEventListener("hashchange", render);
applySettings();
migrateLegacy();
render();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
