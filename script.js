// グローバル変数
let patternBlocks = [];
let currentBlockIndex = 0;
const STORAGE_KEY = "patternReaderState";

// スリープ防止関連の変数
let wakeLock = null;
let noSleep = null;
let isWakeLockActive = false;

// ヘルプ機能関連の変数
let isHelpModalVisible = false;

// 翻訳辞書を取得（外部ファイルまたはフォールバック）
const STITCH_TRANSLATIONS = window.KNITTING_DICTIONARY || {
  // フォールバック辞書（外部ファイルが読み込めない場合用）
  // 基本的な用語のみ
  k: "表編み",
  knit: "表編み",
  p: "裏編み",
  purl: "裏編み",
  sc: "細編み",
  dc: "長編み",
  ch: "鎖編み",
  "sl st": "引き抜き編み",
  sl: "すべり目", // 棒針編みの場合
  slip: "すべり目", // 棒針編みの場合
  bo: "伏せ目",
  "bind off": "伏せ目",
  yo: "掛け目",
  "yarn over": "掛け目",
  inc: "増し目",
  dec: "減らし目",
  rnd: "ラウンド",
  round: "ラウンド",
  row: "段",
  st: "目",
  sts: "目",
};

// パターンテキストを日本語に翻訳
function translatePatternToJapanese(englishText) {
  let translatedText = englishText;

  // 先に特定の大文字パターンを処理（K1, P1, K2tog等）
  // 棒針編みの特殊パターン（数字付きの複合パターンを先に処理）
  translatedText = translatedText.replace(/\bK(\d+)tog\b/gi, "左上$1目一度");
  translatedText = translatedText.replace(
    /\bP(\d+)tog\b/gi,
    "裏編みで左上$1目一度"
  );
  translatedText = translatedText.replace(/\bSSK\b/gi, "右上2目一度");
  translatedText = translatedText.replace(/\bSSP\b/gi, "裏側で右上2目一度");
  translatedText = translatedText.replace(/\bM(\d+)L\b/gi, "左上の増し目$1");
  translatedText = translatedText.replace(/\bM(\d+)R\b/gi, "右上の増し目$1");
  translatedText = translatedText.replace(/\bM(\d+)\b/gi, "増し目$1");

  // 棒針編みの基本パターン（単独の文字+数字）
  translatedText = translatedText.replace(/\bK(\d+)\b/gi, "表編み$1");
  translatedText = translatedText.replace(/\bP(\d+)\b/gi, "裏編み$1");

  // 単独の大文字も確実に翻訳
  translatedText = translatedText.replace(/\bK\b/gi, "表編み");
  translatedText = translatedText.replace(/\bP\b/gi, "裏編み");

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
  translatedText = translatedText.replace(/(\d+)\s*表編み/g, "表編み$1目");
  translatedText = translatedText.replace(/(\d+)\s*裏編み/g, "裏編み$1目");
  translatedText = translatedText.replace(/(\d+)\s*増し目/g, "増し目$1回");
  translatedText = translatedText.replace(/(\d+)\s*作り目/g, "作り目$1目");

  // 棒針編み特有のパターン調整
  translatedText = translatedText.replace(/表編み(\d+)目目/g, "表編み$1目"); // 重複を避ける
  translatedText = translatedText.replace(/裏編み(\d+)目目/g, "裏編み$1目"); // 重複を避ける

  // K3, P2 などの連続パターンを調整
  translatedText = translatedText.replace(
    /表編み(\d+)目,\s*裏編み(\d+)目/g,
    "表編み$1目、裏編み$2目"
  );
  translatedText = translatedText.replace(
    /表編み(\d+)目\s*裏編み(\d+)目/g,
    "表編み$1目裏編み$2目"
  );

  // ケーブル編みパターンの調整
  translatedText = translatedText.replace(/C(\d+)B/g, "$1目交差・後ろ交差");
  translatedText = translatedText.replace(/C(\d+)F/g, "$1目交差・前交差");
  translatedText = translatedText.replace(/T(\d+)B/g, "$1目ねじり・後ろ");
  translatedText = translatedText.replace(/T(\d+)F/g, "$1目ねじり・前");

  // ゴム編みパターンの調整
  translatedText = translatedText.replace(
    /\b表編み(\d+)\s*裏編み(\d+)\b/gi,
    "表編み$1目裏編み$2目のゴム編み"
  );
  translatedText = translatedText.replace(
    /\b裏編み(\d+)\s*表編み(\d+)\b/gi,
    "裏編み$1目表編み$2目のゴム編み"
  );

  // まだ翻訳されていない大文字パターン（K1P1など）
  translatedText = translatedText.replace(
    /\bK(\d+)P(\d+)\b/gi,
    "表編み$1目裏編み$2目のゴム編み"
  );
  translatedText = translatedText.replace(
    /\bP(\d+)K(\d+)\b/gi,
    "裏編み$1目表編み$2目のゴム編み"
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
const clearDataBtn = document.getElementById("clearDataBtn");

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

  // ヘルプボタンのイベントリスナー
  const helpBtn = document.getElementById("helpBtn");
  helpBtn.addEventListener("click", toggleHelpModal);

  // ヘルプモーダルのイベントリスナー
  const helpModal = document.getElementById("helpModal");
  const helpModalClose = document.getElementById("helpModalClose");

  helpModal.addEventListener("click", handleHelpModalOutsideClick);
  helpModalClose.addEventListener("click", hideHelpModal);

  // 保存データ破棄ボタンのイベントリスナー
  clearDataBtn.addEventListener("click", clearSavedData);

  // NoSleep.js初期化（ページ読み込み時）
  initNoSleep();
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

// 保存されたデータを確認ダイアログ付きで削除する関数
function clearSavedData() {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);

    if (!savedState) {
      alert("削除する保存データはありません。");
      return;
    }

    const state = JSON.parse(savedState);
    const confirmMessage =
      `保存されている進捗データを削除しますか？\n\n` +
      `進捗: ${state.currentBlockIndex + 1} / ${state.totalBlocks}\n` +
      `最終更新: ${new Date(state.lastUpdated).toLocaleString()}\n\n` +
      `この操作は取り消すことができません。`;

    if (confirm(confirmMessage)) {
      clearSavedState();
      alert("保存された進捗データを削除しました。");

      // 現在パターン表示中の場合はアップロード画面に戻る
      if (patternSection.style.display !== "none") {
        patternBlocks = [];
        currentBlockIndex = 0;
        showUploadSection();
      }
    }
  } catch (error) {
    console.error("データ削除エラー:", error);
    alert("データの削除中にエラーが発生しました。");
  }
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

// === ヘルプモーダル機能 ===

// ヘルプモーダルを表示/非表示する関数
function toggleHelpModal() {
  const helpModal = document.getElementById("helpModal");

  if (isHelpModalVisible) {
    hideHelpModal();
  } else {
    showHelpModal();
  }
}

// ヘルプモーダルを表示
function showHelpModal() {
  const helpModal = document.getElementById("helpModal");
  helpModal.style.display = "flex";

  // アニメーション用の遅延
  requestAnimationFrame(() => {
    helpModal.classList.add("show");
  });

  isHelpModalVisible = true;

  // ESCキーで閉じる
  document.addEventListener("keydown", handleHelpModalEscKey);
}

// ヘルプモーダルを非表示
function hideHelpModal() {
  const helpModal = document.getElementById("helpModal");
  helpModal.classList.remove("show");

  // アニメーション完了後に非表示
  setTimeout(() => {
    helpModal.style.display = "none";
  }, 300);

  isHelpModalVisible = false;

  // ESCキーイベントリスナーを削除
  document.removeEventListener("keydown", handleHelpModalEscKey);
}

// ESCキーでモーダルを閉じる
function handleHelpModalEscKey(event) {
  if (event.key === "Escape") {
    hideHelpModal();
  }
}

// モーダル外クリックで閉じる処理
function handleHelpModalOutsideClick(event) {
  const helpModal = document.getElementById("helpModal");
  const helpModalContent = helpModal.querySelector(".help-modal-content");

  if (event.target === helpModal && !helpModalContent.contains(event.target)) {
    hideHelpModal();
  }
}

// ヘルプモード通知を表示
function showHelpNotification(message) {
  // 既存の通知を削除
  const existingNotification = document.querySelector(".help-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // 新しい通知を作成
  const notification = document.createElement("div");
  notification.className = "help-notification";
  notification.textContent = message;

  document.body.appendChild(notification);

  // アニメーション表示
  requestAnimationFrame(() => {
    notification.classList.add("show");
  });

  // 3秒後に非表示
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}
