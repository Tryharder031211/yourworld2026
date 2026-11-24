/* =============================================================================
   core/demo.js — Tài khoản (Google / Discord / Đồng bộ đám mây), Giao diện
   (6 theme × Sáng/Tối), Bảo vệ thời gian sử dụng và Quản lý dữ liệu cục bộ.
   ============================================================================= */
'use strict';

function openSettings(){
  const sh=UI.sheet({title:'Tài khoản & Cài đặt',icon:'gear'});
  const render=()=>{
    const s=Core.s;
    const accHTML=Cloud.online
      ?`<div class="card tint-moss" style="padding:12px;margin-bottom:10px">
          <div class="row">${avHTML(Cloud.profile,44)}
            <div class="grow" style="min-width:0">
              <b style="font-size:16px">${U.esc((Cloud.profile&&Cloud.profile.name)||s.name)}</b>
              <div class="muted">Mã bạn bè: <b>${U.esc((Cloud.profile&&Cloud.profile.friend_code)||'—')}</b> • ${(Cloud.meta().provider||'online').toUpperCase()}</div>
            </div>
            <button class="btn sm" data-a="copy" title="Sao chép mã bạn bè">${sv(IP.copy,15)}</button>
          </div>
          <div class="row" style="margin-top:10px">
            <input class="inp" id="renIn" maxlength="20" value="${U.esc(s.name)}" placeholder="Đổi tên hiển thị">
            <button class="btn sm pri" data-a="ren">Đổi tên</button>
          </div>
          <div class="row" style="margin-top:8px;flex-wrap:wrap">
            <button class="btn sm moss grow" data-a="sync">${sv(IP.cloud,16)} Đồng bộ đám mây</button>
            <button class="btn sm grow" data-a="reqs">${sv(IP.user,16)} Lời mời (${Cloud.incomingIds.length})</button>
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
        <div class="row" style="margin-bottom:8px">${sv(IP.roller,18)}<b class="grow">Giao diện màu sắc & Sáng/Tối</b><span class="tag moss">Miễn phí</span></div>
        ${themePickerHTML()}
      </div>

      <div class="card" style="padding:12px;margin-bottom:10px">
        <div class="row" style="flex-wrap:wrap"><b class="grow">${sv(IP.shield,18)} Bảo vệ & Thời gian sử dụng</b><span class="tag mid">${Bridge.mode()}</span></div>
        <div class="muted" style="margin:6px 0 8px">Chế độ khóa đang bật (1/3): <b>${Core.blockModeLabel()}</b> • Lịch ngủ: <b>${s.sleep.bed} → ${s.sleep.wake}</b></div>
        <div class="row" style="flex-wrap:wrap">
          <button class="btn sm moss grow" data-a="usagePanel">${sv(IP.clock,16)} Bảng tùy chỉnh thời gian</button>
          <button class="btn sm grow" data-a="sleepcfg">${sv(IP.bedtime,16)} Giờ ngủ 8h</button>
        </div>
      </div>

      <div class="card" style="padding:10px 12px">
        <div class="row" style="flex-wrap:wrap">
          <div class="grow"><b>Dữ liệu cục bộ</b><div class="muted">Xóa tiến trình lưu trên thiết bị này để bắt đầu lại</div></div>
          <button class="btn sm rose" data-a="reset">Xóa dữ liệu</button>
        </div>
      </div>`;
    fixAvatars(sh.body);
    bindOAuth(sh.body);
    bindThemePicker(sh.body,render);
    sh.body.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{ const a=b.dataset.a;
      if(a==='copy') copyText((Cloud.profile&&Cloud.profile.friend_code)||'','Đã sao chép mã bạn bè!');
      if(a==='ren'){ const v=(sh.body.querySelector('#renIn').value||'').trim(); if(!v) return; try{ await Cloud.rename(v); UI.toast('Đã đổi tên thành '+U.esc(v)); render(); }catch(e){ UI.toast('Lỗi đổi tên: '+e.message); } }
      if(a==='sync'){ await Cloud.push(); UI.toast('Đã đồng bộ tiến trình lên đám mây ☁️'); }
      if(a==='reqs'){ sh.close(); if(typeof openFriendRequests==='function') openFriendRequests(); else Nav.go('home','#requests'); }
      if(a==='logout'){ Cloud.signOut(); render(); }
      if(a==='usagePanel'){ sh.close(); if(typeof openUsageSettings==='function') openUsageSettings('mode'); else Nav.go('health','#timer'); }
      if(a==='sleepcfg'){ sh.close(); if(document.body.dataset.page==='health'&&typeof HealthPage!=='undefined') HealthPage.tab('sleep'); else Nav.go('health','#sleep'); }
      if(a==='reset'){
        UI.confirm({
          title:'Xóa dữ liệu cục bộ?',
          body:'Toàn bộ tiến trình lưu trên thiết bị này sẽ bị xóa và quay về màn hình khởi đầu.',
          okLabel:'Xóa dữ liệu', okCls:'rose',
          onOk:()=>{ Store.clear(); try{ sessionStorage.clear(); }catch(e){} location.href=Nav.url('home'); }
        });
      }
    });
  };
  render();
  sh.track(Cloud.on('auth',render));
  sh.track(Cloud.on('friends',render));
}
