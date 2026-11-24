/* =============================================================================
   background.js — Chrome Extension MV3 Service Worker (v2.1)
   • Quét thời gian dùng THẬT toàn trình duyệt (mọi trang web) mỗi 1 phút.
   • Hỗ trợ đủ 3 chế độ chặn:
     1. lockdown : Khóa TOÀN BỘ web khi chạm giới hạn, chỉ chừa tối đa 3 trang khẩn cấp + Whitelist.
     2. apps     : Khóa từng trang đã chọn (hỗ trợ giới hạn phút riêng từng trang).
     3. groups   : Khóa theo nhóm trang web (chạm giới hạn nhóm nào khóa nhóm đó).
   • Hỗ trợ đồng hồ theo múi giờ / chỉnh tay (policy.offset) và nhắc hẹn 5 sự kiện.
   ============================================================================= */
'use strict';

const DEFAULT_SITES = ['facebook.com', 'fb.com', 'messenger.com', 'tiktok.com'];
const WHITELIST = ['zalo.me', 'chat.zalo.me'];
const RULE_BASE = 100;
const DEFAULT_POLICY = {
  limit: 120, extra: 0, usedFloor: 0, screenLocked: false,
  bed: '23:00', wake: '07:00', brokenNight: null, slept: false,
  day: null, offset: 0, blockMode: 'apps',
  blocked: DEFAULT_SITES, appLimits: {},
  emergencyWeb: ['zalo.me'], groups: [],
  reminders: { enabled: true, quests: true, questTime: '10:00', questTime2: '17:00', checkin: true, bed: true, bedLead: 15, wake: true, limitWarn: true, limitLead: 10 }
};

const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const hmToH = s => { const [h, m] = String(s).split(':').map(Number); return h + (m || 0) / 60; };
const dayKey = (d, p) => ymd(new Date(d.getTime() - hmToH(p.wake) * 3600e3));
const hourOf = d => d.getHours() + d.getMinutes() / 60;
const isBedtime = (h, p) => { const b = hmToH(p.bed), w = hmToH(p.wake); return b > w ? (h >= b || h < w) : (h >= b && h < w); };
const cleanDom = s => String(s || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
const validDom = d => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d);
const matchDom = (host, dom) => host === dom || host.endsWith('.' + dom);
const hostOf = url => { try { const u = new URL(url); if (u.protocol !== 'http:' && u.protocol !== 'https:') return null; return u.hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return null; } };
const cleanList = arr => [...new Set((arr || []).map(cleanDom).filter(validDom))];
const allowedList = p => [...new Set([...WHITELIST, ...cleanList(p.emergencyWeb).slice(0, 3)])];
const trackedSitesOf = p => {
  const allow = allowedList(p);
  if (p.blockMode === 'groups') return cleanList((p.groups || []).flatMap(g => g.domains || [])).filter(d => !allow.some(w => matchDom(d, w)));
  const raw = Array.isArray(p.blocked) ? p.blocked : DEFAULT_SITES;
  return cleanList(raw).filter(d => !allow.some(w => matchDom(d, w)));
};
const lockPath = (site, reason) => `/module-suc-khoe/health.html?blocked=${encodeURIComponent(site)}&reason=${reason}#${reason === 'bed' ? 'sleep' : 'tasks'}`;

async function getState() {
  const r = await chrome.storage.local.get(['policy', 'usage', 'notified']);
  return { policy: { ...DEFAULT_POLICY, ...(r.policy || {}) }, usage: r.usage || null, notified: r.notified || {} };
}
const nowOf = p => new Date(Date.now() + (p.offset || 0));

/* ---------- 1) Quét phút dùng THẬT toàn bộ trình duyệt ---------- */
async function track() {
  const { policy, usage } = await getState();
  const sites = trackedSitesOf(policy);
  const day = dayKey(nowOf(policy), policy);
  const u = (usage && usage.day === day) ? usage : { day, minutes: 0, totalMinutes: 0, sites: {}, allSites: {} };
  u.allSites = u.allSites || {};
  u.sites = u.sites || {};
  try {
    if (await chrome.idle.queryState(60) === 'active') {
      const win = await chrome.windows.getLastFocused();
      if (win && win.focused) {
        const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
        const h = tab && tab.url && hostOf(tab.url);
        if (h) {
          u.totalMinutes = (u.totalMinutes || 0) + 1;
          u.allSites[h] = (u.allSites[h] || 0) + 1;
          const m = sites.find(s => matchDom(h, s));
          if (m) { u.minutes = (u.minutes || 0) + 1; u.sites[m] = (u.sites[m] || 0) + 1; }
        }
      }
    }
  } catch (e) {}
  await chrome.storage.local.set({ usage: u });
}

