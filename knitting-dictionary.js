/**
 * 編み物パターン翻訳辞書
 * 英語の編み物用語を日本語に翻訳するための辞書ファイル
 *
 * 使用方法：
 * - このファイルは非エンジニアの方でも編集しやすいよう、用語と翻訳のペアを明確に記載しています
 * - 新しい用語を追加する場合は、既存の形式に従ってください
 * - 翻訳を修正する場合は、右側の日本語部分を変更してください
 *
 * 記号の説明：
 * - "英語用語": "日本語訳"
 * - 複数の表記がある場合は別々に記載（例：k と knit は両方記載）
 */

const KNITTING_DICTIONARY = {
  // ===== かぎ針編み（Crochet）用語 =====

  // 基本的な編み方
  sc: "細編み",
  "single crochet": "細編み",
  hdc: "中長編み",
  "half double crochet": "中長編み",
  dc: "長編み",
  "double crochet": "長編み",
  tr: "長々編み",
  "treble crochet": "長々編み",
  dtr: "3つ巻き長編み",
  "double treble crochet": "3つ巻き長編み",

  // チェーンとスリップステッチ（かぎ針編み用）
  ch: "鎖編み",
  chain: "鎖編み",
  "sl st": "引き抜き編み", // ※かぎ針編みの場合
  "slip stitch": "引き抜き編み", // ※かぎ針編みの場合
  ss: "引き抜き編み",

  // かぎ針の増し目・減らし目
  sc2tog: "細編み2目一度",
  dc2tog: "長編み2目一度",
  hdc2tog: "中長編み2目一度",
  tr2tog: "長々編み2目一度",

  // 特殊な編み方（かぎ針）
  fpdc: "表引き上げ長編み",
  "front post double crochet": "表引き上げ長編み",
  bpdc: "裏引き上げ長編み",
  "back post double crochet": "裏引き上げ長編み",
  fptr: "表引き上げ長々編み",
  "front post treble crochet": "表引き上げ長々編み",
  bptr: "裏引き上げ長々編み",
  "back post treble crochet": "裏引き上げ長々編み",

  // シェル・クラスター（かぎ針）
  shell: "シェル編み",
  cluster: "クラスター編み",
  picot: "ピコット",
  popcorn: "ポップコーン編み",
  bobble: "ボッブル編み",

  // ===== 棒針編み（Knitting）用語 =====

  // 基本的な編み方
  k: "表編み", // ※修正：表目 → 表編み
  knit: "表編み", // ※修正：表目 → 表編み
  p: "裏編み", // ※修正：裏目 → 裏編み
  purl: "裏編み", // ※修正：裏目 → 裏編み
  "k tbl": "表編みのねじり編み",
  "knit through back loop": "表編みのねじり編み",
  "p tbl": "裏編みのねじり編み",
  "purl through back loop": "裏編みのねじり編み",

  // 棒針の減らし目
  k2tog: "左上2目一度",
  "knit 2 together": "左上2目一度",
  p2tog: "裏編みで左上2目一度",
  "purl 2 together": "裏編みで左上2目一度",
  ssk: "右上2目一度",
  "slip, slip, knit": "右上2目一度",
  ssp: "裏側で右上2目一度",
  "slip, slip, purl": "裏側で右上2目一度",
  cdd: "中上3目一度",
  "centered double decrease": "中上3目一度",

  // 棒針の増し目
  m1: "増し目",
  "make one": "増し目",
  m1l: "左上の増し目",
  "make one left": "左上の増し目",
  m1r: "右上の増し目",
  "make one right": "右上の増し目",
  kfb: "表編みの前後で編む増し目",
  "knit front and back": "表編みの前後で編む増し目",
  pfb: "裏編みの前後で編む増し目",
  "purl front and back": "裏編みの前後で編む増し目",

  // 棒針の特殊技法
  sl: "すべり目", // ※修正：引き抜き編み → すべり目（棒針編みの場合）
  slip: "すべり目", // ※修正：引き抜き編み → すべり目（棒針編みの場合）
  psso: "すべり目をかぶせる",
  "pass slipped stitch over": "すべり目をかぶせる",
  skp: "すべり目・表編み・かぶせ目",
  "slip, knit, pass over": "すべり目・表編み・かぶせ目",
  tbl: "ねじり目",
  "through back loop": "ねじり目",
  ds: "DS（ダブルステッチ）",
  "double stitch": "DS（ダブルステッチ）",

  // 作り目・伏せ止め
  co: "作り目",
  "cast on": "作り目",
  bo: "伏せ目", // ※修正：伏せ止め → 伏せ目
  "bind off": "伏せ目", // ※修正：伏せ止め → 伏せ目
  ltco: "長い尾の作り目",
  "long-tail cast on": "長い尾の作り目",
  "estonian co": "エストニア式作り目",
  "estonian cast on": "エストニア式作り目",
  "provisional co": "仮の作り目",
  "provisional cast on": "仮の作り目",

  // 編み方・模様（棒針）
  "garter st": "ガーター編み",
  "garter stitch": "ガーター編み",
  stockinette: "メリヤス編み",
  "stockinette stitch": "メリヤス編み",
  "seed stitch": "鹿の子編み",
  ribbing: "ゴム編み",
  cable: "交差編み・縄編み",
  "drop st": "落とし目",
  "drop stitch": "落とし目",

  // 方向・状態
  rs: "表側",
  "right side": "表側",
  ws: "裏側",
  "wrong side": "裏側",
  "work even": "増減なしで編む",
  cont: "続けて編む",
  continue: "続けて編む",
  patt: "模様・模様通りに編む",
  pattern: "模様・模様通りに編む",

  // マーカー
  pm: "マーカーを置く",
  "place marker": "マーカーを置く",
  sm: "マーカーを移動させる",
  "slip marker": "マーカーを移動させる",
  slm: "マーカーを滑らせる",
  rm: "マーカーを外す",
  "remove marker": "マーカーを外す",

  // ===== 共通用語（かぎ針・棒針両方） =====

  // 増し目・減らし目（共通）
  inc: "増し目",
  increase: "増し目",
  dec: "減らし目",
  decrease: "減らし目",

  // 方向・場所（共通）
  rnd: "ラウンド",
  round: "ラウンド",
  row: "段",
  st: "目",
  stitch: "目",
  sts: "目",
  stitches: "目",
  sp: "間",
  space: "間",
  "ch-sp": "鎖の間",
  "ch sp": "鎖の間",
  blo: "裏山のみ",
  "back loop only": "裏山のみ",
  flo: "表山のみ",
  "front loop only": "表山のみ",

  // 繰り返し・その他（共通）
  rep: "繰り返し",
  repeat: "繰り返し",
  around: "周りに",
  join: "つなぐ",
  turn: "返す",
  "fasten off": "糸を切る",
  "finish off": "糸を切る",
  yo: "掛け目", // ※修正：かけ目 → 掛け目
  "yarn over": "掛け目", // ※修正：かけ目 → 掛け目
  sk: "飛ばす",
  skip: "飛ばす",
  next: "次の",
  prev: "前の",
  previous: "前の",
  rem: "残り",
  remaining: "残り",
  beg: "始まり・最初",
  beginning: "始まり・最初",
  bor: "段の始まり（BOR）",
  "beginning of round": "段の始まり（BOR）",
  end: "終わり・最後",
  total: "合計",
  tog: "一度",
  together: "一度",

  // 数量
  times: "回",
  x: "×",

  // 括弧・記号の説明
  "()": "（）内を繰り返す",
  "[]": "［］内を繰り返す",
  "{}": "｛｝内を繰り返す",
  "*": "※印まで繰り返す",
  "**": "※※印まで繰り返す",
};

// 他のファイルから使用できるようにエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = KNITTING_DICTIONARY;
} else if (typeof window !== "undefined") {
  window.KNITTING_DICTIONARY = KNITTING_DICTIONARY;
}
