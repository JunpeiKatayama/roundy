// pdf.js のテキスト断片を、読む順に並んだ「行」へ組み立て直す

const SEGMENT_GAP = 2.5; // 文字サイズの何倍空いていたら別の塊とみなすか
const MIN_COLUMN_ROWS = 3;
const NOISE = [
  /^(page|p\.?)\s*\d+(\s*(of|\/)\s*\d+)?$/i,
  /^\d{1,3}$/,
  /^©/,
  /copyright|all rights reserved/i,
];

function toItem(item) {
  const size = Math.hypot(item.transform[2], item.transform[3]) || 10;
  return {
    str: item.str,
    x: item.transform[4],
    y: item.transform[5],
    right: item.transform[4] + (item.width || 0),
    size,
  };
}

function groupRows(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows = [];
  for (const item of sorted) {
    const row = rows.at(-1);
    if (row && row.y - item.y < row.size * 0.5) {
      row.items.push(item);
    } else {
      rows.push({ y: item.y, size: item.size, items: [item] });
    }
  }
  return rows;
}

function toSegments(row, split) {
  const items = [...row.items].sort((a, b) => a.x - b.x);
  const segments = [];
  let current = null;
  for (const item of items) {
    const gap = current ? item.x - current.right : 0;
    const atColumn = split !== null && Math.abs(item.x - split) < 4 && gap > 0;
    if (!current || atColumn || gap > Math.max(item.size * SEGMENT_GAP, 18)) {
      current = { text: "", x: item.x, right: item.right, y: row.y, size: item.size };
      segments.push(current);
    }
    const needsSpace =
      current.text && gap > item.size * 0.15 && !/\s$/.test(current.text) && !/^\s/.test(item.str);
    current.text += (needsSpace ? " " : "") + item.str;
    current.right = Math.max(current.right, item.right);
    current.size = Math.max(current.size, item.size);
  }
  return segments.map((s) => ({ ...s, text: s.text.replace(/\s+/g, " ").trim() })).filter((s) => s.text);
}

// 列の左端には断片の開始位置が集まるので、最も集まる位置を2列目とみなす
function findColumnSplit(items) {
  const left = Math.min(...items.map((i) => i.x));
  const right = Math.max(...items.map((i) => i.right));
  const bins = new Map();
  for (const { x } of items) {
    const bin = Math.round(x / 4);
    bins.set(bin, (bins.get(bin) || 0) + 1);
  }
  const candidates = [...bins]
    .filter(([bin, count]) => bin * 4 > left + (right - left) * 0.3 && count >= MIN_COLUMN_ROWS)
    .sort((a, b) => b[1] - a[1]);
  return candidates.length ? candidates[0][0] * 4 : null;
}

// 2段組の範囲は左列→右列の順に、段をまたぐ行が来たら一度確定する
function orderSegments(rows, split) {
  if (split === null) return [rows.flat()];
  const groups = [];
  let left = [];
  let right = [];
  const flush = () => {
    if (left.length) groups.push(left);
    if (right.length) groups.push(right);
    left = [];
    right = [];
  };
  for (const segment of rows.flat()) {
    if (segment.x < split - 8 && segment.right > split + 8) {
      flush();
      groups.push([segment]);
    } else if (segment.x >= split - 8) {
      right.push(segment);
    } else {
      left.push(segment);
    }
  }
  flush();
  return groups;
}

function finishGroup(group, page) {
  const edge = Math.max(...group.map((s) => s.right));
  return group.map((s, i) => {
    const prev = group[i - 1];
    return {
      text: s.text,
      y: s.y,
      size: s.size,
      page,
      para: prev ? prev.y - s.y > s.size * 1.75 : true,
      wrapped: s.right > edge - s.size * 6,
    };
  });
}

export function itemsToLines(items, page = 1) {
  const usable = items.filter((i) => i.str && i.str.trim()).map(toItem);
  if (!usable.length) return [];
  const split = findColumnSplit(usable);
  const rows = groupRows(usable).map((row) => toSegments(row, split)).filter((r) => r.length);
  return orderSegments(rows, split).flatMap((group) => finishGroup(group, page));
}

// 複数ページで同じ位置に出る文言（ヘッダー・フッター）を取り除く
function isRunning(line, height) {
  return line.y > height * 0.88 || line.y < height * 0.1;
}

// "記事名 | 冊子名 | 12" のような柱は、変わる部分を除いて最後の区切りで比べる
function runningKey(text) {
  const tail = text.split("|").at(-1).replace(/\d+/g, "").trim() ? text.split("|").at(-1) : text.split("|").at(-2) ?? text;
  return tail.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, "");
}

export function pagesToLines(pages) {
  const perPage = pages.map((p, i) => ({ height: p.height, lines: itemsToLines(p.items, i + 1) }));
  const seen = new Map();
  for (const { height, lines } of perPage) {
    const keys = new Set(lines.filter((l) => isRunning(l, height)).map((l) => runningKey(l.text)));
    for (const key of keys) seen.set(key, (seen.get(key) || 0) + 1);
  }
  const threshold = pages.length <= 4 ? 2 : 3;
  // 同じ文言でもページによって塊の切れ方が違うので、前方一致も同一視する
  const repeats = (key) => {
    const related = [...seen].filter(([other]) => other === key || (other.length >= 8 && key.startsWith(other)));
    return related.reduce((sum, [, count]) => sum + count, 0) >= threshold;
  };
  return perPage.flatMap(({ height, lines }) =>
    lines.filter((line) => {
      if (NOISE.some((re) => re.test(line.text))) return false;
      return !(isRunning(line, height) && repeats(runningKey(line.text)));
    })
  );
}
