import test from "node:test";
import assert from "node:assert/strict";
import { itemsToLines, pagesToLines } from "../js/pdf-lines.js";

const item = (str, x, y, width = str.length * 5) => ({ str, width, transform: [10, 0, 0, 10, x, y] });

test("断片を座標で行へ戻す", () => {
  const lines = itemsToLines([item("Rnd 1:", 50, 700), item("6 sc", 82, 700), item("Rnd 2: inc", 50, 686)]);
  assert.deepEqual(lines.map((l) => l.text), ["Rnd 1: 6 sc", "Rnd 2: inc"]);
});

test("2段組は左列→右列の順に読む", () => {
  const items = [];
  for (let i = 0; i < 4; i++) {
    items.push(item(`left ${i}`, 50, 700 - i * 14));
    items.push(item(`right ${i}`, 320, 700 - i * 14));
  }
  assert.deepEqual(itemsToLines(items).map((l) => l.text), ["left 0", "left 1", "left 2", "left 3", "right 0", "right 1", "right 2", "right 3"]);
});

test("狭い段間でも列をまたいで連結しない", () => {
  const items = [];
  for (let i = 0; i < 4; i++) {
    items.push(item(`left column line ${i}`, 50, 700 - i * 14, 246));
    items.push(item(`right ${i}`, 300, 700 - i * 14));
  }
  assert.ok(itemsToLines(items).every((l) => !l.text.includes("right") || !l.text.includes("left")));
});

test("段全体にまたがる行で区切って読む", () => {
  const items = [item("A full width heading across the whole page", 50, 720, 500)];
  for (let i = 0; i < 3; i++) {
    items.push(item(`l${i}`, 50, 700 - i * 14), item(`r${i}`, 320, 700 - i * 14));
  }
  items.push(item("Closing line across the entire page width", 50, 640, 500));
  assert.deepEqual(itemsToLines(items).map((l) => l.text), ["A full width heading across the whole page", "l0", "l1", "l2", "r0", "r1", "r2", "Closing line across the entire page width"]);
});

test("繰り返すヘッダー・フッターとページ番号を除く", () => {
  const page = (body, n) => ({
    height: 792,
    items: [item("Yarny Designs", 50, 760), item(body, 50, 500), item(`Page ${n} of 2`, 50, 40), item("Keep out of reach", 200, 40)],
  });
  const lines = pagesToLines([page("Rnd 1: 6 sc", 1), page("Rnd 2: inc", 2)]);
  assert.deepEqual(lines.map((l) => l.text), ["Rnd 1: 6 sc", "Rnd 2: inc"]);
});
