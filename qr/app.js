import qrcode from './vendor/qrcode.mjs';
import { stringToBytes } from './vendor/utf8.mjs';
import { buildPayload } from './payload.js';

qrcode.stringToBytes = stringToBytes; // รองรับภาษาไทย/อีโมจิ (UTF-8)

const $ = (id) => document.getElementById(id);
let type = 'url';
let current = null; // { svg, qr, opts }

const fields = () => ({
  text: $('text').value, url: $('url').value,
  ssid: $('ssid').value, pass: $('pass').value, enc: $('enc').value, hidden: $('hidden').checked,
  phone: $('phone').value,
  to: $('to').value, subject: $('subject').value, body: $('body').value,
});

function setButtons(on) {
  for (const id of ['dl-png', 'dl-svg', 'copy']) $(id).disabled = !on;
}

function render() {
  const data = buildPayload(type, fields());
  const preview = $('preview');
  if (!data) {
    preview.innerHTML = '';
    $('msg').textContent = 'พิมพ์ข้อมูลเพื่อสร้าง QR';
    current = null;
    setButtons(false);
    return;
  }
  const qr = qrcode(0, $('ecc').value);
  qr.addData(data, 'Byte');
  try {
    qr.make();
  } catch {
    preview.innerHTML = '';
    $('msg').textContent = 'ข้อมูลยาวเกินไปสำหรับ QR ลองตัดให้สั้นลงหรือลดระดับความทนต่อรอยเสียหาย';
    current = null;
    setButtons(false);
    return;
  }
  const opts = {
    fg: $('fg').value, bg: $('bg').value,
    margin: Math.max(0, Math.min(10, parseInt($('margin').value, 10) || 0)),
    size: parseInt($('size').value, 10),
  };
  const svg = toSvg(qr, opts);
  preview.innerHTML = svg;
  current = { svg, qr, opts };
  $('msg').textContent = `ขนาด ${qr.getModuleCount()}×${qr.getModuleCount()} ช่อง`;
  setButtons(true);
}

function toSvg(qr, { fg, bg, margin }) {
  const n = qr.getModuleCount();
  const total = n + margin * 2;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) path += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${bg}"/><path d="${path}" fill="${fg}"/></svg>`;
}

function toCanvas() {
  const { qr, opts } = current;
  const n = qr.getModuleCount();
  const total = n + opts.margin * 2;
  const cell = Math.max(1, Math.floor(opts.size / total));
  const px = cell * total;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = opts.fg;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) ctx.fillRect((c + opts.margin) * cell, (r + opts.margin) * cell, cell, cell);
  return canvas;
}

function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const canvasBlob = () => new Promise((res) => toCanvas().toBlob(res, 'image/png'));

$('dl-png').onclick = async () => current && save(await canvasBlob(), 'qrcode.png');
$('dl-svg').onclick = () => current && save(new Blob([current.svg], { type: 'image/svg+xml' }), 'qrcode.svg');
$('copy').onclick = async () => {
  if (!current) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasBlob() })]);
    $('msg').textContent = 'คัดลอกแล้ว';
  } catch {
    $('msg').textContent = 'เบราว์เซอร์นี้คัดลอกรูปไม่ได้ ใช้ดาวน์โหลดแทน';
  }
};

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-type]');
  if (!b) return;
  type = b.dataset.type;
  for (const t of $('tabs').children) t.setAttribute('aria-selected', String(t === b));
  for (const p of document.querySelectorAll('.pane')) p.hidden = p.dataset.pane !== type;
  render();
});

document.addEventListener('input', render);
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
