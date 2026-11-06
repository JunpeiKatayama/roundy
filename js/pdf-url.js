// URL から開くときの入力の検証とファイル名の決定

export function parsePdfUrl(text) {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export function fileNameFromUrl(url) {
  const last = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {
    // 不正なエスケープはそのまま使う
  }
  name = name.replace(/\.pdf$/i, "");
  return `${name || url.hostname}.pdf`;
}