/* ---------- 2) Tính danh sách chặn theo 3 chế độ ---------- */
function domainUsed(u, dom) {
  let sum = 0;
  for (const [h, m] of Object.entries((u && u.allSites) || {})) if (matchDom(h, dom)) sum += m;
  return Math.max(sum, ((u && u.sites) || {})[dom] || 0);
}

let lastSig = null;
async function applyDynamicRules(spec) {
  const sig = JSON.stringify(spec);
  if (sig === lastSig) return; lastSig = sig;
  const addRules = [];
  if (spec.lockAll) {
    addRules.push({
      id: RULE_BASE, priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: lockPath('Toàn bộ web', spec.reason) } },
      condition: { urlFilter: '|http', excludedRequestDomains: spec.exclude, resourceTypes: ['main_frame'] }
    });
  } else if (spec.domains && spec.domains.length) {
    spec.domains.forEach((d, i) => {
      addRules.push({
        id: RULE_BASE + i, priority: 1,
        action: { type: 'redirect', redirect: { extensionPath: lockPath(d.dom, d.reason) } },
        condition: { requestDomains: [d.dom], resourceTypes: ['main_frame'] }
      });
    });
  }
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(r => r.id), addRules });
}

async function kickTabs(spec) {
  if (!spec.lockAll && (!spec.domains || !spec.domains.length)) return;
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      const h = t.url && hostOf(t.url);
      if (!h) continue;
      if (spec.exclude.some(w => matchDom(h, w))) continue;
      if (spec.lockAll) {
        chrome.tabs.update(t.id, { url: chrome.runtime.getURL(lockPath(h, spec.reason)) });
      } else {
        const hit = spec.domains.find(d => matchDom(h, d.dom));
        if (hit) chrome.tabs.update(t.id, { url: chrome.runtime.getURL(lockPath(hit.label || hit.dom, hit.reason)) });
      }
    }
  } catch (e) {}
}

function notify(id, title, message) {
  try { chrome.notifications.create(id, { type: 'basic', iconUrl: 'assets/icons/icon128.png', title, message, priority: 1 }); } catch (e) {}
}

