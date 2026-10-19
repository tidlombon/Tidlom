// ตรรกะการเสี่ยงทายล้วน ๆ ไม่แตะ DOM เพื่อให้ทดสอบด้วย node ได้
import { ZHOUYI } from './data/zhouyi.js';
import { TH } from './data/th.js';

// ค่าเส้นตามธรรมเนียม: 6 หยินแก่ (เปลี่ยน), 7 หยางหนุ่ม, 8 หยินหนุ่ม, 9 หยางแก่ (เปลี่ยน)
export const OLD_YIN = 6;
export const YOUNG_YANG = 7;
export const YOUNG_YIN = 8;
export const OLD_YANG = 9;

export const LINE_NAMES = ['เส้นที่ 1 (ล่างสุด)', 'เส้นที่ 2', 'เส้นที่ 3', 'เส้นที่ 4', 'เส้นที่ 5', 'เส้นที่ 6 (บนสุด)'];

// ตรีลักษณ์ เขียนเส้นจากล่างขึ้นบน
export const TRIGRAMS = {
  '111': { zh: '乾', sym: '☰', th: 'เฉียน', nature: 'ฟ้า', trait: 'แข็งแกร่ง' },
  '110': { zh: '兌', sym: '☱', th: 'ตุ้ย', nature: 'บึง', trait: 'ยินดี' },
  '101': { zh: '離', sym: '☲', th: 'หลี', nature: 'ไฟ', trait: 'สว่าง เกาะติด' },
  '100': { zh: '震', sym: '☳', th: 'เจิ้น', nature: 'ฟ้าร้อง', trait: 'เคลื่อนไหว' },
  '011': { zh: '巽', sym: '☴', th: 'ซวิ่น', nature: 'ลม/ไม้', trait: 'แทรกซึม' },
  '010': { zh: '坎', sym: '☵', th: 'ขั่น', nature: 'น้ำ', trait: 'อันตราย ลึก' },
  '001': { zh: '艮', sym: '☶', th: 'เกิ้น', nature: 'ภูเขา', trait: 'หยุดนิ่ง' },
  '000': { zh: '坤', sym: '☷', th: 'คุน', nature: 'ดิน', trait: 'รองรับ' },
};

const BY_BITS = new Map(ZHOUYI.map((h, i) => [h.bits, i + 1]));

export function cryptoRandom() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

function randInt(n, rng) {
  return Math.floor(rng() * n);
}

// โยนเหรียญสามเหรียญ หัว = 3 ก้อย = 2 ผลรวมได้ 6 ถึง 9
export function castCoinLine(rng = cryptoRandom) {
  const coins = [0, 1, 2].map(() => (rng() < 0.5 ? 3 : 2));
  return { value: coins[0] + coins[1] + coins[2], coins };
}

// วิธีก้านหญ้า 大衍筮法: 49 ก้าน แบ่งสามรอบต่อหนึ่งเส้น
export function castYarrowLine(rng = cryptoRandom) {
  let stalks = 49;
  const rounds = [];
  for (let r = 0; r < 3; r++) {
    // แบ่งเป็นสองกอง กองซ้ายอย่างน้อย 1 กองขวาอย่างน้อย 2 เพราะต้องหยิบออกหนึ่งก้าน
    const left = 1 + randInt(stalks - 2, rng);
    const right = stalks - left - 1;
    const remL = left % 4 || 4;
    const remR = right % 4 || 4;
    const removed = 1 + remL + remR;
    rounds.push({ stalks, left, right: right + 1, removed });
    stalks -= removed;
  }
  return { value: stalks / 4, rounds };
}

export function isChanging(v) {
  return v === OLD_YIN || v === OLD_YANG;
}

export function isYang(v) {
  return v === YOUNG_YANG || v === OLD_YANG;
}

