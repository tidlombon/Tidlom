import test from 'node:test';
import assert from 'node:assert/strict';
import { ZHOUYI } from '../js/data/zhouyi.js';
import { TH } from '../js/data/th.js';
import {
  castCoinLine, castYarrowLine, resolve, readingGuide, hexagram, lineLabel, TRIGRAMS,
} from '../js/divination.js';

// ตรีลักษณ์บน/ล่างของฉั่วลำดับพระเจ้าเหวิน ใช้ตรวจข้อมูลแยกจากไฟล์ข้อมูล
const KING_WEN = '乾乾 坤坤 坎震 艮坎 坎乾 乾坎 坤坎 坎坤 巽乾 乾兌 坤乾 乾坤 乾離 離乾 坤艮 震坤 兌震 艮巽 坤兌 巽坤 離震 艮離 艮坤 坤震 乾震 艮乾 艮震 兌巽 坎坎 離離 兌艮 震巽 乾艮 震乾 離坤 坤離 巽離 離兌 坎艮 震坎 艮兌 巽震 兌乾 乾巽 兌坤 坤巽 兌坎 坎巽 兌離 離巽 震震 艮艮 巽艮 震兌 震離 離艮 巽巽 兌兌 巽坎 坎兌 巽兌 震艮 坎離 離坎'.split(' ');

test('ข้อมูลครบ 64 ฉั่ว ไม่ซ้ำ และตรีลักษณ์ตรงลำดับพระเจ้าเหวิน', () => {
  assert.equal(ZHOUYI.length, 64);
  assert.equal(TH.length, 64);
  assert.equal(new Set(ZHOUYI.map((h) => h.bits)).size, 64);
  ZHOUYI.forEach((h, i) => {
    const h2 = hexagram(i + 1);
    assert.equal(h2.upper.zh + h2.lower.zh, KING_WEN[i], `ฉั่วที่ ${i + 1}`);
  });
});

test('ทุกฉั่วมีบทครบทั้งจีนและไทย', () => {
  ZHOUYI.forEach((h, i) => {
    const t = TH[i];
    assert.equal(h.yao.length, 6, `จีน ฉั่วที่ ${i + 1}`);
    assert.equal(t.l.length, 6, `ไทย ฉั่วที่ ${i + 1}`);
    for (const s of [t.name, t.mean, t.j, t.img, ...t.l]) assert.ok(s && s.length > 0);
    assert.ok(!/—/.test(JSON.stringify(t)), `ห้าม em dash ฉั่วที่ ${i + 1}`);
  });
  assert.ok(ZHOUYI[0].extra && TH[0].x);
  assert.ok(ZHOUYI[1].extra && TH[1].x);
});

test('ชื่อเส้นแบบจีนตรงกับหยินหยาง', () => {
  assert.equal(lineLabel('111111', 0), '初九');
  assert.equal(lineLabel('000000', 5), '上六');
  assert.equal(lineLabel('100010', 1), '六二');
});

test('ก้านหญ้าได้ค่า 6 ถึง 9 และสัดส่วนใกล้ 1:5:7:3', () => {
  const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
  let seed = 12345;
  const rng = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const N = 40000;
  for (let i = 0; i < N; i++) counts[castYarrowLine(rng).value]++;
  const expect = { 6: 1 / 16, 7: 5 / 16, 8: 7 / 16, 9: 3 / 16 };
  for (const v of [6, 7, 8, 9]) {
    assert.ok(Math.abs(counts[v] / N - expect[v]) < 0.03, `ค่า ${v}: ${counts[v] / N}`);
  }
});

test('เหรียญได้ค่า 6 ถึง 9', () => {
  for (let i = 0; i < 200; i++) {
    const { value, coins } = castCoinLine();
    assert.ok(value >= 6 && value <= 9);
    assert.equal(coins.length, 3);
  }
});

test('resolve หาฉั่วต้นและฉั่วปลายถูก', () => {
  // เฉียนทั้งหมด ไม่มีเส้นเปลี่ยน
  assert.deepEqual(resolve([7, 7, 7, 7, 7, 7]), { lines: [7, 7, 7, 7, 7, 7], primary: 1, changed: null, changing: [] });
  // เฉียน เส้นล่างเปลี่ยน ได้โก้ว (44)
  const r = resolve([9, 7, 7, 7, 7, 7]);
  assert.equal(r.primary, 1);
  assert.equal(r.changed, 44);
  // คุนเปลี่ยนหมดเป็นเฉียน
  assert.equal(resolve([6, 6, 6, 6, 6, 6]).changed, 1);
  // ไท่ (11) กับ ผี่ (12)
  assert.equal(resolve([7, 7, 7, 8, 8, 8]).primary, 11);
  assert.equal(resolve([8, 8, 8, 7, 7, 7]).primary, 12);
  assert.throws(() => resolve([7, 7, 7]));
});

test('readingGuide ตามกฎจูซี', () => {
  const g = (lines) => readingGuide(resolve(lines));
  assert.deepEqual(g([7, 8, 7, 8, 7, 8]).focus, [{ hex: 'primary', kind: 'judgment', main: true }]);
  assert.deepEqual(g([7, 8, 9, 8, 7, 8]).focus, [{ hex: 'primary', kind: 'line', line: 2, main: true }]);
  assert.equal(g([9, 8, 7, 6, 7, 8]).focus[0].line, 3);
  assert.equal(g([9, 6, 9, 8, 7, 8]).focus[0].kind, 'judgment');
  assert.deepEqual(g([9, 6, 9, 6, 7, 8]).focus.map((f) => [f.hex, f.line]), [['changed', 4], ['changed', 5]]);
  assert.deepEqual(g([9, 6, 9, 6, 9, 8]).focus[0], { hex: 'changed', kind: 'line', line: 5, main: true });
  assert.equal(g([9, 9, 9, 9, 9, 9]).focus[0].kind, 'extra');
  assert.deepEqual(g([9, 6, 9, 6, 9, 6]).focus[0], { hex: 'changed', kind: 'judgment', main: true });
});

test('ตรีลักษณ์ครบ 8', () => {
  assert.equal(Object.keys(TRIGRAMS).length, 8);
});
