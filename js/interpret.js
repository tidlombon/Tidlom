// ส่วนตีความด้วย AI: สร้างพรอมต์จากผลเสี่ยงทาย และแปลงคำตอบเป็น HTML อย่างปลอดภัย
// ไม่แตะ DOM เพื่อให้ทดสอบด้วย node ได้
import { resolve, readingGuide, hexagram, lineLabel, LINE_NAMES } from './divination.js';

const RULES = `คุณคือผู้ตีความอี้จิง (易經) ที่อ่านตัวบทโจวอี้ได้ลึก และอธิบายเป็นภาษาไทยที่คนทั่วไปเข้าใจ

หลักการตอบ
- ตอบเป็นภาษาไทย ใช้ภาษาพูดที่สุภาพ เป็นกันเอง
- ยึดตัวบทที่ให้มา อ้างคำจีนสั้น ๆ ได้เมื่อช่วยให้เห็นภาพ ห้ามแต่งตัวบทขึ้นเอง
- โยงภาพในตัวบทเข้ากับคำถามของผู้ถามโดยตรง ถ้าไม่มีคำถาม ให้อ่านเป็นภาพรวมของช่วงชีวิตนี้
- อี้จิงบอกแนวโน้มและท่าทีที่ควรมี ไม่ใช่คำทำนายที่ตายตัว ห้ามฟันธงตัวเลข วันที่ หรือผลลัพธ์แน่นอน
- ถ้าคำถามเกี่ยวกับสุขภาพ กฎหมาย หรือการเงินก้อนใหญ่ ให้แนะนำเพิ่มว่าควรปรึกษาผู้เชี่ยวชาญด้วย
- ห้ามใช้เครื่องหมาย em dash ใช้จุลภาค วงเล็บ หรือขึ้นประโยคใหม่แทน
- ห้ามขึ้นต้นด้วยการทวนคำถามหรือคำเกริ่น และห้ามปิดท้ายด้วยคำอวยพรหรือ "หวังว่าจะช่วยได้"`;

const FORMAT = `รูปแบบคำตอบ ใช้หัวข้อขึ้นต้นด้วย "## " ตามนี้ ความยาวรวมประมาณ 250 ถึง 450 คำ
## คำตอบสั้น
หนึ่งถึงสองประโยค ตอบตรงคำถาม
## สถานการณ์ตอนนี้
อ่านจากฉั่วต้น
## จุดที่ต้องจับตา
อ่านจากบทที่กฎจูซีชี้ให้อ่าน
## ทิศที่กำลังไป
อ่านจากฉั่วปลาย ถ้าไม่มีเส้นเปลี่ยนให้อธิบายว่าสถานการณ์ค่อนข้างนิ่ง
## สิ่งที่ทำได้
รายการขึ้นต้นด้วย "- " สองถึงสี่ข้อ เป็นการกระทำที่ทำได้จริงในสัปดาห์นี้`;

function hexBlock(h, role, hotLines = []) {
  const lines = h.yao.map((t, i) =>
    `  ${lineLabel(h.bits, i)} (${LINE_NAMES[i]})${hotLines.includes(i) ? ' [เส้นเปลี่ยน]' : ''}: ${t} | ${h.th.l[i]}`).join('\n');
  const extra = h.extra ? `\n  ${h.extra[0]}: ${h.extra[1]} | ${h.th.x}` : '';
  return `${role}: ฉั่วที่ ${h.num} ${h.n} (${h.th.name}, ${h.th.mean})
  ตรีลักษณ์บน ${h.upper.zh} ${h.upper.nature} / ล่าง ${h.lower.zh} ${h.lower.nature}
  卦辭: ${h.gc} | ${h.th.j}
  大象: ${h.dx} | ${h.th.img}
${lines}${extra}`;
}

function focusText(f, p, c) {
  const h = f.hex === 'primary' ? p : c;
  const lead = f.main ? 'หลัก' : 'รอง';
  if (f.kind === 'judgment') return `- (${lead}) คำพยากรณ์ประจำฉั่ว ${h.n}: ${h.gc}`;
  if (f.kind === 'extra') return `- (${lead}) ${h.n} ${h.extra[0]}: ${h.extra[1]}`;
  return `- (${lead}) ${h.n} ${lineLabel(h.bits, f.line)}: ${h.yao[f.line]}`;
}

