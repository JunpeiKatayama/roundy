// 編み図の英文を日本語へ。訳しきれない節は混ぜずに原文のまま残す
import DICTIONARY from "../knitting-dictionary.js";

const DICT = Object.fromEntries(Object.entries(DICTIONARY).map(([k, v]) => [k.toLowerCase(), v]));
const NOT_STITCHES = new Set(
  "st sts stitch stitches sp space rep repeat around join turn next prev previous rem remaining beg beginning end total tog together times x rnd round row rs ws".split(" ")
);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STITCH = Object.keys(DICT)
  .filter((k) => /^[a-z]/.test(k) && !NOT_STITCHES.has(k) && !/\d$/.test(k.replace(/2tog$/, "")))
  .sort((a, b) => b.length - a.length)
  .map(escape)
  .join("|");
const S = `(${STITCH})`;
const ST = String.raw`(?:sts?|stitch(?:es)?)`;
const INTO = String.raw`(?:in|into)(?:\s+the)?`;
const name = (s) => DICT[s.toLowerCase().replace(/\s+/g, " ")] ?? s;
const SIZES = String.raw`(\d+(?:\s*\([\d,\s]+\))?)`;
const WORK = String.raw`(?:(?:work|make)\s+)?`;
const times = (n) => (n && n !== "1" ? `${n}目` : "");

const COUNT = /^[({[]?\s*(\d+)\s*(?:sts?|stitches|目)?(?:\s+rem(?:ain(?:ing)?)?)?\s*[)}\]]?$/i;
const STITCH_COUNT = /^(\d+(?:\s*\([\d,\s]+\))?)\s+(?:sc|hdc|dc|tr|sts?|stitches)s?(?:\s+rem(?:ain(?:ing)?)?)?$/i;
const ALLOWED_LATIN = /\b(RS|WS|DS|MC|CC\d?|[A-E])\b/g;

