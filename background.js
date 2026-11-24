/* =============================================================================
   background.js — Service worker (Manifest V3) chạy ngầm trên Chrome.
   • Đọc danh sách trang web do NGƯỜI DÙNG TỰ CHỌN từ policy.blocked (mặc định Facebook & TikTok).
   • Đo phút dùng THẬT (tab đang mở + cửa sổ đang focus + không idle), mỗi 1 phút.
   • Khóa (chuyển hướng) tất cả trang web đã chọn bằng declarativeNetRequest khi:
       - hết giới hạn thời gian màn hình trong ngày, hoặc
       - trong 8 tiếng giờ ngủ người chơi tự chọn (bed → wake), trừ khi đã phá khóa đêm đó.
   • Luôn giữ Whitelist (zalo.me / chat.zalo.me) không bao giờ bị chặn.
   ============================================================================= */
'use strict';

const DEFAULT_SITES = ['facebook.com', 'fb.com', 'messenger.com', 'tiktok.com'];
const WHITELIST = ['zalo.me', 'chat.zalo.me'];
const RULE_BASE = 100;
const DEFAULT_POLICY = {
  limit: 120, extra: 0, usedFloor: 0,
  bed: '23:00', wake: '07:00',
  brokenNight: null, slept: false, day: null, offset: 0,
  blocked: DEFAULT_SITES
};

/* ---------- tiện ích thời gian & tên miền (khớp với core/engine.js) ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hmToH = s => { const [h, m] = String(s).split(':').map(Number); return h + (m || 0) / 60; };
const dayKey = (d, p) => ymd(new Date(d.getTime() - hmToH(p.wake) * 3600e3));
const hourOf = d => d.getHours() + d.getMinutes() / 60;
const isBedtime = (h, p) => { const b = hmToH(p.bed), w = hmToH(p.wake); return b > w ? (h >= b || h < w) : (h >= b && h < w); };
const cleanDom = s => String(s || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
const sitesOf = p => {
  const raw = Array.isArray(p.blocked) ? p.blocked : DEFAULT_SITES;
  return [...new Set(raw.map(cleanDom).filter(d => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) && !WHITELIST.some(w => d === w || d.endsWith('.' + w))))];
};
const siteOf = (url, sites) => {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (WHITELIST.some(w => h === w || h.endsWith('.' + w))) return null;
    return sites.find(s => h === s || h.endsWith('.' + s)) || null;
  } catch (e) { return null; }
};
const lockPath = (site, reason) => `/module-suc-khoe/health.html?blocked=${encodeURIComponent(site)}&reason=${reason}#${reason === 'bed' ? 'sleep' : 'tasks'}`;

async function getState() {
  const r = await chrome.storage.local.get(['policy', 'usage', 'notified']);
  return { policy: { ...DEFAULT_POLICY, ...(r.policy || {}) }, usage: r.usage || null, notified: r.notified || {} };
}
const nowOf = p => new Date(Date.now() + (p.offset || 0));

/* ---------- 1) đo phút sử dụng thật trên các trang đã chọn ---------- */
async function track() {
  const { policy, usage } = await getState();
  const sites = sitesOf(policy);
  const day = dayKey(nowOf(policy), policy);
  const u = usage && usage.day === day ? usage : { day, minutes: 0, sites: {} };
  try {
    if (sites.length && await chrome.idle.queryState(60) === 'active') {
      const win = await chrome.windows.getLastFocused();
      if (win && win.focused) {
        const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
        const s = tab && tab.url && siteOf(tab.url, sites);
        if (s) { u.minutes += 1; u.sites[s] = (u.sites[s] || 0) + 1; }
      }
    }
  } catch (e) { /* bỏ qua khi không có cửa sổ focus */ }
  await chrome.storage.local.set({ usage: u });
}

