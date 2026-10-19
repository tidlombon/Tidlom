import {
  castCoinLine, castYarrowLine, resolve, readingGuide, hexagram, lineLabel,
  isChanging, isYang, LINE_NAMES, OLD_YIN, YOUNG_YANG, YOUNG_YIN, OLD_YANG,
} from './divination.js';

const $ = (sel) => document.querySelector(sel);
const HISTORY_KEY = 'tidlom-iching-history';
const VALUE_TEXT = {
  [OLD_YIN]: '6 หยินแก่ (เปลี่ยน)',
  [YOUNG_YANG]: '7 หยางหนุ่ม',
  [YOUNG_YIN]: '8 หยินหนุ่ม',
  [OLD_YANG]: '9 หยางแก่ (เปลี่ยน)',
};
const SAMPLE = { q: 'ถ้าย้ายงานช่วงนี้ จะเป็นอย่างไร', lines: [7, 8, 9, 7, 8, 7], method: 'coin', t: null };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- เก็บประวัติ ----------
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100))); } catch { /* ไม่มีที่เก็บก็ใช้งานต่อได้ */ }
}

// ---------- วาดฉั่ว ----------
function hexRows(lines, freshIndex = -1) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const v = lines[i];
    if (v === undefined) { rows.push('<div class="hl empty"><i></i></div>'); continue; }
    const cls = ['hl', isChanging(v) ? 'changing' : '', i === freshIndex ? 'fresh' : ''].join(' ');
    const bars = isYang(v) ? '<i></i>' : '<i></i><i></i>';
    const mark = v === OLD_YANG ? '<span class="mark" title="หยางแก่">○</span>' : v === OLD_YIN ? '<span class="mark" title="หยินแก่">×</span>' : '';
    rows.push(`<div class="${cls}">${bars}${mark}</div>`);
  }
  return rows.join('');
}
function drawHex(lines, size = '') {
  return `<div class="hexdraw ${size}" aria-hidden="true">${hexRows(lines)}</div>`;
}
const bitsToLines = (bits) => [...bits].map((b) => (b === '1' ? YOUNG_YANG : YOUNG_YIN));

function hexCard(h, role, lines) {
  return `<div class="hexcard">
    ${drawHex(lines || bitsToLines(h.bits))}
    <div class="hexmeta">
      <span class="role">${role}</span>
      <span class="han">${h.n}<sup>${h.num}</sup></span>
      <span class="thname">${h.th.name} · ${h.th.mean}</span>
      <span class="tri">บน ${h.upper.sym} ${h.upper.nature} / ล่าง ${h.lower.sym} ${h.lower.nature}</span>
    </div>
  </div>`;
}

function passage(h, f) {
  const cls = f.main ? 'passage' : 'passage secondary';
  if (f.kind === 'judgment') {
    return `<div class="${cls}"><span class="where">คำพยากรณ์ประจำฉั่ว ${h.n} (卦辭)</span>
      <span class="zh">${h.n}：${h.gc}</span><span class="th">${h.th.j}</span></div>`;
  }
  if (f.kind === 'extra') {
    return `<div class="${cls}"><span class="where">บทพิเศษของฉั่ว ${h.n}</span>
      <span class="zh">${h.extra[0]}：${h.extra[1]}</span><span class="th">${h.th.x}</span></div>`;
  }
  return `<div class="${cls}"><span class="where">ฉั่ว ${h.n} ${LINE_NAMES[f.line]}</span>
    <span class="zh">${lineLabel(h.bits, f.line)}：${h.yao[f.line]}</span><span class="th">${h.th.l[f.line]}</span></div>`;
}

function fullText(h, hot = []) {
  const items = h.yao.map((t, i) => `<li class="${hot.includes(i) ? 'hot' : ''}">
      <span class="lab">${lineLabel(h.bits, i)}</span>
      <div><div class="zh">${t}</div><div class="th">${h.th.l[i]}</div></div></li>`).join('');
  const extra = h.extra ? `<div class="passage"><span class="where">บทพิเศษ</span>
      <span class="zh">${h.extra[0]}：${h.extra[1]}</span><span class="th">${h.th.x}</span></div>` : '';
  return `<div class="fulltext">
    <div class="passage"><span class="where">คำพยากรณ์ประจำฉั่ว (卦辭)</span><span class="zh">${h.n}：${h.gc}</span><span class="th">${h.th.j}</span></div>
    <div class="passage"><span class="where">ภาพใหญ่ (大象)</span><span class="zh">${h.dx}</span><span class="th">${h.th.img}</span></div>
    <ol class="lines" aria-label="คำพยากรณ์รายเส้น จากล่างขึ้นบน">${items}</ol>
    ${extra}
  </div>`;
}

