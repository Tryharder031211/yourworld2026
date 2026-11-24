/* desktop/preload.js — Cầu nối an toàn (contextBridge) giữa Electron và Lừa Chill */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

let pendingAuthHash = null;
let authListener = null;

ipcRenderer.on('lc:authCallback', (_, hash) => {
  if (!hash) return;
  if (typeof authListener === 'function') {
    try { authListener(hash); } catch (_) {}
  } else {
    pendingAuthHash = hash;
  }
});

contextBridge.exposeInMainWorld('LuaChillDesktop', {
  platform: process.platform,
  setPolicy: policy => ipcRenderer.send('lc:setPolicy', policy),
  getUsage: () => ipcRenderer.invoke('lc:getUsage'),
  getInstalledApps: () => ipcRenderer.invoke('lc:getInstalledApps'),
  getSettings: () => ipcRenderer.invoke('lc:getSettings'),
  setAutoLaunch: enabled => ipcRenderer.invoke('lc:setAutoLaunch', !!enabled),
  openAuth: url => ipcRenderer.send('lc:openAuth', String(url || '')),
  consumeAuth: () => ipcRenderer.invoke('lc:consumeAuth'),
  onAuthCallback: cb => {
    authListener = typeof cb === 'function' ? cb : null;
    if (authListener && pendingAuthHash) {
      const h = pendingAuthHash;
      pendingAuthHash = null;
      try { authListener(h); } catch (_) {}
    }
  },
  notify: payload => ipcRenderer.send('lc:notify', payload || {})
});