const CLAUSES = [
  [new RegExp(`^${WORK}(\\d+)?\\s*${S}\\s+${INTO}\\s+next\\s+${SIZES}\\s+${ST}$`, "i"), (_, n, s, c) => `次の${c}目に${name(s)}${n && n !== "1" ? `を${n}目ずつ` : ""}`],
  [new RegExp(`^${WORK}(\\d+)?\\s*${S}\\s+${INTO}\\s+each\\s+of\\s+the\\s+next\\s+${SIZES}\\s+${ST}$`, "i"), (_, n, s, c) => `次の${c}目に${name(s)}${n && n !== "1" ? `を${n}目ずつ` : ""}`],
  [new RegExp(`^${WORK}(\\d+)?\\s*${S}\\s+${INTO}\\s+(?:next|following)\\s+${ST}$`, "i"), (_, n, s) => `次の目に${name(s)}${times(n)}`],
  [new RegExp(`^${WORK}(\\d+)?\\s*${S}\\s+${INTO}\\s+(?:each|every)\\s+${ST}(?:\\s+(around|across))?$`, "i"), (_, n, s, w) => `各目に${name(s)}${n && n !== "1" ? `を${n}目ずつ` : ""}${w ? (w.toLowerCase() === "around" ? "（1周）" : "（端まで）") : ""}`],
  [new RegExp(`^${WORK}(\\d+)?\\s*${S}\\s+${INTO}\\s+same\\s+${ST}(?:\\s+as\\s+ch\\s*\\d+)?$`, "i"), (_, n, s) => `同じ目に${name(s)}${times(n)}`],
  [new RegExp(`^${WORK}(\\d+)?\\s*${S}\\s+${INTO}\\s+(?:magic\\s+)?(?:ring|loop|circle)$`, "i"), (_, n, s) => `輪の中に${name(s)}${times(n)}`],
  [new RegExp(`^${WORK}${S}\\s+around$`, "i"), (_, s) => `${name(s)}を1周`],
  [new RegExp(`^${WORK}${S}\\s+across$`, "i"), (_, s) => `${name(s)}を端まで`],
  [new RegExp(`^${S}\\s+to\\s+end(?:\\s+of\\s+(?:row|rnd|round))?$`, "i"), (_, s) => `最後まで${name(s)}`],
  [new RegExp(`^${S}\\s+to\\s+last\\s+(\\d+)\\s+${ST}$`, "i"), (_, s, c) => `残り${c}目まで${name(s)}`],
  [new RegExp(`^${WORK}(\\d+)\\s*${S}$`, "i"), (_, n, s) => `${name(s)}${n}目`],
  [new RegExp(`^${S}\\s*(\\d+)(?:\\s+${ST})?$`, "i"), (_, s, n) => `${name(s)}${n}目`],
  [new RegExp(`^(?:cast on|co)\\s+(\\d+)(?:\\s+${ST})?$`, "i"), (_, n) => `作り目${n}目`],
  [new RegExp(`^(?:skip|sk)\\s+(?:the\\s+)?next(?:\\s+(\\d+))?\\s+${ST}$`, "i"), (_, n) => `次の${n ? `${n}` : ""}目を飛ばす`],
  [new RegExp(`^(?:join\\s+(?:with\\s+)?)?(?:sl\\s*st|slip\\s+stitch)\\s+(?:in|into|to)\\s+(?:the\\s+)?(?:top\\s+of\\s+)?(?:the\\s+)?(?:(?:beginning|beg|first|1st)\\s+)?ch(?:ain)?(?:[-\\s]*(\\d+))?$`, "i"), (_, n) => `立ち上がりの鎖${n ? `の${n}目めに` : "に"}引き抜いてつなぐ`],
  [new RegExp(`^(?:join\\s+(?:with\\s+)?)?(?:sl\\s*st|slip\\s+stitch)\\s+(?:in|into|to)\\s+(?:the\\s+)?(?:top\\s+of\\s+)?(?:the\\s+)?(?:first|1st)\\s+${S}(?:\\s+to\\s+join)?$`, "i"), (_, s) => `最初の${name(s)}に引き抜いてつなぐ`],
  [/^rep(?:eat)?\s+from\s*\*\s*(around|across|to end(?: of (?:row|rnd|round))?)?$/i, (_, w) => `*から${w ? (w.toLowerCase() === "around" ? "1周" : "端まで") : ""}繰り返す`],
  [/^rep(?:eat)?\s+(?:from\s+)?\*\s*to\s*\*$/i, () => "*から*までを繰り返す"],
  [/^(?:same as|rep(?:eat)?)\s+(?:rnd|round|row)\s+(\d+)$/i, (_, n) => `${n}段目と同様に編む`],
  [new RegExp(`^(\\d+)?\\s*${S}\\s+${INTO}\\s+(?:next\\s+)?ch[-\\s]sp$`, "i"), (_, n, s) => `鎖の間に${name(s)}${times(n)}`],
  [new RegExp(`^${S}\\s+${INTO}\\s+each\\s+${S}\\s+to\\s+next\\s+ch[-\\s]sp$`, "i"), (_, s) => `次の鎖の間まで${name(s)}`],
  [new RegExp(`^(?:skip|sk)\\s+(?:the\\s+)?first\\s+${ST}$`, "i"), () => "最初の目を飛ばす"],
  [new RegExp(`^(?:skip|sk)\\s+(?:the\\s+)?next(?:\\s+(\\d+))?\\s+${S}$`, "i"), (_, n, s) => `次の${n ?? ""}${name(s)}を飛ばす`],
  [new RegExp(`^but with\\s+(\\d+)\\s+${ST}\\s+in between each increase$`, "i"), (_, n) => `増し目の間は${n}目にする`],
  [/^do not fasten off$/i, () => "糸は切らない"],
  [/^do not join$/i, () => "つながない"],
  [/^see (?:notes|glossary)$/i, () => "注記を参照"],
  [/^place marker\s*\(pm\)(?:\s+in last st)?$/i, () => "マーカーを置く"],
  [/^fasten off$/i, () => "糸を切る"],
  [/^leaving a long tail$/i, () => "糸端を長めに残す"],
  [/^weave in (?:all |loose |the )?(?:ends|tails)$/i, () => "糸始末をする"],
  [/^fasten off and weave in (?:all |loose |the )?(?:ends|tails)$/i, () => "糸を切り、糸始末をする"],
  [/^stuff (firmly|lightly)$/i, (_, w) => (w.toLowerCase() === "firmly" ? "綿をしっかり詰める" : "綿を軽く詰める")],
  [/^change to (?:color|colour)\s+([A-Z0-9]+)$/i, (_, c) => `色${c}に替える`],
  [/^counts as (?:first|1st|a)\s+(\S+)$/i, (_, s) => `${name(s)}1目に数える`],
  [/^turn$/i, () => "編み地を返す"],
];

