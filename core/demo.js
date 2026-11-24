/* =============================================================================
   core/demo.js — Tài khoản (Google / Discord / Cloud sync), Cài đặt nhanh,
   và Công cụ kiểm thử gấp gọn để giao diện chính thức gọn sạch.
   ============================================================================= */
'use strict';

function openSettings(){
  const sh=UI.sheet({title:'Tài khoản & Cài đặt',icon:'gear'});
  const render=()=>{
    const s=Core.s;
    const accHTML=Cloud.online
      ?`<div class="card" style="padding:12px;margin-bottom:10px;background:#e4ecd2">
          <div class="row">${avHTML(Cloud.profile,44)}
            <div class="grow" style="min-width:0">
              <b style="font-size:16px">${U.esc((Cloud.profile&&Cloud.profile.name)||s.name)}</b>
              <div class="muted">Mã bạn bè: <b>${U.esc((Cloud.profile&&Cloud.profile.friend_code)||'—')}</b> • ${(Cloud.meta().provider||'online').toUpperCase()}</div>
            </div>
            <button class="btn sm" data-a="copy">${sv(IP.copy,15)}</button>
          </div>
          <div class="row" style="margin-top:10px">
            <input class="inp" id="renIn" maxlength="20" value="${U.esc(s.name)}" placeholder="Đổi tên hiển thị">
            <button class="btn sm pri" data-a="ren">Đổi tên</button>
          </div>
          <div class="row" style="margin-top:8px">
            <button class="btn sm moss grow" data-a="sync">${sv(IP.cloud,16)} Đồng bộ đám mây</button>
            <button class="btn sm grow" data-a="logout">${sv(IP.logout,16)} Đăng xuất</button>
          </div>
        </div>`
      :`<div class="card" style="padding:12px;margin-bottom:10px">
          <div class="row" style="margin-bottom:6px">${sv(IP.cloud,22)}<b>Đăng nhập để lưu đám mây & chơi online</b></div>
          <p class="muted" style="margin-bottom:8px">Đồng bộ giữa điện thoại, iPad, máy tính; mở Chat cộng đồng & Bảng xếp hạng thật.</p>
          ${oauthButtonsHTML()}
        </div>`;

    sh.body.innerHTML=`${accHTML}
      <div class="card" style="padding:12px;margin-bottom:10px">
        <div class="row"><b class="grow">${sv(IP.shield,18)} Bảo vệ & Giấc ngủ</b><span class="tag mid">${Bridge.mode()}</span></div>
        <div class="muted" style="margin:6px 0 8px">Lịch ngủ 8 tiếng: <b>${s.sleep.bed} → ${s.sleep.wake}</b> • Đang chặn <b>${Bridge.android?s.block.android.length+' app':Core.blockedDomains().length+' tên miền'}</b></div>
        <div class="row">
          <button class="btn sm grow" data-a="blocker">${sv(IP.shield,16)} Chọn app bị chặn</button>
          <button class="btn sm grow" data-a="sleepcfg">${sv(IP.bedtime,16)} Giờ ngủ & Điểm danh</button>
        </div>
      </div>

      <details class="demo-fold card">
        <summary><b>Công cụ kiểm thử nhanh</b> <span class="muted">(${U.hm(Core.now())}${s.offset?' • đang tua giờ':''})</span></summary>
        <div class="col" style="margin-top:10px">
          <button class="btn sm rose full" data-a="screen">${sv(IP.lock,18)} Thử hết giờ màn hình (Khóa OS)</button>
          <button class="btn sm mid full" data-a="bed">${sv(IP.moon,18)} Thử tới ${s.sleep.bed} (Khóa ngủ)</button>
          <div class="row"><button class="btn sm moss grow" data-a="good">${sv(IP.sun,16)} Sáng ngủ ngon</button><button class="btn sm grow" data-a="bad">${sv(IP.bolt,16)} Sáng thiếu ngủ</button></div>
          <button class="btn sm moss full" data-a="win">${sv(IP.can,18)} Mở khung giờ Tưới cây / Cho pet ăn</button>
          <div class="row"><button class="btn sm grow" data-a="gem">${sv(IP.gem,16)} +500 Gem</button><button class="btn sm grow" data-a="grow">${sv(IP.sprout,16)} +XP cây & pet</button></div>
          <div class="row"><button class="btn sm grow" data-a="income">${sv(IP.home,16)} Tua 8h thu phòng</button><button class="btn sm grow" data-a="month">${sv(IP.bill,16)} Tổng kết tháng</button></div>
          <div class="row"><button class="btn sm grow" data-a="real">Về giờ thực</button><button class="btn sm grow" data-a="reset">Xóa lưu cục bộ</button></div>
        </div>
      </details>`;
    fixAvatars(sh.body);
    bindOAuth(sh.body);
    sh.body.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{ const a=b.dataset.a;
      if(a==='copy') copyText((Cloud.profile&&Cloud.profile.friend_code)||'','Đã sao chép mã bạn bè!');
      if(a==='ren'){ const v=(sh.body.querySelector('#renIn').value||'').trim(); if(!v) return; try{ await Cloud.rename(v); UI.toast('Đã đổi tên thành '+U.esc(v)); render(); }catch(e){ UI.toast('Lỗi đổi tên: '+e.message); } }
      if(a==='sync'){ await Cloud.push(); UI.toast('Đã đồng bộ tiến trình lên đám mây ☁️'); }
      if(a==='logout'){ Cloud.signOut(); render(); }
      if(a==='blocker'){ sh.close(); if(document.body.dataset.page==='health'&&typeof HealthPage!=='undefined') HealthPage.tab('timer'); else Nav.go('health','#timer'); }
      if(a==='sleepcfg'){ sh.close(); if(document.body.dataset.page==='health'&&typeof HealthPage!=='undefined') HealthPage.tab('sleep'); else Nav.go('health','#sleep'); }
      if(a==='screen'){ sh.close(); Core.demoScreenOut(); }
      if(a==='bed'){ sh.close(); Core.demoBedtime(); }
      if(a==='good'||a==='bad'){ sh.close(); Core.demoMorning(a); }
      if(a==='win'){ Core.demoWindows(); UI.toast('Đã mở khung giờ Tưới cây & Cho ăn trong 10 phút!'); render(); }
      if(a==='gem'){ Core.addGems(500,'Kiểm thử'); }
      if(a==='grow'){ Core.s.garden.xp+=50; for(const id of Core.s.pets.owned) Core.s.pets.xp[id]=(Core.s.pets.xp[id]||0)+40; Core.save(); Core.emit('change'); UI.toast('+50 XP vườn, +40 XP mỗi pet'); }
      if(a==='income'){ Core.demoIncome(); UI.toast('Đã tua 8 giờ — vào Nhà thu Gem từ phòng!'); }
      if(a==='month'){ sh.close(); if(typeof ShopUI!=='undefined' && ShopUI.S && !ShopUI.S.ended) ShopUI.S.end(); else Nav.go('fomo','#demo-month'); }
      if(a==='real'){ Core.realTime(); UI.toast('Đã về giờ thực'); render(); }
      if(a==='reset'){ if(confirm('Xóa toàn bộ dữ liệu lưu trên thiết bị này?')){ Store.clear(); try{ sessionStorage.clear(); }catch(e){} location.href=Nav.url('home'); } }
    });
  };
  render();
  sh.track(Cloud.on('auth',render));
}
