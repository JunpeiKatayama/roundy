import test from "node:test";
import assert from "node:assert/strict";
import { labelToJapanese, translatePattern as t } from "../js/translator.js";

const cases = [
  ["6 sc in magic ring. (6)", "輪の中に細編み6目。（6目）"],
  ["[sc in next st, inc in next st] x 6. (18)", "［次の目に細編み、次の目に増し目］を6回。（18目）"],
  ["Sc in next 2 sts", "次の2目に細編み"],
  ["2 dc in next st", "次の目に長編み2目"],
  ["inc around", "増し目を1周"],
  ["K2, P to end", "表編み2目、最後まで裏編み"],
  ["K2, P2 to end", "表編み2目、P2 to end"],
  ["k1, m1l, knit to last 3 sts, m1r, k1", "表編み1目、左ねじり増し目、残り3目まで表編み、右ねじり増し目、表編み1目"],
  ["K2tog, yo, SSK", "左上2目一度、掛け目、右上2目一度"],
  ["Sc2tog around—8 sts rem.", "細編み2目一度を1周（8目）"],
  ["double treble crochet in next st", "次の目に3つ巻き長編み"],
  ["front post double crochet in next st", "次の目に表引き上げ長編み"],
  ["*K2, p2; rep from * around.", "*表編み2目、裏編み2目、*から1周繰り返す。"],
  ["Ch 3 (counts as first dc), turn.", "鎖編み3目（長編み1目に数える）、編み地を返す。"],
  ["Fasten off, leaving a long tail.", "糸を切る、糸端を長めに残す。"],
  ["Same as rnd 3, but with 4 sts in between each increase. 38 DCs.", "3段目と同様に編む、増し目の間は4目にする。（38目）"],
  ["[1 sc into each of the next 4 (5, 6) sts, 2 sc into next st] 6 times—36 (42, 48) sts.", "［次の4 (5, 6)目に細編み、次の目に細編み2目］を6回（36 (42, 48)目）"],
  ["Ch 1, turn, sk first st.", "鎖編み1目、編み地を返す、最初の目を飛ばす。"],
  ["*Sk next sc, sc in each sc to next ch sp, 2 sc in ch sp, ch 5; rep from * around—5 sc.", "*次の細編みを飛ばす、次の鎖の間まで細編み、鎖の間に細編み2目、鎖編み5目、*から1周繰り返す（5目）"],
];

for (const [source, expected] of cases) {
  test(`訳す: ${source}`, () => assert.equal(t(source), expected));
}

test("round も row も段目と表記する", () => {
  assert.equal(labelToJapanese({ label: "Round 1 (decrease)", number: 1, unit: "round" }), "1段目（減らし目）");
  assert.equal(labelToJapanese({ label: "Row 3", number: 3, unit: "row" }), "3段目");
  assert.equal(labelToJapanese({ label: "Next Rnd", number: null, unit: "round" }), "Next Rnd");
});

test("訳せない節は混ぜずに英語のまま残す", () => {
  assert.equal(t("Stuff the head firmly and sew to body."), "Stuff the head firmly and sew to body.");
  const mixed = t("Ch 1, position the eyes between rounds 8 and 9.");
  assert.match(mixed, /^鎖編み1目、position the eyes between rounds 8 and 9\.$/);
});
