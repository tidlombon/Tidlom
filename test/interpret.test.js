import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretPrompt, followupTurns, renderAnswer, errorCopy } from '../js/interpret.js';

const entry = { q: 'ควรเปิดร้านใหม่ปีนี้ไหม', lines: [7, 8, 9, 7, 8, 7] };

test('พรอมต์มีคำถาม ทั้งสองฉั่ว และบทที่กฎจูซีชี้', () => {
  const p = interpretPrompt(entry);
  assert.match(p, /ควรเปิดร้านใหม่ปีนี้ไหม/);
  assert.match(p, /ฉั่วต้น 本卦: ฉั่วที่ 30 離/);
  assert.match(p, /ฉั่วปลาย 之卦: ฉั่วที่ 21 噬嗑/);
  assert.match(p, /\(หลัก\) 離 九三: 日昃之離/);
  assert.match(p, /九三 \(เส้นที่ 3\) \[เส้นเปลี่ยน\]/);
  assert.ok(!p.includes('—'));
});

test('ไม่มีเส้นเปลี่ยนและไม่มีคำถาม', () => {
  const p = interpretPrompt({ q: '', lines: [7, 7, 7, 7, 7, 7] });
  assert.match(p, /ไม่ได้ระบุ/);
  assert.match(p, /ไม่มีฉั่วปลาย/);
  assert.match(p, /用九/);
});

test('บทสนทนาถามต่อเริ่มและจบด้วย user และตัดประวัติเก่า', () => {
  const chat = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  const turns = followupTurns(entry, 'คำตีความเดิม', chat, 'ถามต่อ');
  assert.equal(turns[0].role, 'user');
  assert.equal(turns.at(-1).role, 'user');
  assert.match(turns.at(-1).content, /^ถามต่อ/);
  assert.equal(turns.length, 2 + 6 + 1);
  assert.equal(turns[2].content, 'm4');
});

test('renderAnswer escape HTML และแปลงหัวข้อ รายการ ตัวหนา', () => {
  const html = renderAnswer('## คำตอบสั้น\nไปได้ <script>x</script>\n\n- ข้อ **หนึ่ง**\n- ข้อสอง');
  assert.equal(html, '<h4>คำตอบสั้น</h4><p>ไปได้ &lt;script&gt;x&lt;/script&gt;</p><ul><li>ข้อ <strong>หนึ่ง</strong></li><li>ข้อสอง</li></ul>');
});

test('errorCopy มีข้อความทุกกรณี', () => {
  for (const c of ['not_granted', 'rate_limited', 'refused', 'upstream_error', 'unknown_code']) assert.ok(errorCopy(c).length > 10);
});
