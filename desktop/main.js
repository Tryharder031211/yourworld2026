/* =============================================================================
   desktop/main.js — Ứng dụng Desktop Electron hoàn chỉnh (Windows / macOS / Linux).
   • Khay hệ thống (System Tray) + chạy nền khi đóng cửa sổ + khởi động cùng máy tính.
   • Quét THẬT tên cửa sổ ứng dụng đang mở mỗi 10 giây (chỉ tính khi máy không idle).
   • Thực thi đủ 3 chế độ chặn (Khóa toàn bộ chừa 3 app khẩn cấp • Từng app • Nhóm app)
     + Khóa giờ ngủ 8 tiếng bằng màn hình khóa luôn nổi trên cùng (full-screen overlay).
   • Cầu nối đăng nhập Google/Discord qua trình duyệt mặc định (127.0.0.1:45821/auth-callback)
     vượt rào Google chặn WebView nhúng.
   • Nhắc hẹn 5 mục chạy nền ngay cả khi thu nhỏ vào khay hệ thống.
   ============================================================================= */
'use strict';

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, powerMonitor, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { DesktopMonitor } = require('./monitor');
const { DesktopReminders } = require('./reminders');

const PORT = 45821;
const SAMPLE_SEC = 10;
const WWW_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'www') : path.resolve(__dirname, '..');
const ICON_PATH = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const TRAY_ICON_PATH = path.join(__dirname, 'assets', 'tray.png');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

// Bảo đảm chỉ mở 1 phiên bản Lừa Chill duy nhất trên PC
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWin = null;
let lockWin = null;
let tray = null;
let monitor = null;
let reminders = null;
let isQuitting = false;
let notifiedTrayOnce = false;
let currentLockInfo = null;
let lastLockTriggerMs = 0;
let pendingAuthHash = null;

/* ---------------- 1. MÁY CHỦ HTTP CỤC BỘ + CẦU NỐI OAUTH GOOGLE/DISCORD ---------------- */
const AUTH_CALLBACK_HTML = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>Lừa Chill — Đăng nhập thành công</title>
<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0A3323;color:#F7F4D5;font-family:"Segoe UI",system-ui,sans-serif;text-align:center}
.box{background:#F7F4D5;color:#0A3323;border:3px solid #0A3323;border-radius:20px;padding:26px 30px;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
h2{margin:0 0 8px}p{margin:0;color:#105666;font-weight:600}</style></head>
<body><div class="box"><h2 id="t">Đang hoàn tất đăng nhập...</h2><p id="d">Bạn sẽ được đưa về ứng dụng Lừa Chill ngay lập tức.</p></div>
<script>
(function(){
  var payload = location.hash || location.search || '';
  fetch('/auth-done', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload })
    .then(function(){
      document.getElementById('t').textContent = 'Đăng nhập Lừa Chill thành công! ✓';
      document.getElementById('d').textContent = 'Bạn có thể đóng tab này và quay lại ứng dụng Lừa Chill trên PC.';
      setTimeout(function(){ window.close(); }, 900);
    })
    .catch(function(){
      document.getElementById('t').textContent = 'Không kết nối được ứng dụng Lừa Chill';
      document.getElementById('d').textContent = 'Hãy mở ứng dụng Lừa Chill trên PC và thử đăng nhập lại.';
    });
})();
</script></body></html>`;

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

      if (urlPath === '/auth-callback') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(AUTH_CALLBACK_HTML);
        return;
      }

      if (urlPath === '/auth-done' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { if (body.length < 65536) body += chunk; });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('ok');
          const raw = String(body || '').trim();
          if (!raw) return;
          const hash = raw.startsWith('#') ? raw : (raw.startsWith('?') ? '#' + raw.slice(1) : '#' + raw);
          pendingAuthHash = hash;
          showMainWindow();
          if (mainWin && !mainWin.isDestroyed()) {
            const deliver = () => {
              if (mainWin && !mainWin.isDestroyed() && pendingAuthHash) {
                mainWin.webContents.send('lc:authCallback', pendingAuthHash);
              }
            };
            if (mainWin.webContents.isLoading()) mainWin.webContents.once('did-finish-load', deliver);
            else deliver();
          }
        });
        return;
      }

      const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const full = path.resolve(WWW_ROOT, rel);
      if (!full.startsWith(WWW_ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

/* ---------------- 2. CỬA SỔ CHÍNH & MÀN HÌNH KHÓA TOÀN MÀN HÌNH ---------------- */
function showMainWindow(relativeUrl) {
  if (!mainWin || mainWin.isDestroyed()) createMainWindow();
  if (relativeUrl) {
    mainWin.loadURL(`http://127.0.0.1:${PORT}/${relativeUrl}`);
  }
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 400,
    minHeight: 680,
    title: 'Lừa Chill — Healthy Habits in a Digital World',
    icon: ICON_PATH,
    backgroundColor: '#0A3323',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWin.loadURL(`http://127.0.0.1:${PORT}/index.html`);
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWin.on('close', e => {
    if (!isQuitting) {
      e.preventDefault();
      mainWin.hide();
      if (!notifiedTrayOnce) {
        notifiedTrayOnce = true;
        sendDesktopNotification('Lừa Chill đang chạy nền 🌿', 'Ứng dụng thu nhỏ vào khay hệ thống để tiếp tục đo màn hình & nhắc hẹn.');
      }
    }
  });
}