function translateClause(clause) {
  const source = clause.trim();
  if (!source) return "";
  if (!/[A-Za-z]/.test(source)) return source;
  const lead = source.match(/^\*+\s*/)?.[0].trim() ?? "";
  const trail = source.match(/\s*\*+$/)?.[0].trim() ?? "";
  const body = source.slice(lead.length).replace(/\s*\*+$/, "").replace(/^\s+/, "");
  // 文末の括弧注は本体と分けて訳す
  const aside = body.match(/^(.*\S)\s+\(([^()]+)\)$/);
  if (aside) {
    const inner = translateClause(aside[2]);
    const main = translateClause(aside[1]);
    if (!/[A-Za-z]/.test(inner.replace(ALLOWED_LATIN, "")) && !isLatin(main)) return `${lead}${main}（${inner}）${trail}`;
    return source;
  }
  const countOnly = body.match(COUNT);
  if (countOnly) return `（${countOnly[1]}目）`;
  for (const [re, build] of CLAUSES) {
    const m = body.match(re);
    if (m) return `${lead}${build(...m)}${trail}`;
  }
  const term = DICT[body.toLowerCase().replace(/\s+/g, " ")];
  return term ? `${lead}${term}${trail}` : source;
}

const isLatin = (text) => /[A-Za-z]/.test(text.replace(ALLOWED_LATIN, ""));

// 括弧の中では区切らずに節へ分ける
function splitClauses(text) {
  const parts = [];
  let depth = 0;
  let buffer = "";
  const push = (separator) => {
    parts.push({ text: buffer, separator });
    buffer = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ("[({".includes(c)) depth++;
    if ("])}".includes(c)) depth = Math.max(0, depth - 1);
    const sentenceEnd = c === "." && (i === text.length - 1 || /\s/.test(text[i + 1]));
    if (depth === 0 && (c === "," || c === ";")) push("、");
    else if (depth === 0 && sentenceEnd) push("。");
    else if (depth === 0 && /[—–]/.test(c) && /^\s*\d/.test(text.slice(i + 1))) push("");
    else buffer += c;
  }
  if (buffer.trim()) push("");
  return parts;
}

const GROUP = /^(?:\[([^[\]]*)\]|\(([^()]*)\))\s*(?:(?:x|×|\*)\s*(\d+)|(\d+)\s*times|(around|across))?(?:\s*times)?\s*$/i;

function translateGroup(text, isTail) {
  const count = text.trim().match(COUNT);
  if (count) return `（${count[1]}目）`;
  const stitches = text.trim().match(STITCH_COUNT);
  if (stitches && isTail) return `（${stitches[1]}目）`;
  const m = text.trim().match(GROUP);
  if (!m) return null;
  const inner = translateSentence(m[1] ?? m[2]);
  if (isLatin(inner)) return text.trim();
  const repeat = m[3] || m[4];
  if (repeat) return `［${inner}］を${repeat}回`;
  if (m[5]) return `［${inner}］を${m[5].toLowerCase() === "around" ? "1周" : "端まで"}`;
  return `（${inner}）`;
}

function translateSentence(text) {
  return splitClauses(text)
    .map(({ text: clause, separator }, i, all) => {
      // "24 dc" は末尾なら目数、途中なら編み方の指示
      const group = translateGroup(clause, i === all.length - 1);
      const body = group ?? translateClause(clause);
      if (!body) return "";
      return isLatin(body) ? `${clause.trim()}${separator === "。" ? ". " : separator ? ", " : ""}` : `${body}${separator}`;
    })
    .join("")
    .replace(/、(?=$|。)/, "")
    .replace(/目）。/g, "目）")
    .trim();
}

export function translatePattern(text) {
  return translateSentence(text.replace(/\s+/g, " ").trim());
}

export function labelToJapanese(step) {
  const tag = step.label.match(/\(([^)]+)\)$/)?.[1];
  const suffix = tag ? `（${translateClause(tag)}）` : "";
  if (step.number === null) return step.label;
  return `${step.number}段目${suffix}`;
}