// ---------- แสดงผลการเสี่ยงทาย ----------
function renderReading(entry, { sample = false } = {}) {
  const r = resolve(entry.lines);
  const p = hexagram(r.primary);
  const c = r.changed ? hexagram(r.changed) : null;
  const guide = readingGuide(r);
  const passages = guide.focus.map((f) => passage(f.hex === 'primary' ? p : c, f)).join('');
  const when = entry.t ? new Date(entry.t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const method = { coin: 'เหรียญ', yarrow: 'ก้านหญ้า', manual: 'กรอกเอง' }[entry.method] || '';

  $('#result').innerHTML = `
    ${sample ? '<span class="sample-tag">ตัวอย่างการอ่าน</span>' : ''}
    <p class="question">${esc(entry.q || 'ไม่ได้ระบุคำถาม')}<small>${[method, when].filter(Boolean).join(' · ')}</small></p>
    ${entry.repeat ? '<p class="warn">คุณเพิ่งถามเรื่องนี้ไปเมื่อไม่นาน ฉั่วเหมิง (蒙) เตือนไว้ว่า 初筮告，再三瀆 ถามครั้งแรกได้คำตอบ ถามซ้ำคือไม่เคารพ ลองอ่านคำตอบแรกให้ลึกก่อน</p>' : ''}
    <div class="pair">
      ${hexCard(p, 'ฉั่วต้น 本卦 สถานการณ์ตอนนี้', entry.lines)}
      ${c ? `<span class="arrow" aria-hidden="true">→</span>${hexCard(c, 'ฉั่วปลาย 之卦 ทิศที่กำลังไป')}` : ''}
    </div>
    <div class="guide">
      <p class="guide-note">${guide.note}</p>
      ${passages}
    </div>
    <details class="full"><summary>ตัวบทเต็มของ ${p.n} ${p.th.name}</summary>${fullText(p, r.changing)}</details>
    ${c ? `<details class="full"><summary>ตัวบทเต็มของ ${c.n} ${c.th.name}</summary>${fullText(c)}</details>` : ''}
  `;
}

// ---------- ขั้นตอนเสี่ยงทาย ----------
let session = null;

function method() {
  return document.querySelector('input[name="method"]:checked').value;
}

function renderBuild(fresh = -1) {
  $('#build').innerHTML = hexRows(session.lines, fresh);
  const n = session.lines.length;
  $('#cast-status').textContent = n < 6 ? `ได้ ${n} จาก 6 เส้น` : 'ครบ 6 เส้นแล้ว';
  $('#cast-next').textContent = session.method === 'yarrow' ? `แบ่งก้านหญ้า ${LINE_NAMES[n] || ''}` : `โยนเหรียญ ${LINE_NAMES[n] || ''}`;
}

function castOne() {
  const n = session.lines.length;
  if (n >= 6) return;
  if (session.method === 'yarrow') {
    const { value, rounds } = castYarrowLine();
    session.lines.push(value);
    $('#cast-detail').innerHTML = rounds.map((r, i) =>
      `<span>รอบ ${i + 1}: ${r.stalks} ก้าน แบ่งเป็น ${r.left} กับ ${r.right} เหลือนับออก ${r.removed}</span>`).join('')
      + `<span>เหลือ ${value * 4} ก้าน หาร 4 ได้ <b>${VALUE_TEXT[value]}</b></span>`;
  } else {
    const { value, coins } = castCoinLine();
    session.lines.push(value);
    $('#cast-detail').innerHTML = `<div class="coins">${coins.map((c) =>
      `<span class="coin ${c === 3 ? 'h' : ''}">${c === 3 ? 'หัว' : 'ก้อย'}</span>`).join('')}</div>
      <span>${coins.join(' + ')} = <b>${VALUE_TEXT[value]}</b></span>`;
  }
  renderBuild(n);
  if (session.lines.length === 6) finish();
}

function finish() {
  const history = loadHistory();
  const key = session.q.trim();
  const repeat = key && history.some((h) => h.q.trim() === key && Date.now() - h.t < 24 * 3600e3);
  const entry = { q: session.q, lines: session.lines, method: session.method, t: Date.now(), repeat };
  saveHistory([entry, ...history]);
  $('#cast-next').hidden = true;
  $('#cast-all').hidden = true;
  renderReading(entry);
  renderHistory();
  $('#result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function start(e) {
  e.preventDefault();
  session = { q: $('#question').value, method: method(), lines: [] };
  if (session.method === 'manual') {
    session.lines = [...document.querySelectorAll('#manual-rows select')].map((s) => Number(s.value));
    $('#casting').hidden = true;
    finish();
    return;
  }
  $('#result').innerHTML = '';
  $('#casting').hidden = false;
  $('#cast-next').hidden = false;
  $('#cast-all').hidden = false;
  $('#cast-detail').innerHTML = '<span>ตั้งจิตถึงคำถาม แล้วกดทีละเส้น เส้นแรกคือเส้นล่างสุด</span>';
  renderBuild();
  $('#cast-next').focus();
}

function buildManual() {
  $('#manual-rows').innerHTML = LINE_NAMES.map((name, i) => `<label class="manual-row"><span>${name}</span>
    <select id="manual-${i}">${[OLD_YIN, YOUNG_YANG, YOUNG_YIN, OLD_YANG].map((v) =>
      `<option value="${v}" ${v === YOUNG_YANG ? 'selected' : ''}>${VALUE_TEXT[v]}</option>`).join('')}</select></label>`).join('');
}

// ---------- คัมภีร์ ----------
function renderBook() {
  const cells = [];
  for (let n = 1; n <= 64; n++) {
    const h = hexagram(n);
    cells.push(`<button type="button" class="book-cell" data-n="${n}" aria-pressed="false">
      <span class="n">${n}</span>${drawHex(bitsToLines(h.bits), 'small')}
      <span class="han">${h.n}</span><span class="thname">${h.th.name}</span></button>`);
  }
  $('#book-grid').innerHTML = cells.join('');
}

function openBook(n) {
  const h = hexagram(n);
  document.querySelectorAll('.book-cell').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.n) === n)));
  $('#book-detail').innerHTML = `${hexCard(h, `ฉั่วที่ ${n}`)}${fullText(h)}`;
  $('#book-detail').scrollIntoView({ block: 'start' });
}