// รับค่าเส้น 6 ค่าเรียงจากล่างขึ้นบน คืนเลขฉั่วต้น (本卦) และฉั่วปลาย (之卦)
export function resolve(lines) {
  if (lines.length !== 6 || !lines.every((v) => v >= 6 && v <= 9)) {
    throw new Error('ต้องมีค่าเส้น 6 ค่า แต่ละค่าอยู่ระหว่าง 6 ถึง 9');
  }
  const primaryBits = lines.map((v) => (isYang(v) ? '1' : '0')).join('');
  const changedBits = lines.map((v) => (isChanging(v) ? !isYang(v) : isYang(v)) ? '1' : '0').join('');
  const changing = lines.flatMap((v, i) => (isChanging(v) ? [i] : []));
  return {
    lines: [...lines],
    primary: BY_BITS.get(primaryBits),
    changed: changing.length ? BY_BITS.get(changedBits) : null,
    changing,
  };
}

export function hexagram(num) {
  const zh = ZHOUYI[num - 1];
  const th = TH[num - 1];
  return {
    num,
    ...zh,
    th,
    lower: TRIGRAMS[zh.bits.slice(0, 3)],
    upper: TRIGRAMS[zh.bits.slice(3)],
  };
}

// กฎการอ่านตามจูซี (易學啟蒙) ว่าเส้นเปลี่ยนกี่เส้นแล้วควรอ่านบทไหน
// คืนรายการบทที่ต้องอ่าน { hex: 'primary' | 'changed', kind: 'judgment' | 'line' | 'extra', line?, main }
export function readingGuide({ primary, changing }) {
  const n = changing.length;
  const unchanged = [0, 1, 2, 3, 4, 5].filter((i) => !changing.includes(i));
  switch (n) {
    case 0:
      return {
        note: 'ไม่มีเส้นเปลี่ยน อ่านคำพยากรณ์ประจำฉั่วต้น',
        focus: [{ hex: 'primary', kind: 'judgment', main: true }],
      };
    case 1:
      return {
        note: 'เส้นเปลี่ยน 1 เส้น อ่านคำพยากรณ์ของเส้นนั้นในฉั่วต้น',
        focus: [{ hex: 'primary', kind: 'line', line: changing[0], main: true }],
      };
    case 2:
      return {
        note: 'เส้นเปลี่ยน 2 เส้น อ่านทั้งสองเส้นในฉั่วต้น ถือเส้นบนเป็นหลัก',
        focus: [
          { hex: 'primary', kind: 'line', line: changing[1], main: true },
          { hex: 'primary', kind: 'line', line: changing[0], main: false },
        ],
      };
    case 3:
      return {
        note: 'เส้นเปลี่ยน 3 เส้น อ่านคำพยากรณ์ของทั้งสองฉั่ว ถือฉั่วต้นเป็นหลัก',
        focus: [
          { hex: 'primary', kind: 'judgment', main: true },
          { hex: 'changed', kind: 'judgment', main: false },
        ],
      };
    case 4:
      return {
        note: 'เส้นเปลี่ยน 4 เส้น อ่านสองเส้นที่ไม่เปลี่ยนในฉั่วปลาย ถือเส้นล่างเป็นหลัก',
        focus: [
          { hex: 'changed', kind: 'line', line: unchanged[0], main: true },
          { hex: 'changed', kind: 'line', line: unchanged[1], main: false },
        ],
      };
    case 5:
      return {
        note: 'เส้นเปลี่ยน 5 เส้น อ่านเส้นเดียวที่ไม่เปลี่ยนในฉั่วปลาย',
        focus: [{ hex: 'changed', kind: 'line', line: unchanged[0], main: true }],
      };
    default:
      if (primary === 1 || primary === 2) {
        return {
          note: `เปลี่ยนครบ 6 เส้นในฉั่ว${primary === 1 ? 'เฉียน' : 'คุน'} อ่านบท${primary === 1 ? '用九' : '用六'}`,
          focus: [{ hex: 'primary', kind: 'extra', main: true }],
        };
      }
      return {
        note: 'เปลี่ยนครบ 6 เส้น อ่านคำพยากรณ์ประจำฉั่วปลาย',
        focus: [{ hex: 'changed', kind: 'judgment', main: true }],
      };
  }
}

export function lineLabel(bits, index) {
  const num = bits[index] === '1' ? '九' : '六';
  const pos = ['初', '二', '三', '四', '五', '上'][index];
  return index === 0 || index === 5 ? pos + num : num + pos;
}
