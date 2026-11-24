/* desktop/lock-preload.js — Cầu nối riêng cho màn hình khóa toàn màn hình trên PC */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('LuaChillLock', {
  onPayload: cb => ipcRenderer.on('lc:lockPayload', (_, data) => cb(data)),
  returnToApp: () => ipcRenderer.send('lc:lockAction', 'return'),
  closeAndHome: () => ipcRenderer.send('lc:lockAction', 'closeHome')
});
