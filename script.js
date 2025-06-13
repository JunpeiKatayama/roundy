// グローバル変数
let patternBlocks = [];
let currentBlockIndex = 0;
const STORAGE_KEY = "patternReaderState";

// スリープ防止関連の変数
let wakeLock = null;
let noSleep = null;
let isWakeLockActive = false;

// 英語→日本語編み方対応表（かぎ針編み＋棒針編み）
const STITCH_TRANSLATIONS = {
  // === かぎ針編み（Crochet） ===
  // 基本的な編み方
  sc: "細編み",
  "single crochet": "細編み",
  hdc: "中長編み",
  "half double crochet": "中長編み",
  dc: "長編み",
  "double crochet": "長編み",
  tr: "長々編み",
  "treble crochet": "長々編み",
  dtr: "3つ巻き長編み",
  "double treble crochet": "3つ巻き長編み",

  // チェーンとスリップステッチ
  ch: "鎖編み",
  chain: "鎖編み",
  "sl st": "引き抜き編み",
  "slip stitch": "引き抜き編み",
  ss: "引き抜き編み",

  // かぎ針の増し目・減らし目
  sc2tog: "細編み2目一度",
  dc2tog: "長編み2目一度",
  hdc2tog: "中長編み2目一度",
  tr2tog: "長々編み2目一度",

  // 特殊な編み方
  fpdc: "表引き上げ長編み",
  "front post double crochet": "表引き上げ長編み",
  bpdc: "裏引き上げ長編み",
  "back post double crochet": "裏引き上げ長編み",
  fptr: "表引き上げ長々編み",
  "front post treble crochet": "表引き上げ長々編み",
  bptr: "裏引き上げ長々編み",
  "back post treble crochet": "裏引き上げ長々編み",

  // シェル・クラスター
  shell: "シェル編み",
  cluster: "クラスター編み",
  picot: "ピコット",
  popcorn: "ポップコーン編み",
  bobble: "ボッブル編み",

  // === 棒針編み（Knitting） ===
  // 基本的な編み方
  k: "表目",
  knit: "表目",
  p: "裏目",
  purl: "裏目",
  "k tbl": "表目のねじり編み",
  "knit through back loop": "表目のねじり編み",
  "p tbl": "裏目のねじり編み",
  "purl through back loop": "裏目のねじり編み",

  // 棒針の減らし目
  k2tog: "右上2目一度",
  "knit 2 together": "右上2目一度",
  p2tog: "裏目で2目一度",
  "purl 2 together": "裏目で2目一度",
  ssk: "左上2目一度",
  "slip, slip, knit": "左上2目一度",
  ssp: "裏側で左上2目一度",
  "slip, slip, purl": "裏側で左上2目一度",
  cdd: "中央の2目一度",
  "centered double decrease": "中央の2目一度",

  // 棒針の増し目
  m1: "増し目",
  "make one": "増し目",
  m1l: "左上の増し目",
  "make one left": "左上の増し目",
  m1r: "右上の増し目",
  "make one right": "右上の増し目",
  kfb: "表目の前後で編む増し目",
  "knit front and back": "表目の前後で編む増し目",
  pfb: "裏目の前後で編む増し目",
  "purl front and back": "裏目の前後で編む増し目",

  // 棒針の特殊技法
  sl: "すべり目",
  slip: "すべり目",
  psso: "すべり目をかぶせる",
  "pass slipped stitch over": "すべり目をかぶせる",
  skp: "すべり目・表目・かぶせ目",
  "slip, knit, pass over": "すべり目・表目・かぶせ目",
  tbl: "ねじり目",
  "through back loop": "ねじり目",
  ds: "DS（ダブルステッチ）",
  "double stitch": "DS（ダブルステッチ）",

  // 作り目・伏せ止め
  co: "作り目",
  "cast on": "作り目",
  bo: "伏せ止め",
  "bind off": "伏せ止め",
  ltco: "長い尾の作り目",
  "long-tail cast on": "長い尾の作り目",
  "estonian co": "エストニア式作り目",
  "estonian cast on": "エストニア式作り目",
  "provisional co": "仮の作り目",
  "provisional cast on": "仮の作り目",

  // 編み方・模様
  "garter st": "ガーター編み",
  "garter stitch": "ガーター編み",
  stockinette: "メリヤス編み",
  "stockinette stitch": "メリヤス編み",
  "seed stitch": "鹿の子編み",
  ribbing: "ゴム編み",
  cable: "交差編み・縄編み",
  "drop st": "落とし目",
  "drop stitch": "落とし目",

  // 方向・状態
  rs: "表側",
  "right side": "表側",
  ws: "裏側",
  "wrong side": "裏側",
  "work even": "増減なしで編む",
  cont: "続けて編む",
  continue: "続けて編む",
  patt: "模様・模様通りに編む",
  pattern: "模様・模様通りに編む",

  // マーカー
  pm: "マーカーを置く",
  "place marker": "マーカーを置く",
  sm: "マーカーを移動させる",
  "slip marker": "マーカーを移動させる",
  slm: "マーカーを滑らせる",
  rm: "マーカーを外す",
  "remove marker": "マーカーを外す",

  // === 共通用語 ===
  // 増し目・減らし目（共通）
  inc: "増し目",
  increase: "増し目",
  dec: "減らし目",
  decrease: "減らし目",

  // 方向・場所（共通）
  rnd: "ラウンド",
  round: "ラウンド",
  row: "段",
  st: "目",
  stitch: "目",
  sts: "目",
  stitches: "目",
  sp: "間",
  space: "間",
  "ch-sp": "鎖の間",
  "ch sp": "鎖の間",
  blo: "裏山のみ",
  "back loop only": "裏山のみ",
  flo: "表山のみ",
  "front loop only": "表山のみ",

  // 繰り返し・その他（共通）
  rep: "繰り返し",
  repeat: "繰り返し",
  around: "周りに",
  join: "つなぐ",
  turn: "返す",
  "fasten off": "糸を切る",
  "finish off": "糸を切る",
  yo: "かけ目",
  "yarn over": "かけ目",
  sk: "飛ばす",
  skip: "飛ばす",
  next: "次の",
  prev: "前の",
  previous: "前の",
  rem: "残り",
  remaining: "残り",
  beg: "始まり・最初",
  beginning: "始まり・最初",
  bor: "段の始まり（BOR）",
  "beginning of round": "段の始まり（BOR）",
  end: "終わり・最後",
  total: "合計",
  tog: "一度",
  together: "一度",

  // 数量
  times: "回",
  x: "×",

  // 括弧・記号の説明
  "()": "（）内を繰り返す",
  "[]": "［］内を繰り返す",
  "{}": "｛｝内を繰り返す",
  "*": "※印まで繰り返す",
  "**": "※※印まで繰り返す",
};

