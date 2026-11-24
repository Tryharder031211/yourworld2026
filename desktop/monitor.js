/* =============================================================================
   desktop/monitor.js — Quét ứng dụng đang mở thật & bộ đánh giá 3 chế độ khóa PC:
   • Khóa toàn bộ (chừa tối đa 3 app khẩn cấp)
   • Khóa theo từng app riêng (giới hạn phút riêng hoặc giới hạn chung)
   • Khóa theo nhóm app (tổng phút của cả nhóm)
   • Khóa giờ ngủ 8 tiếng (bed → wake)
   Hỗ trợ Windows (Win32 API qua PowerShell), macOS (osascript), Linux (xdotool).
   ============================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

/* Các tiến trình hệ thống không bao giờ bị khóa hoặc tính vào danh sách chặn */
const SYSTEM_EXEMPT = new Set([
  'lua chill', 'luachill', 'electron',
  'explorer', 'searchhost', 'searchapp', 'shellexperiencehost', 'startmenuexperiencehost',
  'lockapp', 'logonui', 'taskmgr', 'systemsettings', 'applicationframehost',
  'dwm', 'ctfmon', 'textinputhost', 'csrss', 'winlogon', 'svchost', 'idle',
  'sihost', 'runtimebroker', 'smartscreen', 'consent', 'powershell', 'cmd',
  'finder', 'dock', 'systemuiserver', 'loginwindow', 'windowserver', 'controlcenter',
  'gnome-shell', 'plasmashell', 'xfwm4', 'xorg'
]);

/* Bảng gợi ý ứng dụng PC phổ biến (hiển thị tên dễ đọc + cho phép chọn sẵn trước khi mở) */
const KNOWN_APPS = {
  chrome: 'Google Chrome',
  msedge: 'Microsoft Edge',
  firefox: 'Mozilla Firefox',
  brave: 'Brave Browser',
  opera: 'Opera',
  coccoc: 'Cốc Cốc',
  discord: 'Discord',
  zalo: 'Zalo PC',
  telegram: 'Telegram',
  messenger: 'Messenger',
  spotify: 'Spotify',
  steam: 'Steam',
  steamwebhelper: 'Steam',
  epicgameslauncher: 'Epic Games',
  leagueclientux: 'Liên Minh Huyền Thoại',
  'league of legends': 'Liên Minh Huyền Thoại',
  'valorant-win64-shipping': 'VALORANT',
  riotclientux: 'Riot Client',
  robloxplayerbeta: 'Roblox',
  genshinimpact: 'Genshin Impact',
  minecraft: 'Minecraft',
  javaw: 'Minecraft / Java',
  cs2: 'Counter-Strike 2',
  dota2: 'Dota 2',
  code: 'Visual Studio Code',
  notion: 'Notion',
  obsidian: 'Obsidian',
  winword: 'Microsoft Word',
  excel: 'Microsoft Excel',
  powerpnt: 'PowerPoint',
  teams: 'Microsoft Teams',
  zoom: 'Zoom',
  vlc: 'VLC Media Player',
  obs64: 'OBS Studio',
  capcut: 'CapCut',
  photoshop: 'Adobe Photoshop'
};

function pad(n) { return String(n).padStart(2, '0'); }
function hmToH(s) {
  const parts = String(s || '07:00').split(':').map(Number);
  return (parts[0] || 0) + (parts[1] || 0) / 60;
}
function normKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\.exe$/i, '');
}
function displayName(procKey) {
  const k = normKey(procKey);
  if (KNOWN_APPS[k]) return KNOWN_APPS[k];
  return String(procKey || '').trim() || k;
}

class DesktopMonitor {
  constructor(userDataDir) {
    this.dataDir = userDataDir;
    this.usagePath = path.join(userDataDir, 'usage-v2.json');
    this.policyPath = path.join(userDataDir, 'policy-v2.json');
    this.policy = this._loadJson(this.policyPath, {
      limit: 120, extra: 0, usedFloor: 0, screenLocked: false,
      bed: '23:00', wake: '07:00', brokenNight: null, day: null, offset: 0,
      blockMode: 'apps', blockedPkgs: [], appLimits: {}, emergencyPkgs: [],
      groups: [], reminders: { enabled: true }
    });
    this.state = this._loadJson(this.usagePath, {
      day: '', totalSec: 0, secMap: {}
    });
    this._runningCache = [];
    this._saveTick = 0;
  }