// ข้อมูลผลเสี่ยงทายในรูปข้อความ ใช้ร่วมกันทั้งการตีความครั้งแรกและการถามต่อ
export function readingContext(entry) {
  const r = resolve(entry.lines);
  const p = hexagram(r.primary);
  const c = r.changed ? hexagram(r.changed) : null;
  const guide = readingGuide(r);
  const q = (entry.q || '').trim();
  return [
    `คำถามของผู้ถาม: ${q ? `"${q}"` : '(ไม่ได้ระบุ ให้อ่านเป็นภาพรวมของช่วงนี้)'}`,
    `ค่าเส้นจากล่างขึ้นบน: ${entry.lines.join(', ')} (6 และ 9 คือเส้นเปลี่ยน)`,
    hexBlock(p, 'ฉั่วต้น 本卦', r.changing),
    c ? hexBlock(c, 'ฉั่วปลาย 之卦') : 'ไม่มีเส้นเปลี่ยน จึงไม่มีฉั่วปลาย',
    `กฎการอ่านของจูซี: ${guide.note}`,
    'บทที่ต้องเน้น:',
    ...guide.focus.map((f) => focusText(f, p, c)),
  ].join('\n');
}

export function interpretPrompt(entry) {
  return `${RULES}\n\n${FORMAT}\n\nผลการเสี่ยงทาย\n${readingContext(entry)}`;
}

// บทสนทนาถามต่อ: วางกฎกับผลเสี่ยงทายไว้ในเทิร์นแรกเสมอ แล้วต่อด้วยคำตอบเดิมและคำถามใหม่
export function followupTurns(entry, interpretation, chat, question) {
  const turns = [
    { role: 'user', content: `${RULES}\n\nผลการเสี่ยงทาย\n${readingContext(entry)}\n\nช่วยตีความผลนี้ให้หน่อย` },
    { role: 'assistant', content: interpretation },
  ];
  // เก็บเฉพาะ 6 เทิร์นล่าสุดเพื่อไม่ให้พรอมต์ยาวเกิน
  for (const t of chat.slice(-6)) turns.push({ role: t.role, content: t.content });
  turns.push({ role: 'user', content: `${question}\n\nตอบสั้นกระชับ ไม่เกิน 200 คำ อิงตัวบทเดิม ไม่ต้องใช้หัวข้อ` });
  return turns;
}

const escHtml = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const inline = (s) => escHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

// แปลง markdown ชุดเล็ก (หัวข้อ ##, รายการ -, ตัวหนา) เป็น HTML โดย escape ทุกอย่างก่อน
export function renderAnswer(text) {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; } };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    const item = line.match(/^[-*•]\s+(.*)$/);
    if (!line) { flushPara(); flushList(); } else if (heading) {
      flushPara(); flushList(); out.push(`<h4>${inline(heading[1])}</h4>`);
    } else if (item) {
      flushPara(); (list ||= []).push(item[1]);
    } else {
      flushList(); para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join('');
}

// ข้อความสำหรับผู้ใช้ตาม error code ของ sample
export function errorCopy(code) {
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return 'ยังไม่ได้อนุญาตให้หน้านี้ใช้ Claude จึงตีความด้วย AI ไม่ได้ในตอนนี้ ตัวบทและคำอธิบายด้านบนยังอ่านได้ตามปกติ';
    case 'rate_limited':
      return 'ใช้งาน Claude ถี่เกินไปหรือถึงโควตาแล้ว รอสักพักแล้วกดใหม่';
    case 'session_expired':
      return 'การเข้าสู่ระบบหมดอายุ เข้าสู่ระบบ claude.ai ใหม่แล้วลองอีกครั้ง';
    case 'refused':
      return 'Claude ไม่ตอบคำถามนี้ ลองปรับถ้อยคำของคำถามแล้วเสี่ยงใหม่';
    case 'prompt_too_large':
      return 'บทสนทนายาวเกินไป ลองเริ่มถามต่อใหม่ด้วยคำถามที่สั้นลง';
    default:
      return 'การเชื่อมต่อขัดข้อง คำตอบอาจไม่ครบ กดลองอีกครั้งได้';
  }
}

export const PERMANENT_ERRORS = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);