// ---------- ประวัติ ----------
function renderHistory() {
  const list = loadHistory();
  $('#history-clear').hidden = list.length === 0;
  if (!list.length) {
    $('#history-list').innerHTML = '<li class="empty-note">ยังไม่มีประวัติ เสี่ยงทายครั้งแรกแล้วผลจะมาอยู่ที่นี่</li>';
    return;
  }
  $('#history-list').innerHTML = list.map((e, i) => {
    const r = resolve(e.lines);
    const p = hexagram(r.primary);
    const c = r.changed ? hexagram(r.changed) : null;
    const when = new Date(e.t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    return `<li><button type="button" class="history-item" data-i="${i}">
      ${drawHex(e.lines, 'small')}
      <span class="txt"><span class="q">${esc(e.q || 'ไม่ได้ระบุคำถาม')}</span>
      <small>${p.n} ${p.th.name}${c ? ` → ${c.n} ${c.th.name}` : ''} · ${when}</small></span></button></li>`;
  }).join('');
}

// ---------- สลับหน้า ----------
function show(view) {
  for (const v of ['cast', 'book', 'history']) {
    $(`#view-${v}`).hidden = v !== view;
    const tab = $(`#tab-${v}`);
    if (v === view) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
  }
}

function init() {
  buildManual();
  renderBook();
  renderHistory();
  renderReading(SAMPLE, { sample: true });

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
  document.querySelectorAll('input[name="method"]').forEach((r) => r.addEventListener('change', () => {
    $('#manual').hidden = method() !== 'manual';
  }));
  $('#ask').addEventListener('submit', start);
  $('#cast-next').addEventListener('click', castOne);
  $('#cast-all').addEventListener('click', () => { while (session && session.lines.length < 6) castOne(); });
  $('#book-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.book-cell');
    if (b) openBook(Number(b.dataset.n));
  });
  $('#history-list').addEventListener('click', (e) => {
    const b = e.target.closest('.history-item');
    if (!b) return;
    const entry = loadHistory()[Number(b.dataset.i)];
    show('cast');
    $('#casting').hidden = true;
    renderReading({ ...entry, repeat: false });
    $('#result').scrollIntoView({ block: 'start' });
  });
  $('#history-clear').addEventListener('click', () => { $('#history-confirm').hidden = false; });
  $('#history-no').addEventListener('click', () => { $('#history-confirm').hidden = true; });
  $('#history-yes').addEventListener('click', () => {
    saveHistory([]);
    $('#history-confirm').hidden = true;
    renderHistory();
  });
  const hash = location.hash.slice(1);
  if (['book', 'history'].includes(hash)) show(hash);
}

init();