  _loadJson(file, fallback) {
    try {
      if (fs.existsSync(file)) return { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (_) {}
    return fallback;
  }

  _saveJson(file, obj) {
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {}
  }

  setPolicy(next) {
    this.policy = { ...this.policy, ...(next || {}) };
    this._saveJson(this.policyPath, this.policy);
  }

  nowDate() {
    return new Date(Date.now() + (Number(this.policy.offset) || 0));
  }

  dayKey() {
    const shifted = new Date(this.nowDate().getTime() - hmToH(this.policy.wake) * 3600e3);
    return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
  }

  isBedtime() {
    const d = this.nowDate();
    const h = d.getHours() + d.getMinutes() / 60;
    const b = hmToH(this.policy.bed);
    const w = hmToH(this.policy.wake);
    return b > w ? (h >= b || h < w) : (h >= b && h < w);
  }

  _ensureDay() {
    const dk = this.dayKey();
    if (this.state.day !== dk) {
      this.state = { day: dk, totalSec: 0, secMap: {} };
      this._saveJson(this.usagePath, this.state);
    }
  }

  isExempt(procKey, pid = 0) {
    if (pid && pid === process.pid) return true;
    const k = normKey(procKey);
    if (!k) return true;
    if (k.includes('luachill') || k.includes('lua chill')) return true;
    return SYSTEM_EXEMPT.has(k);
  }

  getActiveProcess() {
    return new Promise(resolve => {
      if (process.platform === 'win32') {
        const ps = [
          'Add-Type -Name W -Namespace LC -MemberDefinition \'[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);\';',
          '$h=[LC.W]::GetForegroundWindow(); $p=0; [void][LC.W]::GetWindowThreadProcessId($h,[ref]$p);',
          'if($p){ $pr=Get-Process -Id $p -EA SilentlyContinue; if($pr){ Write-Output ($pr.ProcessName + "|" + $pr.Id) } }'
        ].join(' ');
        execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], { timeout: 3000, windowsHide: true }, (err, out) => {
          if (err) return resolve(null);
          const line = String(out || '').trim();
          if (!line) return resolve(null);
          const [rawName, pidStr] = line.split('|');
          const key = normKey(rawName);
          resolve(key ? { key, rawName: rawName.trim(), pid: Number(pidStr) || 0, label: displayName(key) } : null);
        });
      } else if (process.platform === 'darwin') {
        execFile('osascript', ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'], { timeout: 3000 }, (err, out) => {
          const rawName = String(out || '').trim();
          const key = normKey(rawName);
          resolve(!err && key ? { key, rawName, pid: 0, label: displayName(key) } : null);
        });
      } else {
        execFile('sh', ['-c', 'pid=$(xdotool getactivewindow getwindowpid 2>/dev/null); if [ -n "$pid" ]; then ps -p "$pid" -o comm=; fi'], { timeout: 3000 }, (err, out) => {
          const rawName = String(out || '').trim();
          const key = normKey(rawName);
          resolve(!err && key ? { key, rawName, pid: 0, label: displayName(key) } : null);
        });
      }
    });
  }

  scanRunningApps() {
    return new Promise(resolve => {
      if (process.platform === 'win32') {
        const ps = 'Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.ProcessName } | Select-Object -ExpandProperty ProcessName -Unique';
        execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], { timeout: 4000, windowsHide: true }, (err, out) => {
          if (err) return resolve([]);
          const names = String(out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          resolve(names);
        });
      } else if (process.platform === 'darwin') {
        execFile('osascript', ['-e', 'tell application "System Events" to get name of (application processes whose background only is false)'], { timeout: 4000 }, (err, out) => {
          if (err) return resolve([]);
          resolve(String(out || '').split(',').map(s => s.trim()).filter(Boolean));
        });
      } else {
        execFile('sh', ['-c', 'ps -eo comm= | sort -u'], { timeout: 3000 }, (err, out) => {
          if (err) return resolve([]);
          resolve(String(out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean));
        });
      }
    });
  }

  async getInstalledApps() {
    const running = await this.scanRunningApps();
    const map = new Map();
    for (const raw of running) {
      const k = normKey(raw);
      if (!k || this.isExempt(k)) continue;
      map.set(k, { pkg: k, name: displayName(k), running: true });
    }
    for (const [k, label] of Object.entries(KNOWN_APPS)) {
      if (this.isExempt(k)) continue;
      if (!map.has(k)) map.set(k, { pkg: k, name: label, running: false });
    }
    this._runningCache = [...map.values()].sort((a, b) => {
      if (a.running !== b.running) return a.running ? -1 : 1;
      return a.name.localeCompare(b.name, 'vi');
    });
    return this._runningCache;
  }

  recordSample(proc, intervalSec) {
    this._ensureDay();
    if (!proc || this.isExempt(proc.key, proc.pid)) return;
    this.state.totalSec = (this.state.totalSec || 0) + intervalSec;
    this.state.secMap[proc.key] = (this.state.secMap[proc.key] || 0) + intervalSec;
    if (++this._saveTick % 3 === 0) {
      this._saveJson(this.usagePath, this.state);
    }
  }

  flush() {
    this._saveJson(this.usagePath, this.state);
  }

  getUsageSnapshot() {
    this._ensureDay();
    const p = this.policy;
    const mode = p.blockMode || 'apps';
    const trackedSet = new Set(
      mode === 'groups'
        ? (p.groups || []).flatMap(g => (g.pkgs || []).map(normKey))
        : (p.blockedPkgs || []).map(normKey)
    );

    const perPkgMinutes = {};
    const allApps = {};
    const apps = {};
    let trackedSec = 0;

    for (const [k, sec] of Object.entries(this.state.secMap || {})) {
      const mins = Math.floor(sec / 60);
      if (trackedSet.has(k)) trackedSec += sec;
      if (mins > 0) {
        perPkgMinutes[k] = mins;
        const lbl = displayName(k);
        allApps[lbl] = (allApps[lbl] || 0) + mins;
        if (trackedSet.has(k)) apps[lbl] = (apps[lbl] || 0) + mins;
      }
    }

    const totalMinutes = Math.floor((this.state.totalSec || 0) / 60);
    const trackedMinutes = mode === 'lockdown' ? totalMinutes : Math.floor(trackedSec / 60);
    return {
      day: this.state.day,
      totalMinutes,
      minutes: trackedMinutes,
      perPkgMinutes,
      apps: mode === 'lockdown' ? allApps : apps,
      allApps
    };
  }

  /** Kiểm tra 1 ứng dụng PC theo ĐÚNG cơ chế khóa riêng của 1 chế độ đang bật (không chồng giới hạn hằng ngày lên từng app/nhóm app) */
  checkProcess(proc) {
    if (!proc || this.isExempt(proc.key, proc.pid)) return { blocked: false };
    const p = this.policy;
    const u = this.getUsageSnapshot();
    const day = this.dayKey();
    const bed = this.isBedtime() && p.brokenNight !== day;
    const extra = Number(p.extra) || 0;
    const mode = p.blockMode || 'apps';
    const label = proc.label || displayName(proc.key);
    const pkgMins = u.perPkgMinutes[proc.key] || 0;

    if (mode === 'lockdown') {
      const em = new Set((p.emergencyPkgs || []).slice(0, 3).map(normKey));
      if (em.has(proc.key)) return { blocked: false };
      const lim = (Number(p.limit) || 120) + extra;
      const floor = p.day === day ? (Number(p.usedFloor) || 0) : 0;
      const usedTotal = Math.max(u.totalMinutes, floor);
      const dailyOut = (p.screenLocked && p.day === day) || usedTotal >= lim;
      if (bed) {
        return {
          blocked: true, reason: 'bed', appName: label, procKey: proc.key, pid: proc.pid,
          title: `${label} đang bị khóa giờ ngủ`,
          detail: `Đang trong 8 tiếng giờ ngủ (${p.bed} → ${p.wake}). Chế độ Khóa toàn bộ hằng ngày chỉ mở tối đa 3 app khẩn cấp.`
        };
      }
      if (dailyOut) {
        return {
          blocked: true, reason: 'screen', appName: label, procKey: proc.key, pid: proc.pid,
          title: 'Đã chạm giới hạn hằng ngày!',
          detail: `Bạn đã dùng ${usedTotal}/${lim} phút hôm nay. Chế độ Khóa toàn bộ hằng ngày chỉ cho phép 3 ứng dụng khẩn cấp.`
        };
      }
      return { blocked: false };
    }

    if (mode === 'groups') {
      const groups = Array.isArray(p.groups) ? p.groups : [];
      const grp = groups.find(g => (g.pkgs || []).map(normKey).includes(proc.key));
      if (!grp) return { blocked: false };
      const gLim = (Number(grp.limit) || 30) + extra;
      const gMins = (grp.pkgs || []).reduce((sum, pk) => sum + (u.perPkgMinutes[normKey(pk)] || 0), 0);
      if (bed) {
        return {
          blocked: true, reason: 'bed', appName: label, procKey: proc.key, pid: proc.pid,
          title: `${label} bị khóa giờ ngủ`,
          detail: `Đang trong giờ ngủ (${p.bed} → ${p.wake}). Hãy tắt máy nghỉ ngơi nhé!`
        };
      }
      if (gMins >= gLim) {
        return {
          blocked: true, reason: 'screen', appName: label, procKey: proc.key, pid: proc.pid,
          title: `Nhóm "${grp.name}" đã hết giờ!`,
          detail: `Nhóm "${grp.name}" đã dùng ${gMins}/${gLim} phút hôm nay.`
        };
      }
      return { blocked: false };
    }

    // "apps": khóa riêng từng app theo hạn mức phút riêng của từng app
    const blockedSet = new Set((p.blockedPkgs || []).map(normKey));
    if (!blockedSet.has(proc.key)) return { blocked: false };
    const baseLim = Number((p.appLimits || {})[proc.key]) || 30;
    const appLim = baseLim + extra;
    if (bed) {
      return {
        blocked: true, reason: 'bed', appName: label, procKey: proc.key, pid: proc.pid,
        title: `${label} bị khóa giờ ngủ`,
        detail: `Đang trong 8 tiếng giờ ngủ (${p.bed} → ${p.wake}).`
      };
    }
    if (pkgMins >= appLim) {
      return {
        blocked: true, reason: 'screen', appName: label, procKey: proc.key, pid: proc.pid,
        title: `${label} đã hết giới hạn riêng!`,
        detail: `Bạn đã dùng ${label} ${pkgMins}/${appLim} phút hôm nay.`
      };
    }
    return { blocked: false };
  }

  /** Thu nhỏ cửa sổ ứng dụng đang bị khóa (khi bấm "Quay về app Lừa Chill") */
  minimizeProcess(procKey) {
    const k = normKey(procKey);
    if (!k || this.isExempt(k)) return;
    if (process.platform === 'win32') {
      const safe = k.replace(/[^a-z0-9._ -]/gi, '');
      const ps = `Add-Type -Name S -Namespace LC2 -MemberDefinition '[DllImport("user32.dll")]public static extern bool ShowWindowAsync(IntPtr h, int c);'; Get-Process -Name '${safe}' -EA SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0} | ForEach-Object { [void][LC2.S]::ShowWindowAsync($_.MainWindowHandle, 6) }`;
      execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], { timeout: 3000, windowsHide: true }, () => {});
    } else if (process.platform === 'darwin') {
      const safe = k.replace(/["\\]/g, '');
      execFile('osascript', ['-e', `tell application "System Events" to set visible of every process whose name is "${safe}" to false`], { timeout: 3000 }, () => {});
    }
  }

  /** Đóng nhẹ nhàng cửa sổ bị khóa (CloseMainWindow, an toàn dữ liệu) & đưa về màn hình Desktop */
  closeProcessAndShowDesktop(procKey) {
    const k = normKey(procKey);
    if (process.platform === 'win32') {
      const safe = k.replace(/[^a-z0-9._ -]/gi, '');
      const parts = [];
      if (safe && !this.isExempt(safe)) {
        parts.push(`Get-Process -Name '${safe}' -EA SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0} | ForEach-Object { [void]$_.CloseMainWindow() }`);
      }
      parts.push('(New-Object -ComObject Shell.Application).MinimizeAll()');
      execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', parts.join('; ')], { timeout: 4000, windowsHide: true }, () => {});
    } else if (process.platform === 'darwin') {
      const safe = k.replace(/["\\]/g, '');
      const cmd = safe && !this.isExempt(safe)
        ? `tell application "System Events" to set visible of every process whose name is "${safe}" to false`
        : 'tell application "Finder" to activate';
      execFile('osascript', ['-e', cmd], { timeout: 3000 }, () => {});
    }
  }
}

module.exports = { DesktopMonitor, displayName, normKey, hmToH };
