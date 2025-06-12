// グローバル変数
let patternBlocks = [];
let currentBlockIndex = 0;
const STORAGE_KEY = "patternReaderState";

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
  patternBlock.textContent = block.content;

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
  const textToCopy = currentBlock.content;

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
  // ボタンのアイコンを一時的に変更
  const iconElement = copyBtn.querySelector("i");
  iconElement.className = "fas fa-check";
  copyBtn.classList.add("copied");

  // 1.5秒後に元に戻す
  setTimeout(() => {
    iconElement.className = "fas fa-copy";
    copyBtn.classList.remove("copied");
  }, 1500);
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
