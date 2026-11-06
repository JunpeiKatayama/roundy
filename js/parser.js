// 行のリストを、編み図のブロック（ラウンド・説明文）へ解析する

const NUMBERS = String.raw`\d+(?:\s*(?:-|–|—|to|through|thru|,\s*and|,|&|and)\s*\d+)*`;
const SEP = String.raw`\s*([:.\-–—])\s*`;
const HEADER = new RegExp(
  String.raw`^[*•\s]*(rounds?|rnds?|rows?|r)\.?\s*(${NUMBERS})\s*(\([^)]*\))?(?:${SEP})?(.*)$`,
  "i"
);
const NAMED_HEADER =
  /^[*•\s]*((?:[a-z0-9-]+\s+){0,3}(?:rounds?|rnds?|rows?))\s*(\([^)]*\))?\s*:\s*(.*)$/i;
const JA_HEADER = /^第?(\d+)(ラウンド|段|周)(?:目)?[:：\s]*(.*)$/;
const NUMBERED_STEP = /^(\d+)\.\s+([A-Z].*)$/;
const INLINE_HEADER = /(?<=[.)\]}]\s+)(?=(?:rounds?|rnds?|rows?)\s*\d[^:]{0,24}:)/gi;

const STITCH_START =
  /^[*\[(]*\s*(k\d*|p\d*|knit|purl|sc|hdc|dc|tr|ch|sl|inc|dec|work|rep|repeat|skip|sk|yo|ssk|cdd)\b/i;
const STITCH_WORD = /\b(ch|sc|dc|hdc|tr|cast on|bind off|fasten off|weave|sts?|stitches|repeat|rep)\b/i;
const SIZE_QUALIFIER = /^for\b.*\b(sizes?|only)\b/i;
const ABBREVIATION = /^\S+(\s\S+){0,2}\s*=\s*\S/;
const LABELLED_PROSE = /^([A-Z][A-Za-z'’, -]{1,28}):\s+(\S.*)$/;
const ROUND_INSTRUCTION = /^(work|repeat|rep|keep|continue)\b/i;
const SMALL_WORDS = /^(with|from|into|over|and|the|for|of|in|on|to|a|an)$/;
const MAX_TAG_LENGTH = 16;
const SETUP = /\b(cast on|co\b|ch(ain)?\s*\d|magic (ring|circle)|slip ?knot|pick up)/i;
const INFO_HEADING =
  /^(materials?|supplies|notions?|needles?|hooks?|yarns?|gauge|tension|sizes?|finished (size|measurements?)|measurements?|abbreviations?|stitches used|notes?|special stitches|pattern notes?|skill level|you will need)\b/i;
const MAX_ROUNDS = 500;

const endsSentence = (text) => /[.!?:;)\]}]["”’]?$/.test(text);
const unbalanced = (text) => (text.match(/\(/g) || []).length > (text.match(/\)/g) || []).length;

export function parseNumbers(source) {
  const numbers = [];
  for (const [, start, end, single] of source.matchAll(/(\d+)\s*(?:-|–|—|to|through|thru)\s*(\d+)|(\d+)/g)) {
    if (single) {
      numbers.push(Number(single));
      continue;
    }
    const [from, to] = [Number(start), Number(end)];
    if (to < from || to - from > MAX_ROUNDS) {
      numbers.push(from);
      continue;
    }
    for (let n = from; n <= to; n++) numbers.push(n);
  }
  return numbers;
}

function headerOf(word, numbers) {
  const round = /^r(ou)?n/i.test(word);
  const plural = numbers.length > 1;
  const name = /^rn/i.test(word) ? "Rnd" : round ? "Round" : "Row";
  return { unit: round ? "round" : "row", name: plural ? `${name}s` : name };
}

export function matchHeader(line) {
  const ja = line.match(JA_HEADER);
  if (ja) {
    return {
      label: `${ja[1]}${ja[2]}`,
      unit: ja[2] === "段" ? "row" : "round",
      numbers: [Number(ja[1])],
      text: ja[3],
    };
  }
  const m = line.match(HEADER);
  if (m) {
    let [, word, nums, qualifier, sep, rest] = m;
    // "Rnd 1 - 6 sc" は範囲ではなく「区切りのハイフン + 6 sc」
    if (!sep && rest && /^\d+\s+[-–—]\s+\d+$/.test(nums)) {
      const [first, second] = nums.split(/\s+[-–—]\s+/);
      nums = first;
      sep = "-";
      rest = `${second} ${rest}`;
    }
    const bareR = /^r$/i.test(word);
    if (sep || !rest || (!bareR && (STITCH_START.test(rest) || SIZE_QUALIFIER.test(rest)))) {
      if (!(bareR && !sep)) {
        const numbers = parseNumbers(nums);
        const { unit, name } = headerOf(word, numbers);
        return {
          label: `${name} ${nums.replace(/\s+/g, " ")}`,
          unit,
          numbers,
          qualifier: qualifier?.slice(1, -1),
          text: rest,
        };
      }
    }
  }
  const named = line.match(NAMED_HEADER);
  if (named) {
    const [, label, qualifier, rest] = named;
    return {
      label: label.trim().toLowerCase().replace(/^./, (c) => c.toUpperCase()),
      unit: /row/i.test(label) ? "row" : "round",
      numbers: null,
      qualifier: qualifier?.slice(1, -1),
      text: rest,
    };
  }
  return null;
}

function isHeading(text) {
  const t = text.replace(/:$/, "");
  if (/[.,;!?=]$/.test(t) || t.length > 48 || STITCH_WORD.test(t.replace(/\bStitch\b/g, ""))) return false;
  if (!/^[A-Z0-9]/.test(t) || t.split(/\s+/).length > 7) return false;
  const words = t.replace(/\([^)]*\)/g, "").trim().split(/\s+/);
  return /[A-Za-z]/.test(t) && words.every((w) => SMALL_WORDS.test(w) || w.length <= 2 || /^[A-Z#\d]/.test(w));
}

export function extractCount(text) {
  const tail = text.trim().replace(/[.\s]+$/, "");
  const patterns = [
    /[({[]\s*(\d+)\s*(?:sts?|stitches|目)?\s*[)}\]]$/i,
    /[—–=-]\s*(\d+)\s*(?:sts?|stitches)(?:\s+rem(?:ain(?:ing)?)?)?$/i,
    /\b(\d+)\s+(?:sc|hdc|dc|tr|sts?|stitches)s?(?:\s+rem(?:ain(?:ing)?)?)?$/i,
  ];
  for (const re of patterns) {
    const m = tail.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

let nextId = 0;
const newId = () => `b${Date.now().toString(36)}${(nextId++).toString(36)}`;

function createBlock(fields) {
  return { id: newId(), kind: "round", label: "", tag: "", unit: "round", numbers: null, section: "", text: "", notes: [], ...fields };
}

function appendText(block, text) {
  if (!block.text) block.text = text;
  else if (block.text.endsWith("-")) block.text += text;
  else block.text += ` ${text}`;
}

function normalize(lines) {
  const items = lines.map((l) => (typeof l === "string" ? { text: l } : l));
  const out = [];
  for (const item of items) {
    const parts = item.text.split(INLINE_HEADER).map((t) => t.trim()).filter(Boolean);
    parts.forEach((text) => out.push({ ...item, text }));
  }
  // 見出しの括弧が次の行へ続く場合は1行にまとめる
  for (let i = 0; i < out.length - 1; i++) {
    if (/^[*•\s]*(rounds?|rnds?|rows?)\s*\d/i.test(out[i].text) && unbalanced(out[i].text)) {
      out[i] = { ...out[i], text: `${out[i].text} ${out[i + 1].text}` };
      out.splice(i + 1, 1);
    }
  }
  return out;
}

function readEntries(lines) {
  const entries = [];
  let section = "";
  let infoMode = false;
  let current = null;
  let previous = null;
  let pendingNotes = [];

  const pushHeading = (text) => entries.push({ type: "heading", text });
  const pushInfo = (text) => entries.push({ type: "info", text });
  const pushBlock = (block) => {
    block.notes = pendingNotes;
    pendingNotes = [];
    entries.push({ type: "block", block });
    current = block;
  };

  for (const line of normalize(lines)) {
    const { text } = line;
    const header = matchHeader(text);
    if (header && SIZE_QUALIFIER.test(header.text)) {
      pendingNotes.push(`${header.label} ${header.text}`.replace(/:$/, ""));
      previous = line;
      current = null;
    } else if (header) {
      infoMode = false;
      const { qualifier, ...fields } = header;
      const short = qualifier && qualifier.length <= MAX_TAG_LENGTH;
      pushBlock(createBlock({ ...fields, section, tag: short ? qualifier : "" }));
      if (qualifier && !short) current.notes.push(qualifier);
    } else if (ABBREVIATION.test(text)) {
      pushInfo(text);
      current = null;
    } else if (INFO_HEADING.test(text) && (text.length < 30 || /:/.test(text.slice(0, 24)))) {
      infoMode = true;
      pushInfo(text);
      current = null;
    } else if (isHeading(text) && startsSection(line, previous, current, infoMode)) {
      infoMode = false;
      section = text.replace(/:$/, "");
      pushHeading(section);
      current = null;
    } else if (infoMode) {
      pushInfo(text);
    } else if (current && NUMBERED_STEP.test(text) && endsSentence(previous.text)) {
      const [, number, body] = text.match(NUMBERED_STEP);
      pushBlock(createBlock({ kind: "text", label: `手順 ${number}`, section, text: body }));
    } else if (current && previous && isContinuation(text, previous)) {
      appendText(current, text);
    } else {
      const step = text.match(NUMBERED_STEP);
      const labelled = text.match(LABELLED_PROSE);
      if (step) pushBlock(createBlock({ kind: "text", label: `手順 ${step[1]}`, section, text: step[2] }));
      else if (labelled) pushBlock(createBlock({ kind: "text", label: labelled[1], section, text: labelled[2] }));
      else pushBlock(createBlock({ kind: "text", section, text }));
    }
    previous = line;
  }
  return entries;
}

function startsSection(line, previous, current, infoMode) {
  if (infoMode && line.para === false) return false;
  const allCaps = line.text === line.text.toUpperCase();
  if (allCaps) return true;
  return !(current && previous && line.para === false && !endsSentence(previous.text));
}

function isContinuation(text, previous) {
  if (/^[a-z0-9{\[]/.test(text)) return true;
  // 前の行が桁いっぱいまで届いていないなら、そこで文は切れている
  if (previous.wrapped === false && /^[A-Z(]/.test(text)) return false;
  return !endsSentence(previous.text);
}

// 最初のラウンドより前は材料などの情報、ただしそのラウンドの準備は手順として残す
function splitPreamble(entries) {
  const first = entries.findIndex((e) => e.type === "block" && e.block.kind === "round");
  if (first === -1) return { info: [], body: entries, found: false };
  const { section } = entries[first].block;
  const info = [];
  const keep = [];
  entries.slice(0, first).forEach((entry, i, list) => {
    if (entry.type === "block") {
      const nearest = i === list.length - 1;
      const sameSection = section && entry.block.section === section;
      if (sameSection || (nearest && SETUP.test(entry.block.text))) keep.push(entry);
      else info.push(entry.block.label ? `${entry.block.label}: ${entry.block.text}` : entry.block.text);
    } else if (entry.type === "info" || entry.text !== section) {
      info.push(entry.text);
    }
  });
  const rest = entries.slice(first);
  rest.filter((e) => e.type === "info").forEach((e) => info.push(e.text));
  return { info, body: [...keep, ...rest.filter((e) => e.type !== "info")], found: true };
}

// ラウンドの間に挟まる説明文は、次のラウンドの注記として見せる
function foldNotes(blocks) {
  const out = [];
  blocks.forEach((block, i) => {
    const prev = out.at(-1);
    const next = blocks[i + 1];
    const between =
      block.kind === "text" && !block.label &&
      prev?.kind === "round" && prev.section === block.section &&
      next?.kind === "round" && next.section === block.section;
    if (!between) out.push(block);
    else if (ROUND_INSTRUCTION.test(block.text)) prev.notes.push(block.text);
    else next.notes.unshift(block.text);
  });
  return out;
}

export function parseLines(lines) {
  const { info, body, found } = splitPreamble(readEntries(lines));
  const blocks = foldNotes(body.filter((e) => e.type === "block").map((e) => e.block));
  return { info, blocks, found };
}

// ブロックを、読む単位（1ラウンド = 1ステップ）へ展開する
export function expandBlocks(blocks) {
  const steps = [];
  let run = [];
  const flushRun = () => {
    steps.push(...run.sort((a, b) => a.number - b.number));
    run = [];
  };
  for (const block of blocks) {
    const numbers = block.numbers?.length ? block.numbers : null;
    const isList = numbers && numbers.some((n, i) => i > 0 && n !== numbers[i - 1] + 1);
    const base = {
      blockId: block.id,
      section: block.section,
      kind: block.kind,
      unit: block.unit,
      text: block.text,
      notes: block.notes,
      count: block.kind === "round" ? extractCount(block.text) : null,
    };
    const toStep = (number, i) => ({
      ...base,
      number,
      label: `${roundName(block)} ${number}${block.tag ? ` (${block.tag})` : ""}`,
      range: numbers.length > 1 ? { label: block.label, index: i + 1, total: numbers.length } : null,
      notes: i === 0 ? block.notes : [],
    });
    if (isList) {
      run.push(...numbers.map(toStep));
      continue;
    }
    flushRun();
    if (numbers) steps.push(...numbers.map(toStep));
    else steps.push({ ...base, number: null, label: block.tag ? `${block.label} (${block.tag})` : block.label, range: null });
  }
  flushRun();
  return steps;
}

function roundName(block) {
  const word = block.label.match(/^[A-Za-z]+/)?.[0];
  if (!word) return block.unit === "row" ? "段" : "周";
  return word.replace(/s$/, "");
}

export function mergeWithPrevious(blocks, index) {
  if (index <= 0) return blocks;
  const merged = { ...blocks[index - 1] };
  merged.text = `${merged.text} ${blocks[index].text}`.trim();
  merged.notes = [...merged.notes, ...blocks[index].notes];
  return [...blocks.slice(0, index - 1), merged, ...blocks.slice(index + 1)];
}

export function splitBlock(blocks, index, position) {
  const block = blocks[index];
  const before = block.text.slice(0, position).trim();
  const after = block.text.slice(position).trim();
  if (!before || !after) return blocks;
  const header = matchHeader(after);
  const second = header
    ? createBlock({ ...header, section: block.section, tag: header.qualifier ?? "" })
    : createBlock({ kind: "text", section: block.section, text: after });
  delete second.qualifier;
  return [...blocks.slice(0, index), { ...block, text: before }, second, ...blocks.slice(index + 1)];
}

