import test from "node:test";
import assert from "node:assert/strict";
import { expandBlocks, extractCount, matchHeader, mergeWithPrevious, parseLines, splitBlock } from "../js/parser.js";

const labels = (lines) => parseLines(lines).blocks.map((b) => b.label);

const headers = [
  ["Rnd 12: sc around", "Rnd 12", [12], "sc around"],
  ["Rnds 3-5: sc around", "Rnds 3-5", [3, 4, 5], "sc around"],
  ["Rnd 3–5: sc around", "Rnds 3–5", [3, 4, 5], "sc around"],
  ["Rows 1, 3, and 6: Knit", "Rows 1, 3, and 6", [1, 3, 6], "Knit"],
  ["Rnds 4 & 5: sc", "Rnds 4 & 5", [4, 5], "sc"],
  ["Round 1 - ch 3, 11 dc", "Round 1", [1], "ch 3, 11 dc"],
  ["Rnd 1 - 6 sc in ring", "Rnd 1", [1], "6 sc in ring"],
  ["R1: 6 sc", "Row 1", [1], "6 sc"],
  ["Row 1. K to end", "Row 1", [1], "K to end"],
  ["Row 2 P2, *k2, p2", "Row 2", [2], "P2, *k2, p2"],
  ["rnd 13: Sc2tog around", "Rnd 13", [13], "Sc2tog around"],
  ["第3段 細編み", "3段", [3], "細編み"],
];

for (const [line, label, numbers, text] of headers) {
  test(`見出し: ${line}`, () => {
    const h = matchHeader(line);
    assert.equal(h.label, label);
    assert.deepEqual(h.numbers, numbers);
    assert.equal(h.text, text);
  });
}

test("名前付きの段を認識し、(RS) はタグにする", () => {
  assert.equal(matchHeader("**DC Row: Ch3").label, "Dc row");
  assert.equal(matchHeader("All rounds: *K2, p2").label, "All rounds");
  assert.deepEqual(parseLines(["Row 1 (RS): K2", "Row 2 (WS): P2"]).blocks.map((b) => b.tag), ["RS", "WS"]);
});

test("文中の数字をラウンドと誤認しない", () => {
  assert.equal(matchHeader("then yarn over 2 times and pull through"), null);
  assert.equal(matchHeader("Color 2 is used here"), null);
  assert.equal(matchHeader("Row 2 of the chart is worked twice"), null);
  assert.equal(matchHeader("R 5 mm hook"), null);
});

test("1行に並んだラウンドを分ける", () => {
  assert.deepEqual(labels(["Rnd 1: 6 sc. (6) Rnd 2: inc around. (12) Rnds 3-5: sc around."]), ["Rnd 1", "Rnd 2", "Rnds 3-5"]);
  const { blocks } = parseLines(["Rnd 1: rep as in Rnd 3: then stop."]);
  assert.equal(blocks.length, 1);
});

test("折り返した行は同じラウンドへ、括弧が続く見出しは1行へまとめる", () => {
  const { blocks } = parseLines(["Rnd 3: Ch 3, dc in next st, sl st", "to first st. 26 DCs.", "Round 8-24 (or until long", "enough): ch 1, hdc around"]);
  assert.equal(blocks[0].text, "Ch 3, dc in next st, sl st to first st. 26 DCs.");
  assert.equal(blocks[1].numbers.length, 17);
  assert.equal(blocks[1].text, "ch 1, hdc around");
});

test("見出しをパーツとして扱い、番号が戻っても別物にする", () => {
  const { blocks } = parseLines(["Head", "Rnd 1: 6 sc", "Rnd 2: inc around", "ARMS (make 2)", "Rnd 1: 5 sc"]);
  assert.deepEqual(blocks.map((b) => b.section), ["Head", "Head", "ARMS (make 2)"]);
});

test("最初のラウンドの前は情報へ、準備の手順は残す", () => {
  const { info, blocks } = parseLines(["Materials", "worsted yarn", "SC = single crochet", "Crown", "Ch 7, join into a ring.", "Rnd 1: 13 dc"]);
  assert.ok(info.includes("worsted yarn") && info.includes("SC = single crochet"));
  assert.equal(blocks[0].kind, "text");
  assert.equal(blocks[0].text, "Ch 7, join into a ring.");
});

test("サイズ限定の行は次のラウンドの注記にする", () => {
  const { blocks } = parseLines(["Rnd 11: dc around.", "Rnd 12 for Teen sizes only:", "Rnd 12: dc around."]);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[1].notes, ["Rnd 12 for Teen sizes only"]);
});

test("ラウンドの間の説明は注記に、回数の指示は前のラウンドに付ける", () => {
  const { blocks } = parseLines(["Rnd 1: dc.", "There are 6 increases from here on.", "Rnd 2: dc.", "Work this last row 3 times.", "Rnd 3: dc."]);
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks[1].notes, ["There are 6 increases from here on.", "Work this last row 3 times."]);
});

test("Rep の指示は桁が余っている行の次なら独立させる", () => {
  const { blocks } = parseLines([
    { text: "Row 4: TR", wrapped: false, para: false },
    { text: "Repeat rows 1 - 4 until long enough.", wrapped: false, para: false },
  ]);
  assert.equal(blocks[0].text, "TR");
  assert.equal(blocks[1].text, "Repeat rows 1 - 4 until long enough.");
});

test("範囲を1ラウンドずつに展開する", () => {
  const steps = expandBlocks(parseLines(["Rnd 1: 6 sc", "Rnds 2-4: sc around"]).blocks);
  assert.deepEqual(steps.map((s) => s.label), ["Rnd 1", "Rnd 2", "Rnd 3", "Rnd 4"]);
  assert.deepEqual(steps[2].range, { label: "Rnds 2-4", index: 2, total: 3 });
});

test("飛び番号の指定は番号順に並べ直す", () => {
  const steps = expandBlocks(parseLines(["Rows 1, 3, and 6: Knit", "Rows 2, 4, 5: Purl"]).blocks);
  assert.deepEqual(steps.map((s) => s.number), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(steps.map((s) => s.text), ["Knit", "Purl", "Knit", "Purl", "Purl", "Knit"]);
});

test("目数を取り出す", () => {
  for (const [text, count] of [["sc around. (18)", 18], ["ch 1. {20 STS}", 20], ["sc around—24 sts.", 24], ["Same as rnd 3. 32 DCs.", 32], ["[sc, inc] x 6", null]]) {
    assert.equal(extractCount(text), count);
  }
});

test("確認画面の結合と分割", () => {
  const { blocks } = parseLines(["Rnd 1: 6 sc", "Rnd 2: inc around Rnds 3-5: sc around."]);
  const merged = mergeWithPrevious(blocks, 1);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].text, "6 sc inc around Rnds 3-5: sc around.");
  const position = blocks[1].text.indexOf("Rnds 3-5");
  const split = splitBlock(blocks, 1, position);
  assert.equal(split.length, 3);
  assert.equal(split[2].label, "Rnds 3-5");
  assert.equal(split[2].text, "sc around.");
});
