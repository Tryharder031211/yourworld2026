/* desktop/preload.js — Cầu nối an toàn (contextBridge) giữa Electron và Lừa Chill */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('lc:authCallback', (_, hash) => {
  if (typeof window.__onAuthCallback === 'function') {
    window.__onAuthCallback(hash);
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
  notify: payload => ipcRenderer.send('lc:notify', payload || {})
});
