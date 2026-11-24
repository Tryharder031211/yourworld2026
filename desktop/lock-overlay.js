/* desktop/lock-overlay.js — Xử lý màn hình khóa toàn màn hình trên PC */
'use strict';

if (window.LuaChillLock) {
  window.LuaChillLock.onPayload(data => {
    if (!data) return;
    const t = document.getElementById('lkTitle');
    const d = document.getElementById('lkDetail');
    if (t && data.title) t.textContent = data.title;
    if (d && data.detail) d.textContent = data.detail;
  });
  document.getElementById('btnReturn').addEventListener('click', () => {
    window.LuaChillLock.returnToApp();
  });
  document.getElementById('btnHome').addEventListener('click', () => {
    window.LuaChillLock.closeAndHome();
  });
}
