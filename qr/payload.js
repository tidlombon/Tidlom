// สร้างข้อความที่จะฝังใน QR ตามชนิดข้อมูล (ฟังก์ชันล้วน ทดสอบได้)

const wifiEscape = (s) => s.replace(/([\;,:"])/g, '\\$1');

export function buildPayload(type, f) {
  switch (type) {
    case 'text':
      return (f.text || '').trim();
    case 'url': {
      const u = (f.url || '').trim();
      if (!u) return '';
      return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u;
    }
    case 'wifi': {
      if (!f.ssid) return '';
      const enc = f.enc || 'WPA';
      const pass = enc === 'nopass' ? '' : wifiEscape(f.pass || '');
      return `WIFI:T:${enc};S:${wifiEscape(f.ssid)};P:${pass};${f.hidden ? 'H:true;' : ''};`;
    }
    case 'phone': {
      const p = (f.phone || '').replace(/[^\d+]/g, '');
      return p ? 'tel:' + p : '';
    }
    case 'email': {
      const to = (f.to || '').trim();
      if (!to) return '';
      const q = [];
      if (f.subject) q.push('subject=' + encodeURIComponent(f.subject));
      if (f.body) q.push('body=' + encodeURIComponent(f.body));
      return 'mailto:' + to + (q.length ? '?' + q.join('&') : '');
    }
    default:
      return '';
  }
}