// パターンテキストを日本語に翻訳
function translatePatternToJapanese(englishText) {
  let translatedText = englishText;

  // 先に特定の大文字パターンを処理（K1, P1, K2tog等）
  // 棒針編みの特殊パターン（数字付きの複合パターンを先に処理）
  translatedText = translatedText.replace(/\bK(\d+)tog\b/gi, "右上$1目一度");
  translatedText = translatedText.replace(/\bP(\d+)tog\b/gi, "裏目で$1目一度");
  translatedText = translatedText.replace(/\bSSK\b/gi, "左上2目一度");
  translatedText = translatedText.replace(/\bSSP\b/gi, "裏側で左上2目一度");
  translatedText = translatedText.replace(/\bM(\d+)L\b/gi, "左上の増し目$1");
  translatedText = translatedText.replace(/\bM(\d+)R\b/gi, "右上の増し目$1");
  translatedText = translatedText.replace(/\bM(\d+)\b/gi, "増し目$1");

  // 棒針編みの基本パターン（単独の文字+数字）
  translatedText = translatedText.replace(/\bK(\d+)\b/gi, "表目$1");
  translatedText = translatedText.replace(/\bP(\d+)\b/gi, "裏目$1");

  // 単独の大文字も確実に翻訳
  translatedText = translatedText.replace(/\bK\b/gi, "表目");
  translatedText = translatedText.replace(/\bP\b/gi, "裏目");

  // 対応表を使って置換
  Object.entries(STITCH_TRANSLATIONS).forEach(([english, japanese]) => {
    // 大文字小文字を区別しない正規表現で置換
    // 単語境界を考慮して、部分的な置換を避ける
    const regex = new RegExp(
      `\\b${english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi"
    );
    translatedText = translatedText.replace(regex, japanese);
  });

  // 数字 + 編み方のパターンを調整（かぎ針編み）
  translatedText = translatedText.replace(/(\d+)\s*細編み/g, "細編み$1目");
  translatedText = translatedText.replace(/(\d+)\s*長編み/g, "長編み$1目");
  translatedText = translatedText.replace(/(\d+)\s*中長編み/g, "中長編み$1目");
  translatedText = translatedText.replace(/(\d+)\s*長々編み/g, "長々編み$1目");
  translatedText = translatedText.replace(/(\d+)\s*鎖編み/g, "鎖編み$1目");

  // 数字 + 編み方のパターンを調整（棒針編み）
  translatedText = translatedText.replace(/(\d+)\s*表目/g, "表目$1目");
  translatedText = translatedText.replace(/(\d+)\s*裏目/g, "裏目$1目");
  translatedText = translatedText.replace(/(\d+)\s*増し目/g, "増し目$1回");
  translatedText = translatedText.replace(/(\d+)\s*作り目/g, "作り目$1目");

  // 棒針編み特有のパターン調整
  translatedText = translatedText.replace(/表目(\d+)目目/g, "表目$1目"); // 重複を避ける
  translatedText = translatedText.replace(/裏目(\d+)目目/g, "裏目$1目"); // 重複を避ける

  // K3, P2 などの連続パターンを調整
  translatedText = translatedText.replace(
    /表目(\d+)目,\s*裏目(\d+)目/g,
    "表目$1目、裏目$2目"
  );
  translatedText = translatedText.replace(
    /表目(\d+)目\s*裏目(\d+)目/g,
    "表目$1目裏目$2目"
  );

  // ケーブル編みパターンの調整
  translatedText = translatedText.replace(/C(\d+)B/g, "$1目交差・後ろ交差");
  translatedText = translatedText.replace(/C(\d+)F/g, "$1目交差・前交差");
  translatedText = translatedText.replace(/T(\d+)B/g, "$1目ねじり・後ろ");
  translatedText = translatedText.replace(/T(\d+)F/g, "$1目ねじり・前");

  // ゴム編みパターンの調整
  translatedText = translatedText.replace(
    /\b表目(\d+)\s*裏目(\d+)\b/gi,
    "表目$1目裏目$2目のゴム編み"
  );
  translatedText = translatedText.replace(
    /\b裏目(\d+)\s*表目(\d+)\b/gi,
    "裏目$1目表目$2目のゴム編み"
  );

  // まだ翻訳されていない大文字パターン（K1P1など）
  translatedText = translatedText.replace(
    /\bK(\d+)P(\d+)\b/gi,
    "表目$1目裏目$2目のゴム編み"
  );
  translatedText = translatedText.replace(
    /\bP(\d+)K(\d+)\b/gi,
    "裏目$1目表目$2目のゴム編み"
  );

  // 繰り返し記号の調整
  translatedText = translatedText.replace(/\*(\d+)/g, "※$1回繰り返し");
  translatedText = translatedText.replace(/rep from \*/gi, "※印から繰り返し");

  // DS関連の特殊パターン
  translatedText = translatedText.replace(
    /(\d+)\s*st\s*after\s*DS/gi,
    "DSの$1目後"
  );
  translatedText = translatedText.replace(
    /(\d+)\s*sts?\s*after\s*DS/gi,
    "DSの$1目後"
  );

  // 括弧内の数字を調整
  translatedText = translatedText.replace(/\((\d+)\)/g, "（$1目）");

  return translatedText;
}

// PDF.js の設定
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// DOM要素の取得
const pdfInput = document.getElementById("pdfInput");
const uploadSection = document.getElementById("uploadSection");
const patternSection = document.getElementById("patternSection");
const loading = document.getElementById("loading");
const patternBlock = document.getElementById("patternBlock");
const currentIndex = document.getElementById("currentIndex");
const totalBlocks = document.getElementById("totalBlocks");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");
const progressFill = document.getElementById("progressFill");
const progressPercentage = document.getElementById("progressPercentage");
const copyBtn = document.getElementById("copyBtn");

// イベントリスナーの設定
document.addEventListener("DOMContentLoaded", () => {
  // 保存された状態を読み込み
  loadSavedState();

  // ファイル選択のイベントリスナー
  pdfInput.addEventListener("change", handlePDFUpload);

  // ナビゲーションボタンのイベントリスナー
  prevBtn.addEventListener("click", showPreviousBlock);
  nextBtn.addEventListener("click", showNextBlock);
  resetBtn.addEventListener("click", resetToFirstBlock);

  // コピーボタンのイベントリスナー
  copyBtn.addEventListener("click", copyToClipboard);

  // Wake Lockボタンのイベントリスナー
  const wakeLockBtn = document.getElementById("wakeLockBtn");
  wakeLockBtn.addEventListener("click", toggleWakeLock);
});

// PDFアップロード処理
async function handlePDFUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    showLoading(true);

    // PDFファイルを読み込み
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    // 全ページのテキストを抽出
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    // パターンブロックに分割
    patternBlocks = parsePatternBlocks(fullText);

    if (patternBlocks.length === 0) {
      alert(
        "編み図のパターンが見つかりませんでした。\n\n" +
          "Round、Rnd、Row などの表記があるPDFをアップロードしてください。"
      );
      showLoading(false);
      return;
    }

    // UI を切り替え
    currentBlockIndex = 0;
    showPatternSection();
    updateDisplay();
    saveState();
  } catch (error) {
    console.error("PDF処理エラー:", error);
    alert(
      "PDFの処理中にエラーが発生しました。\n別のファイルを試してください。"
    );
    showLoading(false);
  }
}

// パターンブロックの解析
function parsePatternBlocks(text) {
  // 文中の "Rnd XXX:" パターンで強制的に分割
  // これにより、一行に複数のRoundが含まれている場合も正しく分割される
  let processedText = text;

  // 様々なパターンで分割
  const splitPatterns = [
    /(\.\s+Rnd\s+\d+\s*:)/g, // . Rnd 109: (ピリオドの後)
    /(\.\s+Round\s+\d+\s*:)/g, // . Round 109: (ピリオドの後)
    /(\.\s+Row\s+\d+\s*:)/g, // . Row 109: (ピリオドの後)
    /(Rnd\s+\d+\s*:)/g, // Rnd 109:
    /(Round\s+\d+\s*:)/g, // Round 109:
    /(Row\s+\d+\s*:)/g, // Row 109:
    /(R\s+\d+\s*:)/g, // R 109:
    /(RND\s+\d+\s*:)/g, // RND 109: (大文字)
    /(ROUND\s+\d+\s*:)/g, // ROUND 109: (大文字)
    /(ROW\s+\d+\s*:)/g, // ROW 109: (大文字)
  ];

  // 各パターンで順次分割処理
  splitPatterns.forEach((pattern) => {
    processedText = processedText.replace(pattern, "\n$1");
  });

  // 行に分割
  const lines = processedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const blocks = [];
  let currentBlock = [];

  // Round, Rnd, R, Row + 数字で始まる行を検出する正規表現
  // より柔軟なマッチングのため、複数のパターンを試行
  const patternRegexes = [
    /^(Round|Rnd|R|Row)\s*\d+/i, // 基本パターン: Round 1
    /^(Round|Rnd|R|Row)\s*[\d]+/i, // 数字部分を明示
    /(Round|Rnd|R|Row)\s*\d+/i, // 行頭でなくてもOK
    /^\d+\.\s*(Round|Rnd|R|Row)/i, // 番号.Round形式: 1. Round
    /^Round\s+\d+|^Rnd\s+\d+|^Row\s+\d+|^R\s+\d+/i, // 個別指定
    /^\d+\s*[-:]\s*(Round|Rnd|R|Row)/i, // 1 - Round, 1: Round
    /^(Round|Rnd|R|Row)[\s:-]*\d+/i, // Round:1, Round-1
    /^\s*\d+\s*\.\s*(Round|Rnd|R|Row)/i, // スペースがある場合
    /^(ROUND|RND|ROW)\s*\d+/i, // 大文字のみ
    /^第?\d+?(ラウンド|段|周)/, // 日本語パターン
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // パターンの開始行かチェック（複数の正規表現を試行）
    let isPatternMatch = false;
    let matchedPatternIndex = -1;

    for (let j = 0; j < patternRegexes.length; j++) {
      if (patternRegexes[j].test(line)) {
        isPatternMatch = true;
        matchedPatternIndex = j;
        break;
      }
    }

    if (isPatternMatch) {
      // 前のブロックが存在する場合は保存
      if (currentBlock.length > 0) {
        blocks.push({
          title: currentBlock[0],
          content: currentBlock.join("\n"),
          number: blocks.length + 1,
        });
      }

      // 新しいブロックを開始
      currentBlock = [line];
    } else if (currentBlock.length > 0) {
      // 現在のブロックに行を追加
      currentBlock.push(line);
    }
  }

  // 最後のブロックを追加
  if (currentBlock.length > 0) {
    blocks.push({
      title: currentBlock[0],
      content: currentBlock.join("\n"),
      number: blocks.length + 1,
    });
  }

  return blocks;
}

// ローディング表示の制御
function showLoading(show) {
  loading.style.display = show ? "block" : "none";
  if (!show) {
    pdfInput.value = ""; // ファイル選択をクリア
  }
}

// パターンセクションの表示
function showPatternSection() {
  uploadSection.style.display = "none";
  patternSection.style.display = "block";
  showLoading(false);
}

// アップロードセクションの表示
function showUploadSection() {
  uploadSection.style.display = "block";
  patternSection.style.display = "none";
  showLoading(false);
}

// 表示の更新
function updateDisplay() {
  if (patternBlocks.length === 0) return;

  // 現在のブロックを表示
  const block = patternBlocks[currentBlockIndex];

  // 英語のパターンを表示
  const englishPattern = document.getElementById("englishPattern");
  const japanesePattern = document.getElementById("japanesePattern");

  if (englishPattern && japanesePattern) {
    englishPattern.textContent = block.content;
    // 日本語翻訳を表示
    japanesePattern.textContent = translatePatternToJapanese(block.content);

    // 親要素のpatternBlockに翻訳クラスを追加
    const patternBlockElement = englishPattern.parentElement;
    if (patternBlockElement) {
      patternBlockElement.classList.add("has-translation");
      // 直接のテキストコンテンツをクリア
      patternBlockElement.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = "";
        }
      });
    }
  } else {
    // 新しい要素が見つからない場合は古い要素を使用
    patternBlock.classList.remove("has-translation");
    patternBlock.textContent = block.content;
  }

  // インデックス表示を更新
  currentIndex.textContent = currentBlockIndex + 1;
  totalBlocks.textContent = patternBlocks.length;

  // プログレスバーを更新
  const progress = ((currentBlockIndex + 1) / patternBlocks.length) * 100;
  progressFill.style.width = `${progress}%`;
  progressPercentage.textContent = `${Math.round(progress)}%`;

  // ボタンの状態を更新
  prevBtn.disabled = currentBlockIndex === 0;
  nextBtn.disabled = currentBlockIndex === patternBlocks.length - 1;

  // 次のボタンのテキストを更新
  if (currentBlockIndex === patternBlocks.length - 1) {
    nextBtn.textContent = "完了 ✓";
  } else {
    nextBtn.textContent = "次へ →";
  }
}

// 前のブロックを表示
function showPreviousBlock() {
  if (currentBlockIndex > 0) {
    currentBlockIndex--;
    updateDisplay();
    saveState();
  }
}

// 次のブロックを表示
function showNextBlock() {
  if (currentBlockIndex < patternBlocks.length - 1) {
    currentBlockIndex++;
    updateDisplay();
    saveState();
  }
}

// 最初のブロックにリセット
function resetToFirstBlock() {
  if (confirm("最初のラウンドに戻りますか？")) {
    currentBlockIndex = 0;
    updateDisplay();
    saveState();
  }
}

// アプリをリセット（新しいファイルアップロード用）
function resetApp() {
  if (
    confirm("新しいPDFをアップロードしますか？\n現在の進行状況は失われます。")
  ) {
    patternBlocks = [];
    currentBlockIndex = 0;
    clearSavedState();
    showUploadSection();
  }
}

// 状態の保存
function saveState() {
  if (patternBlocks.length > 0) {
    const state = {
      currentBlockIndex: currentBlockIndex,
      totalBlocks: patternBlocks.length,
      patternBlocks: patternBlocks, // PDFデータも保存
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log("進捗を保存しました:", state);
  }
}

// ローカルストレージの状態を確認する関数（デバッグ用）
function checkLocalStorageState() {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      console.log("現在のローカルストレージの状態:", state);

      const hasPatternData = state.patternBlocks ? "あり" : "なし";
      const dataSize = savedState.length;

      alert(
        `ローカルストレージの状態:\n` +
          `進捗: ${state.currentBlockIndex + 1} / ${state.totalBlocks}\n` +
          `パターンデータ: ${hasPatternData}\n` +
          `データサイズ: ${Math.round(dataSize / 1024)}KB\n` +
          `最終更新: ${new Date(state.lastUpdated).toLocaleString()}`
      );
    } else {
      console.log("ローカルストレージに保存されたデータはありません");
      alert("ローカルストレージに保存された進捗データはありません");
    }
  } catch (error) {
    console.error("ローカルストレージの確認エラー:", error);
    alert("ローカルストレージの確認中にエラーが発生しました");
  }
}

// グローバルスコープでアクセス可能にする（開発者ツールから使用可能）
window.checkLocalStorageState = checkLocalStorageState;

// 保存された状態の読み込み
function loadSavedState() {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);

      // 保存された状態があることを表示
      if (state.currentBlockIndex !== undefined && state.totalBlocks > 0) {
        // パターンデータがない場合（旧バージョンのデータ）
        if (!state.patternBlocks) {
          console.log(
            "旧形式のデータが見つかりました。PDFを再アップロードしてください。"
          );
          alert(
            `前回の進捗が見つかりましたが、データ形式が古いため\n` +
              `PDFを再アップロードしてください。\n\n` +
              `進捗: ${state.currentBlockIndex + 1} / ${state.totalBlocks}`
          );
          clearSavedState();
          return;
        }
        // 復元確認ダイアログを表示
        const shouldRestore = confirm(
          `前回の続きから始めますか？\n` +
            `進捗: ${state.currentBlockIndex + 1} / ${state.totalBlocks}\n` +
            `最終更新: ${new Date(state.lastUpdated).toLocaleString()}`
        );

        if (shouldRestore) {
          // 直接状態を復元
          patternBlocks = state.patternBlocks;
          currentBlockIndex = state.currentBlockIndex;

          // UIを更新
          showPatternSection();
          updateDisplay();

          console.log("前回の進捗を復元しました:", state);
        } else {
          // 復元しない場合は保存データをクリア
          clearSavedState();
        }
      }
    }
  } catch (error) {
    console.error("保存された状態の読み込みエラー:", error);
    clearSavedState();
  }
}

// 保存された状態のクリア
function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

// クリップボードにコピー
async function copyToClipboard() {
  if (patternBlocks.length === 0) return;

  const currentBlock = patternBlocks[currentBlockIndex];
  const englishText = currentBlock.content;
  const japaneseText = translatePatternToJapanese(englishText);

  // 英語と日本語の両方をコピー
  const textToCopy = `【英語】\n${englishText}\n\n【日本語】\n${japaneseText}`;

  try {
    // Clipboard API を使用してコピー
    await navigator.clipboard.writeText(textToCopy);

    // コピー成功のフィードバック
    showCopyFeedback();
  } catch (error) {
    // フォールバック: 古いブラウザ対応
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      showCopyFeedback();
    } catch (fallbackError) {
      console.error("コピーに失敗しました:", fallbackError);
      alert(
        "コピーに失敗しました。手動でテキストを選択してコピーしてください。"
      );
    }

    document.body.removeChild(textArea);
  }
}

// コピー成功のフィードバック表示
function showCopyFeedback() {
  const copyBtn = document.getElementById("copyBtn");
  const originalText = copyBtn.innerHTML;
  copyBtn.innerHTML = '<i class="fas fa-check"></i>';
  copyBtn.classList.add("copied");

  setTimeout(() => {
    copyBtn.innerHTML = originalText;
    copyBtn.classList.remove("copied");
  }, 2000);
}

// キーボードショートカット（オプション）
document.addEventListener("keydown", (event) => {
  if (patternSection.style.display === "block") {
    switch (event.key) {
      case "ArrowLeft":
        if (!prevBtn.disabled) showPreviousBlock();
        break;
      case "ArrowRight":
        if (!nextBtn.disabled) showNextBlock();
        break;
      case "Home":
        resetToFirstBlock();
        break;
    }
  }
});

// タッチスワイプサポート（スマホ用）
let touchStartX = null;
let touchStartY = null;

// パターンセクション全体でスワイプを判定
patternSection.addEventListener("touchstart", (event) => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
});

patternSection.addEventListener(
  "touchmove",
  (event) => {
    if (touchStartX === null || touchStartY === null) {
      return;
    }

    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const deltaX = Math.abs(currentX - touchStartX);
    const deltaY = Math.abs(currentY - touchStartY);

    // 水平方向の動きが垂直方向より大きい場合、デフォルトのスクロールをキャンセル
    if (deltaX > deltaY) {
      event.preventDefault();
    }
  },
  { passive: false } // preventDefault() を呼び出すために必要
);

patternSection.addEventListener("touchend", (event) => {
  if (touchStartX === null || touchStartY === null) return;

  const touchEndX = event.changedTouches[0].clientX;
  const touchEndY = event.changedTouches[0].clientY;

  const deltaX = touchStartX - touchEndX;
  const deltaY = touchStartY - touchEndY;

  // 水平スワイプの判定（縦スワイプより大きい場合）
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      // 左スワイプ → 次へ
      if (!nextBtn.disabled) showNextBlock();
    } else {
      // 右スワイプ → 前へ
      if (!prevBtn.disabled) showPreviousBlock();
    }
  }

  touchStartX = null;
  touchStartY = null;
});

// PWA対応（オプション）
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // サービスワーカーは今回は実装しないが、将来的に追加可能
  });
}

// === スリープ防止機能 ===

// NoSleep.jsを初期化する関数
function initNoSleep() {
  if (typeof NoSleep !== "undefined" && !noSleep) {
    noSleep = new NoSleep();
  }
}

// スリープ防止を開始する関数
async function requestWakeLock() {
  try {
    // NoSleep.jsを優先して使用（iOS対応）
    if (typeof NoSleep !== "undefined") {
      if (!noSleep) {
        noSleep = new NoSleep();
      }

      await noSleep.enable();
      isWakeLockActive = true;
      updateWakeLockButton();
      console.log("スリープ防止を開始しました（NoSleep.js）");
      return;
    }

    // フォールバック: Wake Lock API（Android Chrome等）
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      isWakeLockActive = true;
      updateWakeLockButton();
      console.log("スリープ防止を開始しました（Wake Lock API）");

      // Wake Lockが解放された時のイベントリスナー
      wakeLock.addEventListener("release", () => {
        isWakeLockActive = false;
        updateWakeLockButton();
        console.log("スリープ防止が解除されました");
      });
    } else {
      alert("このブラウザではスリープ防止機能がサポートされていません");
    }
  } catch (err) {
    console.error("スリープ防止取得エラー:", err);
    alert("スリープ防止機能の開始に失敗しました");
  }
}

// スリープ防止を解放する関数
async function releaseWakeLock() {
  if (noSleep && isWakeLockActive) {
    await noSleep.disable();
    isWakeLockActive = false;
    updateWakeLockButton();
    console.log("スリープ防止を停止しました（NoSleep.js）");
    return;
  }

  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
    isWakeLockActive = false;
    updateWakeLockButton();
    console.log("スリープ防止を停止しました（Wake Lock API）");
  }
}

// Wake Lockボタンの表示を更新する関数
function updateWakeLockButton() {
  const wakeLockBtn = document.getElementById("wakeLockBtn");
  if (isWakeLockActive) {
    wakeLockBtn.classList.add("active");
    wakeLockBtn.innerHTML = '<i class="fas fa-sun"></i>';
    wakeLockBtn.title = "スリープ防止ON（クリックでOFF）";
  } else {
    wakeLockBtn.classList.remove("active");
    wakeLockBtn.innerHTML = '<i class="fas fa-moon"></i>';
    wakeLockBtn.title = "スリープ防止OFF（クリックでON）";
  }
}

// Wake Lockボタンクリック時の処理
async function toggleWakeLock() {
  if (isWakeLockActive) {
    await releaseWakeLock();
  } else {
    await requestWakeLock();
  }
}

// ページの可視性が変わった時の処理（バックグラウンドからフォアグラウンドに戻った時）
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    // ページが再表示された時、Wake Lockが自動解放されるので再取得
    if (isWakeLockActive && wakeLock !== null) {
      await requestWakeLock();
    }
  }
});

// NoSleep.js初期化（ページ読み込み時）
document.addEventListener("DOMContentLoaded", () => {
  initNoSleep();
});
