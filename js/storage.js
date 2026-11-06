// 作品と進捗の保存。ブラウザのストレージは使えないこともあるので必ず例外を受ける
const LIBRARY_KEY = "roundy.library.v1";
const LEGACY_KEY = "patternReaderState";
const SETTINGS_KEY = "roundy.settings.v1";

export const DEFAULT_SETTINGS = { fontScale: 1, primary: "ja", theme: "auto" };

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadLibrary() {
  return read(LIBRARY_KEY) ?? [];
}

export function saveLibrary(library) {
  return write(LIBRARY_KEY, library);
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY) };
}

export function saveSettings(settings) {
  return write(SETTINGS_KEY, settings);
}

// 旧バージョンの保存データ（1作品のみ）を取り出して消す
export function takeLegacyState() {
  const state = read(LEGACY_KEY);
  if (!state?.patternBlocks?.length) return null;
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    return null;
  }
  return state;
}
