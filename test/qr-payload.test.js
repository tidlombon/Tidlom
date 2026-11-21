import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload } from '../qr/payload.js';

test('url เติม https ให้อัตโนมัติ', () => {
  assert.equal(buildPayload('url', { url: ' example.com ' }), 'https://example.com');
  assert.equal(buildPayload('url', { url: 'http://a.b' }), 'http://a.b');
  assert.equal(buildPayload('url', { url: '' }), '');
});

test('wifi escape อักขระพิเศษ', () => {
  assert.equal(
    buildPayload('wifi', { ssid: 'a;b', pass: 'p:w,"x', enc: 'WPA' }),
    'WIFI:T:WPA;S:a\\;b;P:p\\:w\\,\\"x;;',
  );
  assert.equal(buildPayload('wifi', { ssid: 'x', enc: 'nopass', pass: 'ignored', hidden: true }), 'WIFI:T:nopass;S:x;P:;H:true;;');
});

test('phone และ email', () => {
  assert.equal(buildPayload('phone', { phone: '081-234 5678' }), 'tel:0812345678');
  assert.equal(buildPayload('email', { to: 'a@b.c', subject: 'สวัสดี' }), 'mailto:a@b.c?subject=%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B5');
});
