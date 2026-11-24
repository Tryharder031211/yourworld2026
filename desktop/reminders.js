/* =============================================================================
   desktop/reminders.js — Bộ nhắc hẹn chạy nền (ngay cả khi thu nhỏ vào khay hệ thống):
   Nhiệm vụ • Điểm danh 8h • Sắp tới giờ ngủ • Đúng giờ ngủ • Giờ dậy • Gần chạm giới hạn.
   ============================================================================= */
'use strict';

const { hmToH, normKey, displayName } = require('./monitor');

function pad(n) { return String(n).padStart(2, '0'); }

class DesktopReminders {
  constructor(monitor, onFire) {
    this.monitor = monitor;
    this.onFire = onFire;
    this.fired = new Set();
  }

  _fire(day, key, title, body, tab) {
    const full = `${day}|${key}`;
    if (this.fired.has(full)) return;
    // Dọn dấu ngày cũ
    for (const k of [...this.fired]) {
      if (!k.startsWith(`${day}|`)) this.fired.delete(k);
    }
    this.fired.add(full);
    if (typeof this.onFire === 'function') this.onFire({ title, body, tab });
  }

  tick() {
    const p = this.monitor.policy;
    const r = p && p.reminders;
    if (!r || !r.enabled) return;

    const now = this.monitor.nowDate();
    const day = this.monitor.dayKey();
    const h = now.getHours() + now.getMinutes() / 60;
    const hmNow = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const bedH = hmToH(p.bed);
    const wakeH = hmToH(p.wake);
    const toBedMin = Math.round((((bedH - h) + 24) % 24) * 60);
    const sinceWakeH = ((h - wakeH) + 24) % 24;
    const bedNow = this.monitor.isBedtime();

    if (r.quests) {
      if (r.questTime && hmNow === r.questTime) {
        this._fire(day, 'quest1', 'Nhắc nhiệm vụ đời thực ✅', 'Uống nước, vận động, chạm cỏ để nhận Gem trên Lừa Chill nhé!', 'tasks');
      }
      if (r.questTime2 && hmNow === r.questTime2) {
        this._fire(day, 'quest2', 'Nhắc nhiệm vụ buổi chiều 🌿', 'Hoàn thành nốt các Quest đời thực hôm nay nhé!', 'tasks');
      }
    }

    if (r.wake && !bedNow && sinceWakeH <= 0.2) {
      this._fire(day, 'wake', 'Chào buổi sáng! ☀️', `Đã ${p.wake} — dậy uống nước và chào ngày mới nào!`, 'sleep');
    }

    if (r.checkin && !bedNow && sinceWakeH >= 0.2 && sinceWakeH <= 0.6) {
      this._fire(day, 'checkin', 'Nhớ điểm danh buổi sáng 📅', 'Cửa sổ điểm danh 8 tiếng đã mở — vào trong 60 phút đầu nhận thêm +15 Gem!', 'sleep');
    }

    if (r.bed) {
      const lead = Number(r.bedLead) || 15;
      if (toBedMin > 0 && toBedMin <= lead) {
        this._fire(day, 'bedLead', 'Sắp đến giờ ngủ 🌙', `Còn ${toBedMin} phút nữa tới ${p.bed}. Chuẩn bị cất máy ngủ đủ 8 tiếng nhé!`, 'sleep');
      }
      if (bedNow && p.brokenNight !== day) {
        this._fire(day, 'bedNow', 'Đến giờ đi ngủ rồi 🌙', `Đã ${p.bed}! Khóa giờ ngủ 8 tiếng đã kích hoạt đến ${p.wake}.`, 'sleep');
      }
    }

    if (r.limitWarn) {
      const lead = Number(r.limitLead) || 10;
      const u = this.monitor.getUsageSnapshot();
      const extra = Number(p.extra) || 0;
      const mode = p.blockMode || 'apps';
      if (mode === 'lockdown') {
        const lim = (Number(p.limit) || 120) + extra;
        const left = lim - u.totalMinutes;
        if (left >= 1 && left <= lead) {
          this._fire(day, 'limitWarn', 'Sắp chạm giới hạn hằng ngày ⏳', `Chỉ còn ${left} phút trước khi bật Khóa toàn bộ trên PC!`, 'timer');
        }
      } else if (mode === 'groups' && Array.isArray(p.groups)) {
        for (const g of p.groups) {
          const gUsed = (g.pkgs || []).reduce((sum, pk) => sum + (u.perPkgMinutes[normKey(pk)] || 0), 0);
          const gLeft = ((Number(g.limit) || 30) + extra) - gUsed;
          if (gLeft >= 1 && gLeft <= lead) {
            this._fire(day, `grp_${g.id}`, `Nhóm "${g.name}" sắp hết giờ ⏳`, `Chỉ còn ${gLeft} phút cho nhóm ${g.name} hôm nay.`, 'timer');
          }
        }
      } else {
        for (const rawPkg of (p.blockedPkgs || [])) {
          const k = normKey(rawPkg);
          const aLim = (Number((p.appLimits || {})[k]) || 30) + extra;
          const aLeft = aLim - (u.perPkgMinutes[k] || 0);
          if (aLeft >= 1 && aLeft <= lead) {
            const nm = displayName(k);
            this._fire(day, `app_${k}`, `${nm} sắp hết giờ riêng ⏳`, `Chỉ còn ${aLeft} phút cho ${nm} hôm nay.`, 'timer');
          }
        }
      }
    }
  }
}

module.exports = { DesktopReminders };