function showLockOverlay(decision) {
  currentLockInfo = decision;
  if (lockWin && !lockWin.isDestroyed()) {
    lockWin.webContents.send('lc:lockPayload', decision);
    lockWin.show();
    lockWin.focus();
    return;
  }

  lockWin = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: false,
    backgroundColor: '#0A3323',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    closable: false,
    focusable: true,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'lock-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  lockWin.setAlwaysOnTop(true, 'screen-saver');
  lockWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  lockWin.loadFile(path.join(__dirname, 'lock-overlay.html'));

  // Chặn phím Esc / Alt+F4 / Ctrl+W để người dùng chọn 1 trong 2 nút trên màn hình khóa
  lockWin.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' || (input.alt && input.key === 'F4') || ((input.control || input.meta) && input.key.toLowerCase() === 'w')) {
      event.preventDefault();
    }
  });

  lockWin.webContents.once('did-finish-load', () => {
    if (lockWin && !lockWin.isDestroyed() && currentLockInfo) {
      lockWin.webContents.send('lc:lockPayload', currentLockInfo);
    }
  });
}

function dismissLockOverlay() {
  currentLockInfo = null;
  if (lockWin && !lockWin.isDestroyed()) {
    lockWin.setClosable(true);
    lockWin.destroy();
  }
  lockWin = null;
}

/* ---------------- 3. KHAY HỆ THỐNG (SYSTEM TRAY) & THÔNG BÁO ---------------- */
function sendDesktopNotification(title, body, tab) {
  if (!Notification.isSupported()) return;
  const n = new Notification({
    title: title || 'Lừa Chill',
    body: body || '',
    icon: path.join(__dirname, 'assets', 'icon.png')
  });
  n.on('click', () => {
    if (tab) showMainWindow(`module-suc-khoe/health.html#${tab}`);
    else showMainWindow();
  });
  n.show();
}

