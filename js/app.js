import {
  castCoinLine, castYarrowLine, resolve, readingGuide, hexagram, lineLabel,
  isChanging, isYang, LINE_NAMES, OLD_YIN, YOUNG_YANG, YOUNG_YIN, OLD_YANG,
} from './divination.js';
import { interpretPrompt, followupTurns, renderAnswer, errorCopy, PERMANENT_ERRORS } from './interpret.js';

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
    ${aiPanel()}
    <details class="full"><summary>ตัวบทเต็มของ ${p.n} ${p.th.name}</summary>${fullText(p, r.changing)}</details>
    ${c ? `<details class="full"><summary>ตัวบทเต็มของ ${c.n} ${c.th.name}</summary>${fullText(c)}</details>` : ''}
  `;
  current = { entry, persisted: !sample };
  wireAI();
}

// ---------- ตีความด้วย Claude ----------
// ใช้ได้เมื่อเปิดผ่าน claude.ai ซึ่งให้ความสามารถ sample ไว้ใน window.claude
const samplePromise = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
let sampleFn;
let current = null;
let aiCtl = null;
let aiBlocked = false;

function aiPanel() {
  return `<section class="ai" aria-labelledby="ai-title">
    <div class="ai-head"><h3 id="ai-title">ตีความตามคำถามของคุณ</h3><span class="ai-badge">Claude</span></div>
    <p class="hint" id="ai-intro">Claude จะอ่านตัวบทของทั้งสองฉั่วตามกฎจูซี แล้วโยงเข้ากับคำถามของคุณ ใช้โควตา Claude ของบัญชีคุณเอง</p>
    <div class="actions">
      <button type="button" id="ai-go" class="primary" disabled>ให้ Claude ตีความ</button>
      <button type="button" id="ai-stop" class="ghost" hidden>หยุด</button>
    </div>
    <div id="ai-out" class="ai-out" aria-live="polite"></div>
    <p id="ai-note" class="ai-note" hidden></p>
    <div id="ai-chat" class="ai-chat"></div>
    <form id="ai-follow" class="ai-follow" hidden>
      <label for="ai-q" class="label">ถามต่อเกี่ยวกับผลนี้</label>
      <div class="ai-follow-row">
        <input id="ai-q" type="text" maxlength="300" placeholder="เช่น ถ้ารออีกสามเดือนจะดีกว่าไหม" autocomplete="off">
        <button type="submit" id="ai-send" class="primary">ถาม</button>
      </div>
    </form>
  </section>`;
}

function note(text) {
  $('#ai-note').hidden = !text;
  $('#ai-note').textContent = text || '';
}

function persistAI() {
  if (!current?.persisted) return;
  const list = loadHistory();
  const i = list.findIndex((h) => h.t === current.entry.t);
  if (i < 0) return;
  list[i] = { ...list[i], ai: current.entry.ai, chat: current.entry.chat };
  saveHistory(list);
  renderHistory();
}

function renderChat() {
  const chat = current.entry.chat || [];
  $('#ai-chat').innerHTML = chat.map((t) => t.role === 'user'
    ? `<p class="bubble me">${esc(t.content)}</p>`
    : `<div class="bubble ai-out">${renderAnswer(t.content)}</div>`).join('');
}

function setBusy(busy) {
  $('#ai-go').disabled = busy || aiBlocked || !sampleFn;
  $('#ai-stop').hidden = !busy;
  const send = $('#ai-send');
  if (send) send.disabled = busy || aiBlocked;
}

function handleError(e, target) {
  if (e?.code === 'cancelled') { note(e.text ? 'หยุดแล้ว คำตอบด้านบนยังไม่ครบ' : ''); return; }
  if (PERMANENT_ERRORS.has(e?.code)) aiBlocked = true;
  if (e?.code === 'refused') target.innerHTML = '';
  note(errorCopy(e?.code));
}

async function interpret() {
  const entry = current.entry;
  aiCtl = new AbortController();
  const out = $('#ai-out');
  out.innerHTML = '<p class="thinking">Claude กำลังอ่านตัวบท...</p>';
  note('');
  setBusy(true);
  try {
    const opts = { signal: aiCtl.signal, onText: ({ text: t }) => { out.innerHTML = renderAnswer(t); } };
    // กดตีความใหม่ต้องได้คำตอบใหม่ ไม่ใช่คำตอบเดิมจากแคช
    if (entry.ai) opts.cache = false;
    const { text, truncated } = await sampleFn(interpretPrompt(entry), opts);
    out.innerHTML = renderAnswer(text);
    entry.ai = text;
    entry.chat = [];
    renderChat();
    persistAI();
    if (truncated) note('คำตอบถูกตัดเพราะยาวเกิน ลองถามต่อในหัวข้อที่อยากรู้เพิ่ม');
  } catch (e) {
    out.innerHTML = e?.text ? renderAnswer(e.text) : '';
    handleError(e, out);
  } finally {
    setBusy(false);
    $('#ai-go').textContent = entry.ai ? 'ตีความใหม่' : 'ให้ Claude ตีความ';
    $('#ai-follow').hidden = !entry.ai || aiBlocked;
  }
}

async function followUp(ev) {
  ev.preventDefault();
  const entry = current.entry;
  const q = $('#ai-q').value.trim();
  if (!q || !entry.ai) return;
  const chat = entry.chat || (entry.chat = []);
  const turns = followupTurns(entry, entry.ai, chat, q);
  chat.push({ role: 'user', content: q });
  $('#ai-q').value = '';
  renderChat();
  const bubble = document.createElement('div');
  bubble.className = 'bubble ai-out';
  bubble.innerHTML = '<p class="thinking">กำลังคิด...</p>';
  $('#ai-chat').append(bubble);
  aiCtl = new AbortController();
  note('');
  setBusy(true);
  try {
    const { text } = await sampleFn(turns, {
      signal: aiCtl.signal, cache: false,
      onText: ({ text: t }) => { bubble.innerHTML = renderAnswer(t); },
    });
    chat.push({ role: 'assistant', content: text });
    persistAI();
    renderChat();
  } catch (e) {
    if (e?.text) chat.push({ role: 'assistant', content: e.text });
    else chat.pop();
    renderChat();
    if (!e?.text) $('#ai-q').value = q;
    handleError(e, bubble);
  } finally {
    setBusy(false);
    $('#ai-follow').hidden = aiBlocked;
  }
}

function wireAI() {
  const entry = current.entry;
  aiCtl?.abort();
  if (entry.ai) {
    $('#ai-out').innerHTML = renderAnswer(entry.ai);
    $('#ai-go').textContent = 'ตีความใหม่';
    $('#ai-follow').hidden = false;
    renderChat();
  }
  $('#ai-go').addEventListener('click', interpret);
  $('#ai-stop').addEventListener('click', () => aiCtl?.abort());
  $('#ai-follow').addEventListener('submit', followUp);
  const panel = $('.ai');
  samplePromise.then((fn) => {
    if (!panel.isConnected) return;
    sampleFn = fn;
    if (!fn) {
      $('#ai-go').hidden = true;
      $('#ai-follow').hidden = true;
      note(entry.ai
        ? 'คำตีความนี้บันทึกไว้ก่อนหน้า การตีความใหม่ใช้ได้เมื่อเปิดแอฟผ่านลิงก์ claude.ai'
        : 'การตีความด้วย Claude ใช้ได้เมื่อเปิดแอฟผ่านลิงก์ claude.ai ส่วนตัวบทและคำอธิบายด้านบนใช้ได้ทุกที่');
      return;
    }
    if (aiBlocked) note(errorCopy('not_granted'));
    setBusy(false);
  });
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
      <small>${p.n} ${p.th.name}${c ? ` → ${c.n} ${c.th.name}` : ''} · ${when}</small></span>
      ${e.ai ? '<span class="ai-mark">มีคำตีความ</span>' : ''}</button></li>`;
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