/* ---------- 2) quyết định khóa & áp dụng quy tắc chặn động ---------- */
let lastSig = null;
async function applyRules(reason, sites) {
  const addRules = (reason && sites.length) ? sites.map((s, i) => ({
    id: RULE_BASE + i, priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: lockPath(s, reason) } },
    condition: { requestDomains: [s], resourceTypes: ['main_frame'] }
  })) : [];
  const sig = (reason || '') + '|' + sites.join(',');
  if (sig === lastSig) return; lastSig = sig;
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(r => r.id), addRules });
}
async function kickOpenTabs(reason, sites) {
  if (!sites.length) return;
  try {
    const tabs = await chrome.tabs.query({ url: sites.map(s => `*://*.${s}/*`) });
    for (const t of tabs) {
      const s = siteOf(t.url, sites);
      if (s) chrome.tabs.update(t.id, { url: chrome.runtime.getURL(lockPath(s, reason)) });
    }
  } catch (e) {}
}
function notify(id, title, message) {
  try { chrome.notifications.create(id, { type: 'basic', iconUrl: 'assets/icons/icon128.png', title, message, priority: 1 }); } catch (e) {}
}
async function evaluate() {
  const { policy, usage, notified } = await getState();
  const sites = sitesOf(policy);
  const d = nowOf(policy), day = dayKey(d, policy), h = hourOf(d);
  const used = Math.max(usage && usage.day === day ? usage.minutes : 0, policy.day === day ? (policy.usedFloor || 0) : 0);
  const left = policy.limit + policy.extra - used;
  const bed = isBedtime(h, policy) && policy.brokenNight !== day;
  const reason = bed ? 'bed' : left <= 0 ? 'screen' : null;
  await applyRules(reason, sites);
  if (reason) await kickOpenTabs(reason, sites);

  chrome.action.setBadgeBackgroundColor({ color: reason ? '#D3968C' : '#839958' });
  chrome.action.setBadgeText({ text: reason === 'bed' ? 'Zz' : reason === 'screen' ? '0' : left < 100 ? String(left) : '' });

  const n = { ...notified }; let changed = false;
  const toBed = Math.round((((hmToH(policy.bed) - h) + 24) % 24) * 60);
  if (toBed > 0 && toBed <= 15 && n.pre !== day) { n.pre = day; changed = true; notify('pre-bed', 'Sắp đến giờ ngủ 🌙', `Còn ${toBed} phút nữa là ${policy.bed}. Các trang bạn chọn sẽ tự khóa 8 tiếng đến ${policy.wake}.`); }
  if (left > 0 && left <= 10 && n.low !== day) { n.low = day; changed = true; notify('low', 'Sắp hết giờ màn hình', `Chỉ còn ${left} phút giải trí hôm nay. Ra ngoài chạm cỏ thôi!`); }
  const sinceWake = ((h - hmToH(policy.wake)) + 24) % 24;
  if (sinceWake < 8 && !isBedtime(h, policy) && n.wake !== day) { n.wake = day; changed = true; notify('wake', 'Chào buổi sáng! ☀️', 'Vào Lừa Chill điểm danh trong 8 tiếng sau khi dậy để nhận Gem (60\' đầu có thưởng thêm)!'); }
  if (changed) await chrome.storage.local.set({ notified: n });
}
let chain = Promise.resolve();
const evaluateQ = () => (chain = chain.then(evaluate).catch(e => console.warn('[LuaChill]', e)));

async function ensureAlarm() { if (!(await chrome.alarms.get('tick'))) chrome.alarms.create('tick', { periodInMinutes: 1 }); }
async function openApp() {
  const url = chrome.runtime.getURL('index.html');
  try { const [t] = await chrome.tabs.query({ url }); if (t) { chrome.tabs.update(t.id, { active: true }); chrome.windows.update(t.windowId, { focused: true }); return; } } catch (e) {}
  chrome.tabs.create({ url });
}

/* ---------- listeners (MV3 top-level) ---------- */
chrome.runtime.onInstalled.addListener(async (info) => { await ensureAlarm(); await evaluateQ(); if (info.reason === 'install') openApp(); });
chrome.runtime.onStartup.addListener(async () => { await ensureAlarm(); evaluateQ(); });
chrome.alarms.onAlarm.addListener(async (a) => { if (a.name === 'tick') { await track(); await evaluateQ(); } });
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.policy) evaluateQ(); });
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg && msg.type === 'evaluate') { evaluateQ().then(() => send({ ok: true })); return true; }
  if (msg && msg.type === 'getUsage') { chrome.storage.local.get('usage').then(r => send(r.usage || null)); return true; }
});
chrome.action.onClicked.addListener(openApp);
chrome.notifications.onClicked.addListener(openApp);