function updateTrayMenu() {
  if (!tray || !monitor) return;
  const u = monitor.getUsageSnapshot();
  const mode = monitor.policy.blockMode || 'apps';
  const lim = (Number(monitor.policy.limit) || 120) + (Number(monitor.policy.extra) || 0);
  const statusLine = mode === 'lockdown'
    ? `Khóa hằng ngày: ${u.totalMinutes}p / ${lim}p`
    : mode === 'groups'
    ? `Theo nhóm (${(monitor.policy.groups || []).length} nhóm) • Toàn máy ${u.totalMinutes}p`
    : `Từng app (${(monitor.policy.blockedPkgs || []).length} app) • Toàn máy ${u.totalMinutes}p`;
  const loginItem = app.getLoginItemSettings();

  tray.setToolTip(`Lừa Chill — ${statusLine}`);
  const menu = Menu.buildFromTemplate([
    { label: `Lừa Chill • ${statusLine}`, enabled: false },
    { type: 'separator' },
    { label: 'Mở Lừa Chill', click: () => showMainWindow() },
    { label: 'Mở Đồng hồ & Chặn app', click: () => showMainWindow('module-suc-khoe/health.html#timer') },
    { label: 'Mở Nhắc hẹn', click: () => showMainWindow('module-suc-khoe/health.html#remind') },
    { type: 'separator' },
    {
      label: 'Khởi động cùng máy tính',
      type: 'checkbox',
      checked: !!loginItem.openAtLogin,
      click: item => {
        try { app.setLoginItemSettings({ openAtLogin: !!item.checked }); } catch (_) {}
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Thoát hoàn toàn',
      click: () => {
        isQuitting = true;
        dismissLockOverlay();
        if (monitor) monitor.flush();
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  const img = nativeImage.createFromPath(TRAY_ICON_PATH);
  tray = new Tray(img.isEmpty() ? nativeImage.createFromPath(ICON_PATH) : img);
  tray.on('double-click', () => showMainWindow());
  updateTrayMenu();
}

/* ---------------- 4. VÒNG LẶP ĐO & CHẶN THỜI GIAN THỰC ---------------- */
async function sampleAndEnforce() {
  if (!monitor) return;
  if (powerMonitor.getSystemIdleTime() >= 60) return;

  const proc = await monitor.getActiveProcess();
  if (!proc) return;

  monitor.recordSample(proc, SAMPLE_SEC);
  updateTrayMenu();

  // Không bật màn hình khóa đè lên chính Lừa Chill hoặc khi màn hình khóa đang mở
  if (lockWin && !lockWin.isDestroyed()) return;
  if (mainWin && !mainWin.isDestroyed() && mainWin.isFocused()) return;

  const decision = monitor.checkProcess(proc);
  if (!decision.blocked) return;

  const now = Date.now();
  if (now - lastLockTriggerMs < 2000) return;
  lastLockTriggerMs = now;
  showLockOverlay(decision);
}

/* ---------------- 5. CẦU NỐI IPC ---------------- */
ipcMain.on('lc:setPolicy', (_, p) => {
  if (!monitor) return;
  monitor.setPolicy(p);
  updateTrayMenu();
  if (lockWin && !lockWin.isDestroyed() && currentLockInfo) {
    const check = monitor.checkProcess({ key: currentLockInfo.procKey, label: currentLockInfo.appName, pid: currentLockInfo.pid || 0 });
    if (!check.blocked) dismissLockOverlay();
  }
});

ipcMain.handle('lc:getUsage', () => (monitor ? monitor.getUsageSnapshot() : null));
ipcMain.handle('lc:getInstalledApps', () => (monitor ? monitor.getInstalledApps() : []));
ipcMain.handle('lc:getSettings', () => ({
  autoLaunch: !!app.getLoginItemSettings().openAtLogin,
  platform: process.platform,
  version: app.getVersion()
}));
ipcMain.handle('lc:setAutoLaunch', (_, enabled) => {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
  } catch (_) {}
  updateTrayMenu();
  return !!app.getLoginItemSettings().openAtLogin;
});

ipcMain.on('lc:openAuth', (_, url) => {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
});

ipcMain.handle('lc:consumeAuth', () => {
  const h = pendingAuthHash;
  pendingAuthHash = null;
  return h || '';
});

ipcMain.on('lc:notify', (_, payload) => {
  sendDesktopNotification(payload && payload.title, payload && payload.body, payload && payload.tab);
});

ipcMain.on('lc:lockAction', (_, action) => {
  const info = currentLockInfo;
  dismissLockOverlay();
  lastLockTriggerMs = Date.now() + 2500; // Tránh bật lại ngay trong khi cửa sổ đang thu nhỏ
  if (!info || !monitor) return;

  if (action === 'return') {
    monitor.minimizeProcess(info.procKey);
    const enc = encodeURIComponent(info.appName || info.procKey || 'Ứng dụng');
    const tab = info.reason === 'bed' ? 'sleep' : 'tasks';
    showMainWindow(`module-suc-khoe/health.html?blocked=${enc}&reason=${info.reason || 'screen'}#${tab}`);
  } else {
    monitor.closeProcessAndShowDesktop(info.procKey);
  }
});

/* ---------------- 6. KHỞI CHẠY ỨNG DỤNG ---------------- */
if (gotLock) {
  app.on('second-instance', () => showMainWindow());

  app.whenReady().then(async () => {
    app.setAppUserModelId('com.luachill.desktop');
    monitor = new DesktopMonitor(app.getPath('userData'));
    reminders = new DesktopReminders(monitor, n => sendDesktopNotification(n.title, n.body, n.tab));

    await startStaticServer();
    createMainWindow();
    createTray();

    setInterval(() => { sampleAndEnforce().catch(() => {}); }, SAMPLE_SEC * 1000);
    setInterval(() => { try { reminders.tick(); } catch (_) {} }, 30_000);
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (monitor) monitor.flush();
  });

  app.on('activate', () => showMainWindow());
  app.on('window-all-closed', () => {
    if (isQuitting && process.platform !== 'darwin') app.quit();
  });
}