async function evaluate() {
  const { policy, usage, notified } = await getState();
  const d = nowOf(policy), day = dayKey(d, policy), h = hourOf(d), hmNow = hm(d);
  const u = (usage && usage.day === day) ? usage : { day, minutes: 0, totalMinutes: 0, sites: {}, allSites: {} };
  const allow = allowedList(policy);
  const bed = isBedtime(h, policy) && policy.brokenNight !== day;
  const extra = policy.extra || 0;
  const usedDaily = Math.max(u.totalMinutes || 0, policy.day === day ? (policy.usedFloor || 0) : 0);
  const leftDaily = policy.limit + extra - usedDaily;
  const dailyOut = leftDaily <= 0 || (policy.screenLocked && policy.day === day);

  /* Mỗi chế độ áp dụng 1 cơ chế khóa hoàn toàn riêng biệt */
  let spec = { lockAll: false, reason: null, exclude: allow, domains: [] };
  if (policy.blockMode === 'lockdown') {
    if (bed || dailyOut) spec = { lockAll: true, reason: bed ? 'bed' : 'screen', exclude: allow, domains: [] };
  } else if (policy.blockMode === 'groups') {
    const domMap = new Map();
    for (const g of (policy.groups || [])) {
      const gDoms = cleanList(g.domains).filter(dm => !allow.some(w => matchDom(dm, w)));
      const gUsed = gDoms.reduce((a, dm) => a + domainUsed(u, dm), 0);
      if (bed || gUsed >= (g.limit || 30) + extra) {
        const r = bed ? 'bed' : 'screen';
        gDoms.forEach(dm => domMap.set(dm, { dom: dm, reason: r, label: `Nhóm ${g.name}` }));
      }
    }
    spec.domains = [...domMap.values()];
    spec.reason = bed ? 'bed' : (spec.domains.length ? 'screen' : null);
  } else {
    const sites = trackedSitesOf(policy);
    const lims = policy.appLimits || {};
    const domList = [];
    for (const dm of sites) {
      const appLim = (lims[dm] > 0 ? lims[dm] : 30) + extra;
      if (bed || domainUsed(u, dm) >= appLim) {
        domList.push({ dom: dm, reason: bed ? 'bed' : 'screen', label: dm });
      }
    }
    spec.domains = domList;
    spec.reason = bed ? 'bed' : (domList.length ? 'screen' : null);
  }

  await applyDynamicRules(spec);
  if (spec.lockAll || spec.domains.length) await kickTabs(spec);

  const badgeReason = bed ? 'bed' : (spec.lockAll || spec.domains.length) ? 'screen' : null;
  chrome.action.setBadgeBackgroundColor({ color: badgeReason ? '#D3968C' : '#839958' });
  chrome.action.setBadgeText({ text: badgeReason === 'bed' ? 'Zz' : spec.lockAll ? '0' : spec.domains.length ? String(spec.domains.length) : (policy.blockMode === 'lockdown' && leftDaily < 100) ? String(Math.max(0, leftDaily)) : '' });

  /* ---------- Nhắc hẹn 5 sự kiện ---------- */
  const rem = { ...DEFAULT_POLICY.reminders, ...(policy.reminders || {}) };
  if (rem.enabled) {
    const n = { ...notified }; let ch = false;
    const once = (k, title, body) => { if (n[k] !== day) { n[k] = day; ch = true; notify('lc-' + k, title, body); } };
    if (rem.bed) {
      const toBed = Math.round((((hmToH(policy.bed) - h) + 24) % 24) * 60);
      if (toBed > 0 && toBed <= (rem.bedLead || 15)) once('pre', 'Sắp đến giờ ngủ 🌙', `Còn ${toBed} phút tới ${policy.bed}. Các app sẽ khóa 8 tiếng đến ${policy.wake}.`);
      if (bed) once('bedNow', 'Đến giờ ngủ rồi 🌙', `Đã ${policy.bed}! Hãy tắt máy và ngủ đủ 8 tiếng nhé.`);
    }
    const sinceWake = ((h - hmToH(policy.wake)) + 24) % 24;
    if (rem.wake && !bed && sinceWake < 0.25) once('wake', 'Chào buổi sáng! ☀️', `Đã ${policy.wake} rồi — dậy uống 1 ly nước bắt đầu ngày mới nhé!`);
    if (rem.checkin && !bed && sinceWake >= 0.15 && sinceWake < 8) once('ci', 'Nhớ điểm danh buổi sáng 📅', 'Mở Lừa Chill để điểm danh trong cửa sổ 8 tiếng nhận Gem!');
    if (rem.quests) {
      if (hmNow === rem.questTime) once('q1', 'Nhắc nhiệm vụ đời thực ✅', 'Hoàn thành các Quest hôm nay (uống nước, chạm cỏ, đọc sách) nhé!');
      if (rem.questTime2 && hmNow === rem.questTime2) once('q2', 'Nhắc nhiệm vụ buổi chiều 🌿', 'Còn nhiệm vụ đời thực nào chưa xong không? Vào check ngay!');
    }
    const lead = rem.limitLead || 10;
    if (rem.limitWarn) {
      if (policy.blockMode === 'lockdown' && leftDaily > 0 && leftDaily <= lead) {
        once('low', 'Sắp chạm giới hạn hằng ngày ⏳', `Chỉ còn ${leftDaily} phút trước khi bật Khóa toàn bộ!`);
      } else if (policy.blockMode === 'groups') {
        for (const g of (policy.groups || [])) {
          const gDoms = cleanList(g.domains).filter(dm => !allow.some(w => matchDom(dm, w)));
          const gLeft = ((g.limit || 30) + extra) - gDoms.reduce((a, dm) => a + domainUsed(u, dm), 0);
          if (gLeft > 0 && gLeft <= lead) once('grp-' + g.id, `Nhóm "${g.name}" sắp hết giờ ⏳`, `Chỉ còn ${gLeft} phút cho nhóm ${g.name}!`);
        }
      } else {
        for (const dm of trackedSitesOf(policy)) {
          const aLim = ((policy.appLimits || {})[dm] > 0 ? policy.appLimits[dm] : 30) + extra;
          const aLeft = aLim - domainUsed(u, dm);
          if (aLeft > 0 && aLeft <= lead) once('app-' + dm, `${dm} sắp hết giờ riêng ⏳`, `Chỉ còn ${aLeft} phút cho ${dm} hôm nay!`);
        }
      }
    }
    if (ch) await chrome.storage.local.set({ notified: n });
  }
}

let chain = Promise.resolve();
const evaluateQ = () => (chain = chain.then(evaluate).catch(e => console.warn('[LuaChill]', e)));

async function ensureAlarm() { if (!(await chrome.alarms.get('tick'))) chrome.alarms.create('tick', { periodInMinutes: 1 }); }
async function openApp() {
  const url = chrome.runtime.getURL('index.html');
  try { const [t] = await chrome.tabs.query({ url }); if (t) { chrome.tabs.update(t.id, { active: true }); chrome.windows.update(t.windowId, { focused: true }); return; } } catch (e) {}
  chrome.tabs.create({ url });
}

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
