/* =============================================================================
   module-suc-khoe/timer.js — Trung tâm Đồng hồ trước nhà & Bảng tùy chỉnh thời gian sử dụng:
   1) Đồng hồ thông minh: Auto quét GPS/Vị trí/Múi giờ • Tự chọn Timezone • Tự chỉnh giờ thủ công.
   2) Quét thời gian màn hình THẬT (Android UsageStats • Chrome Ext • Electron Desktop • Web session).
   3) Chọn ĐỘC QUYỀN 1 trong 3 chế độ khóa (chỉ 1 chế độ hoạt động tại một thời điểm):
      - Khóa toàn bộ (chừa tối đa 3 app khẩn cấp)
      - Khóa theo từng app riêng (đặt giới hạn phút riêng từng app)
      - Khóa theo nhóm app (tự tạo/sửa/xóa nhóm + đặt giới hạn từng nhóm)
   4) Bảng tùy chỉnh nhanh `openUsageSettings()` mở trực tiếp từ Màn hình khóa & Đồng hồ.
   5) Hệ thống nhắc hẹn thông minh (Reminders): Nhiệm vụ • Điểm danh • Giờ ngủ • Giờ dậy • Gần hết giờ.
   ============================================================================= */
'use strict';

const Timer={
  SITE_ICON:{'facebook.com':'fb','fb.com':'fb','messenger.com':'fb','tiktok.com':'tiktok','instagram.com':'ig','youtube.com':'yt','shopee.vn':'cart','lazada.vn':'cart'},
  MODES:[
    {id:'lockdown', title:'Khóa toàn bộ hằng ngày', desc:'Cơ chế khóa hằng ngày: đặt tổng giờ dùng toàn máy/ngày, hết giờ khóa tất cả (chừa tối đa 3 app khẩn cấp).'},
    {id:'apps',     title:'Khóa riêng từng app',    desc:'Cơ chế theo từng app (không dùng hạn mức ngày): mỗi app có phút riêng, hết app nào chỉ khóa đúng app đó.'},
    {id:'groups',   title:'Khóa theo nhóm app',     desc:'Cơ chế theo nhóm (không dùng hạn mức ngày): gom app vào nhóm chung quỹ giờ, hết nhóm nào chỉ khóa nhóm đó.'}
  ],
  PRESETS:[30,60,90,120,180],
  APP_LIM_OPTS:[15,30,45,60,90,120,180],
  _apps:null, _appsLoading:false, _deskCfg:null, _filter:'', _emFilter:'', _clockPanel:null, _scanning:false,

  appField(){ return Bridge.electron?'pc':'android'; },
  emField(){ return Bridge.electron?'emergencyPc':'emergency'; },

  ensureApps(onReady, force){
    if(!Bridge.nativeApps) return [];
    if(Bridge.android){
      if(!this._apps||force){
        try{ this._apps=JSON.parse(window.LuaChillNative.getInstalledApps()||'[]'); }catch(e){ this._apps=[]; }
      }
      return this._apps;
    }
    if(Bridge.electron){
      if((!this._apps||force) && !this._appsLoading){
        this._appsLoading=true;
        Bridge.getInstalledApps().then(list=>{
          this._apps=Array.isArray(list)?list:[];
          this._appsLoading=false;
          if(onReady) onReady();
        }).catch(()=>{ this._apps=[]; this._appsLoading=false; if(onReady) onReady(); });
      }
      if(!this._deskCfg && window.LuaChillDesktop.getSettings){
        window.LuaChillDesktop.getSettings().then(cfg=>{
          this._deskCfg=cfg||{autoLaunch:false};
          if(onReady) onReady();
        }).catch(()=>{ this._deskCfg={autoLaunch:false}; });
      }
      return this._apps||[];
    }
    return [];
  },

  /* ---------------- 1) ĐỒNG HỒ & VỊ TRÍ / MÚI GIỜ ---------------- */
  clockCard(showPanelBtn=true){
    const c=Core.s.clock, n=Core.now(), hm=U.hm(n), sec=U.pad(n.getSeconds());
    const dateStr=`${U.pad(n.getDate())}/${U.pad(n.getMonth()+1)}/${n.getFullYear()}`;
    const modeTag=c.mode==='manual'?'Thủ công':c.mode==='tz'?'Tự chọn múi giờ':'Tự động';
    let sub='';
    if(this._clockPanel==='tz'){
      const opts=DATA.TIMEZONES.map(z=>`<option value="${U.esc(z.tz)}" ${z.tz===c.tz?'selected':''}>${U.esc(z.label)} (${ClockUtil.utcLabel(z.tz)})</option>`).join('');
      const hasCur=DATA.TIMEZONES.some(z=>z.tz===c.tz);
      sub=`<div class="sub-box">
        <label class="muted"><b>Chọn múi giờ (Timezone):</b></label>
        <select class="inp" id="tzSel" style="margin-top:4px;font-size:14px">${!hasCur?`<option value="${U.esc(c.tz)}" selected>${U.esc(c.tz)} (${ClockUtil.utcLabel(c.tz)})</option>`:''}${opts}</select>
        <div class="row" style="margin-top:8px">
          <input class="inp" id="tzCustom" placeholder="Hoặc nhập IANA (vd: Asia/Tokyo)" style="font-size:13px;padding:6px 10px">
          <button class="btn sm pri" data-a="applyTz">Áp dụng</button>
        </div>
      </div>`;
    } else if(this._clockPanel==='manual'){
      sub=`<div class="sub-box">
        <label class="muted"><b>Tự chỉnh giờ (khi không quét được khu vực):</b></label>
        <div class="row" style="margin-top:6px;flex-wrap:wrap">
          <input class="inp" type="time" id="manTime" value="${hm}" style="flex:1;min-width:120px">
          <input class="inp" type="date" id="manDate" value="${U.ymd(n)}" style="flex:1;min-width:140px">
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn sm pri grow" data-a="applyMan">Lưu giờ thủ công</button>
          <button class="btn sm" data-a="resetAuto">Về giờ máy</button>
        </div>
      </div>`;
    }
    return `<div class="card tint-moss" style="padding:12px;margin-bottom:10px">
      <div class="row" style="align-items:flex-start;gap:10px;flex-wrap:wrap">
        ${sv(IP.clock,36)}
        <div class="grow" style="min-width:150px">
          <div class="row" style="gap:6px;flex-wrap:wrap">
            <b class="txt-accent" style="font-size:22px;line-height:1" id="liveClk">${hm}:${sec}</b>
            <span class="tag moss">${modeTag}</span>
          </div>
          <div class="muted" style="margin-top:3px">${dateStr} • <b>${U.esc(c.region||c.tz)}</b> (${U.esc(Core.clockLabel())})</div>
        </div>
        ${showPanelBtn?`<button class="btn sm pri" data-a="openPanel" title="Mở bảng tùy chỉnh thời gian sử dụng">${sv(IP.gear,15)} Bảng tùy chỉnh</button>`:''}
      </div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">
        <button class="btn sm moss grow" data-a="scanLoc" ${this._scanning?'disabled':''}>${sv(IP.pin,15)} ${this._scanning?'Đang quét vị trí...':'Auto quét vị trí / giờ'}</button>
        <button class="btn sm ${this._clockPanel==='tz'?'mid':''}" data-clk="tz">${sv(IP.globe,15)} Múi giờ</button>
        <button class="btn sm ${this._clockPanel==='manual'?'mid':''}" data-clk="manual">${sv(IP.clock,15)} Tự set giờ</button>
      </div>
      ${sub}
    </div>`;
  },

  /* ---------------- 2) QUÉT THỜI GIAN SỬ DỤNG THẬT ---------------- */
  usageRows(){
    const s=Core.s, sc=s.screen, mode=s.block.mode||'apps', extra=sc.extra||0, dailyLim=Math.max(1,sc.limit+extra);
    const data=Object.keys(sc.allSites||{}).length?sc.allSites:(sc.sites||{});
    const entries=Object.entries(data).filter(([,m])=>m>0).sort((a,b)=>b[1]-a[1]);
    if(!entries.length){
      return `<p class="muted" style="margin-top:6px">${Bridge.realUsage
        ?'Chưa ghi nhận phút sử dụng nào hôm nay (hoặc chưa bật quyền Usage Access). Bấm <b>Quét ngay</b> để cập nhật.'
        :'Đang đo phiên mở web theo giây thực (60 giây = 1 phút). Để quét thời gian tất cả app trên điện thoại hoặc PC, hãy cài <b>App Android</b>, <b>Chrome Extension</b> hoặc <b>App Desktop (Electron)</b>.'}</p>`;
    }
    return entries.slice(0,10).map(([d,m])=>{
      const ik=this.SITE_ICON[d]||'shield';
      const bg=APPS[ik]?APPS[ik].bg:C.mn;
      const appLim=mode==='apps'?(Number(s.block.appLimits[d])?Number(s.block.appLimits[d])+extra:0):0;
      const cap=mode==='lockdown'?dailyLim:(appLim||60);
      return `<div class="row" style="margin-top:7px">
        <span class="web-ic" style="background:${bg}">${sv(IP[ik]||IP.shield,14)}</span>
        <b class="grow" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(d)}</b>
        <div style="width:92px">${UI.bar(m/cap*100,appLim&&m>=appLim?'rose':mode==='lockdown'&&m>=dailyLim?'rose':'mid')}</div>
        <b style="min-width:52px;text-align:right;font-size:12.5px">${m}p${appLim?`/${appLim}p`:''}</b>
      </div>`;
    }).join('');
  },

  /* ---------------- 3) QUYỀN ANDROID & CÀI ĐẶT ELECTRON PC ---------------- */
  androidPermsHTML(){
    let p={usage:false,accessibility:false,overlay:false,notify:true};
    try{ p={...p,...JSON.parse(window.LuaChillNative.getPermissions())}; }catch(e){}
    const items=[
      ['usage','Đọc thời gian dùng app thật (Usage Access)',p.usage],
      ['accessibility','Dịch vụ phát hiện & khóa app (Accessibility)',p.accessibility],
      ['overlay','Hiển thị đè trên app khác (Draw Over Other Apps)',p.overlay]
    ];
    const allOk=p.usage&&p.accessibility&&p.overlay;
    return `<div class="card ${allOk?'tint-moss':'tint-rose'}" style="padding:10px 12px;margin-bottom:10px">
      <div class="row" style="flex-wrap:wrap"><b class="grow">${sv(IP.shield,18)} Quyền chặn thật trên Android</b><span class="tag ${allOk?'moss':'rose'}">${allOk?'Đủ 3 quyền ✓':'Cần bật đủ 3 quyền'}</span></div>
      <p class="muted" style="margin-top:3px">Khi chạm giới hạn, màn hình phủ <b>Draw Over Other Apps</b> sẽ khóa ngay ứng dụng và chỉ cho phép <b>Quay về Lừa Chill</b> hoặc <b>Đóng tất cả & về Màn hình chính</b>.</p>
      ${items.map(([k,n,ok])=>`<div class="row" style="margin-top:6px"><span class="grow" style="font-size:12.5px">${n}</span>${ok?'<span class="tag moss">Đã bật ✓</span>':`<button class="btn sm rose" data-perm="${k}">Bật ngay</button>`}</div>`).join('')}
      ${!p.notify?`<div class="row" style="margin-top:6px"><span class="grow" style="font-size:12.5px">Thông báo nhắc hẹn hệ thống</span><button class="btn sm" data-perm="notify">Bật thông báo</button></div>`:''}
    </div>`;
  },

  desktopBannerHTML(){
    const cfg=this._deskCfg||{autoLaunch:false};
    return `<div class="card tint-moss" style="padding:10px 12px;margin-bottom:10px">
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <b class="grow">${sv(IP.shield,18)} Chặn app thật trên PC (Electron)</b>
        <span class="tag moss">Đang chạy nền ✓</span>
        <button class="btn sm" data-a="refreshPcApps" title="Quét lại các ứng dụng đang mở">↻ Quét app đang mở</button>
      </div>
      <p class="muted" style="margin-top:4px">Đóng cửa sổ sẽ thu nhỏ xuống khay hệ thống (System Tray) để tiếp tục đo màn hình, bắn nhắc hẹn và bật <b>màn hình khóa toàn màn hình</b> khi chạm giới hạn.</p>
      <div class="row" style="margin-top:8px">
        <span class="grow" style="font-size:13px"><b>Khởi động cùng máy tính</b> (tự đo ngay khi bật PC)</span>
        <label class="sw-tog"><input type="checkbox" id="pcAutoLaunch" ${cfg.autoLaunch?'checked':''}><span></span></label>
      </div>
    </div>`;
  },

  /* ---------------- 4) CHỌN ĐỘC QUYỀN 1 TRONG 3 CHẾ ĐỘ KHÓA (MỖI CHẾ ĐỘ 1 CƠ CHẾ RIÊNG) ---------------- */
  dailyLimitBoxHTML(){
    const s=Core.s, sc=s.screen, lim=sc.limit+sc.extra, used=sc.totalUsed||sc.used||0, rem=Math.max(0,lim-used);
    return `<div class="card" style="padding:10px 12px;margin-bottom:10px">
      <div class="row" style="margin-bottom:4px">
        <b class="grow">${sv(IP.clock,16)} Giới hạn tổng thời gian hằng ngày</b>
        <span class="tag ${rem<=0?'rose':'moss'}">${rem>0?`Còn ${rem}p`:'Đã hết giờ'}</span>
      </div>
      <div class="row" style="margin-top:6px"><button class="btn sm" data-a="-">–15p</button><div class="grow center big-num" style="font-size:22px">${Math.floor(sc.limit/60)}h${U.pad(sc.limit%60)} / ngày</div><button class="btn sm" data-a="+">+15p</button></div>
      <div class="preset-row">${this.PRESETS.map(m=>`<button class="btn sm ${sc.limit===m?'mid':''}" data-preset="${m}">${m>=60?(m/60)+'h':m+'p'}</button>`).join('')}</div>
      <div class="muted center" style="margin-top:5px">Đã dùng toàn máy hôm nay: <b>${used}p / ${lim}p</b>${sc.extra?` (gồm +${sc.extra}p thưởng Quest)`:''}</div>
    </div>`;
  },

  modeLockdownHTML(includeLimitBox=false){
    const b=Core.s.block, sc=Core.s.screen, limBox=includeLimitBox?this.dailyLimitBoxHTML():'';
    if(Bridge.nativeApps){
      const apps=this._apps||[], emKey=this.emField();
      const picked=b[emKey]||[], pickedSet=new Set(picked.map(x=>x.pkg||x));
      const q=this._emFilter.trim().toLowerCase();
      const list=apps.filter(a=>!q||(a.name||'').toLowerCase().includes(q)||(a.pkg||'').toLowerCase().includes(q));
      const devWord=Bridge.electron?'trên PC':'trên điện thoại';
      return `<div class="card tint-warm" style="padding:10px 12px;margin-top:10px">
        ${limBox}
        <div class="row"><b class="grow">Chọn tối đa 3 app khẩn cấp được phép mở</b><span class="tag ${picked.length===3?'rose':'moss'}">${picked.length}/${DATA.MAX_EMERGENCY} app</span></div>
        <p class="muted" style="margin:4px 0 8px">Khi tổng thời gian dùng hằng ngày chạm <b>${Math.floor(sc.limit/60)}h${U.pad(sc.limit%60)}</b> (hoặc vào giờ ngủ), <b>tất cả app khác ${devWord} sẽ bị khóa</b>. Chỉ Lừa Chill${Bridge.android?', Cuộc gọi khẩn cấp':''} và tối đa 3 app bạn chọn dưới đây được phép mở.</p>
        ${picked.length?`<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">${picked.map(x=>`<span class="tag moss">${U.esc(x.name||x.pkg)} <button class="x-mini" data-rmem="${U.esc(x.pkg||x)}">×</button></span>`).join('')}</div>`:''}
        <input class="inp" id="emFilter" placeholder="${Bridge.electron?'Tìm app PC khẩn cấp (Zalo, VS Code, Word...)':'Tìm app khẩn cấp (Zalo, Bản đồ, Tin nhắn...)'}" value="${U.esc(this._emFilter)}" style="margin-bottom:8px;font-size:13.5px">
        <div class="app-list">${this._appsLoading?'<p class="muted center">Đang quét danh sách ứng dụng...</p>':(list.map(a=>{
          const on=pickedSet.has(a.pkg), dis=!on&&picked.length>=DATA.MAX_EMERGENCY;
          return `<label class="app-pick ${on?'on':''}" style="${dis?'opacity:.5':''}"><input type="checkbox" data-empkg="${U.esc(a.pkg)}" data-emname="${U.esc(a.name)}" ${on?'checked':''} ${dis?'disabled':''}><span class="grow"><b>${U.esc(a.name)}</b> ${a.running?'<span class="tag moss" style="font-size:10px;padding:1px 6px">Đang mở</span>':''}<span class="muted" style="display:block;font-size:11px">${U.esc(a.pkg)}</span></span></label>`;
        }).join('')||'<p class="muted center">Không tìm thấy ứng dụng.</p>')}</div>
      </div>`;
    }
    const list=b.emergencyWeb||[];
    return `<div class="card tint-warm" style="padding:10px 12px;margin-top:10px">
      ${limBox}
      <div class="row"><b class="grow">Khóa toàn bộ hằng ngày — Tối đa 3 trang/app khẩn cấp</b><span class="tag ${list.length>=3?'rose':'moss'}">${list.length}/${DATA.MAX_EMERGENCY}</span></div>
      <p class="muted" style="margin:4px 0 8px">Khi chạm tổng hạn mức hằng ngày (<b>${Math.floor(sc.limit/60)}h${U.pad(sc.limit%60)}</b>), toàn bộ web giải trí (hoặc toàn bộ app trên Android/PC) sẽ bị khóa, chỉ giữ mở các mục khẩn cấp sau:</p>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">${list.map(d=>`<span class="tag moss">${U.esc(d)} <button class="x-mini" data-rmemw="${U.esc(d)}">×</button></span>`).join('')||'<span class="muted">Chưa chọn trang khẩn cấp nào</span>'}</div>
      <div class="row">
        <input class="inp" id="emWebIn" placeholder="Thêm trang khẩn cấp (vd: maps.google.com)" maxlength="60" ${list.length>=DATA.MAX_EMERGENCY?'disabled':''}>
        <button class="btn sm pri" data-a="addEmWeb" ${list.length>=DATA.MAX_EMERGENCY?'disabled':''}>Thêm</button>
      </div>
    </div>`;
  },

  modeAppsHTML(){
    const b=Core.s.block, limOpts=this.APP_LIM_OPTS, extra=Core.s.screen.extra||0;
    if(Bridge.nativeApps){
      const apps=this._apps||[], fKey=this.appField(), picked=new Set((b[fKey]||[]).map(x=>x.pkg||x));
      const q=this._filter.trim().toLowerCase();
      const list=apps.filter(a=>!q||(a.name||'').toLowerCase().includes(q)||(a.pkg||'').toLowerCase().includes(q));
      return `<div class="card tint-warm" style="padding:10px 12px;margin-top:10px">
        <p class="muted" style="margin-bottom:8px"><b>Cơ chế riêng theo từng app</b> (không khóa theo tổng ngày): tick chọn app ${Bridge.electron?'trên PC':'trên điện thoại'} và đặt <b>số phút riêng</b> cho mỗi app — hết giờ app nào chỉ khóa đúng app đó.</p>
        <input class="inp" id="appFilter" placeholder="${Bridge.electron?'Tìm ứng dụng PC (Discord, Steam, Chrome, Game...)':'Tìm ứng dụng trên máy...'}" value="${U.esc(this._filter)}" style="margin-bottom:8px;font-size:13.5px">
        <div class="app-list">${this._appsLoading?'<p class="muted center">Đang quét danh sách ứng dụng...</p>':(list.map(a=>{
          const on=picked.has(a.pkg), cur=Core.appLimitOf(a.pkg), used=Core.appUsedOf(a.pkg,a.name);
          return `<div class="app-pick ${on?'on':''}">
            <input type="checkbox" data-pkg="${U.esc(a.pkg)}" data-name="${U.esc(a.name)}" ${on?'checked':''}>
            <span class="grow" style="min-width:0"><b>${U.esc(a.name)}</b> ${a.running?'<span class="tag moss" style="font-size:10px;padding:1px 6px">Đang mở</span>':''}${on?` <span class="tag ${used>=cur+extra?'rose':''}" style="font-size:10px;padding:0 5px">${used}/${cur+extra}p</span>`:''}<span class="muted" style="display:block;font-size:11px;overflow:hidden;text-overflow:ellipsis">${U.esc(a.pkg)}</span></span>
            ${on?`<select class="lim-sel" data-lim="${U.esc(a.pkg)}" title="Giới hạn riêng cho ${U.esc(a.name)}">${limOpts.map(m=>`<option value="${m}" ${cur===m?'selected':''}>${m}p</option>`).join('')}</select>`:''}
          </div>`;
        }).join('')||'<p class="muted center">Không tìm thấy ứng dụng.</p>')}</div>
      </div>`;
    }
    return `<div class="card tint-warm" style="padding:10px 12px;margin-top:10px">
      <p class="muted" style="margin-bottom:8px"><b>Cơ chế riêng theo từng app/web</b> (không khóa theo tổng ngày): chọn từng trang và đặt <b>hạn mức phút riêng</b> — hết giờ trang nào chỉ khóa đúng trang đó:</p>
      <div class="web-grid">${DATA.WEB_APPS.map(a=>{
        const on=b.web.includes(a.id), bg=APPS[a.icon]?APPS[a.icon].bg:'#eaf0dc', key=a.domains[0], cur=Core.appLimitOf(key);
        return `<div class="web-pill ${on?'on':''}" data-webwrap>
          <button class="web-tap" data-web="${a.id}"><span class="web-ic" style="background:${bg}">${sv(IP[a.icon]||IP.shield,14)}</span><span>${a.name}</span></button>
          ${on?`<select class="lim-sel" data-lim="${U.esc(key)}" title="Giới hạn riêng">${limOpts.map(m=>`<option value="${m}" ${cur===m?'selected':''}>${m}p</option>`).join('')}</select>`:''}
        </div>`;
      }).join('')}</div>
      <div class="row" style="margin-top:10px">
        <input class="inp" id="customDom" placeholder="Thêm web khác (vd: twitch.tv)" maxlength="60">
        <button class="btn sm pri" data-a="addDom">Thêm</button>
      </div>
      ${b.custom.length?`<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${b.custom.map(d=>{
        const cur=Core.appLimitOf(d);
        return `<span class="tag">${U.esc(d)} <select class="lim-sel" data-lim="${U.esc(d)}" style="border:0;padding:0 2px">${limOpts.map(m=>`<option value="${m}" ${cur===m?'selected':''}>${m}p</option>`).join('')}</select> <button class="x-mini" data-rmdom="${U.esc(d)}" title="Xóa">×</button></span>`;
      }).join('')}</div>`:''}
    </div>`;
  },

  modeGroupsHTML(){
    const groups=Core.s.block.groups||[], extra=Core.s.screen.extra||0;
    return `<div class="card tint-warm" style="padding:10px 12px;margin-top:10px">
      <div class="row" style="margin-bottom:8px">
        <p class="muted grow"><b>Cơ chế riêng theo nhóm app</b> (không khóa theo tổng ngày): chạm giới hạn nhóm nào chỉ khóa các app thuộc nhóm đó.</p>
        <button class="btn sm pri" data-a="addGrp">${sv(IP.plus,14)} Tạo nhóm</button>
      </div>
      <div class="col">${groups.map(g=>{
        const used=Core.groupUsed(g), lim=g.limit+extra, pct=U.clamp(used/Math.max(1,lim)*100);
        const fKey=this.appField();
        const tags=Bridge.nativeApps
          ?(g[fKey]||[]).map(a=>a.name||a.pkg)
          :[...DATA.WEB_APPS.filter(a=>(g.web||[]).includes(a.id)).map(a=>a.name),...(g.custom||[])];
        return `<div class="card" style="padding:10px 12px">
          <div class="row">
            ${sv(IP.layers,18)}
            <b class="grow" style="font-size:14.5px">${U.esc(g.name)}</b>
            <span class="tag ${used>=lim?'rose':'mid'}">${used}p / ${lim}p</span>
            <button class="btn sm" data-edgrp="${g.id}">Sửa</button>
            <button class="btn sm rose" data-delgrp="${g.id}" title="Xóa">×</button>
          </div>
          <div style="margin:6px 0">${UI.bar(pct,used>=lim?'rose':'')}</div>
          <div class="row" style="gap:4px;flex-wrap:wrap">${tags.length?tags.map(t=>`<span class="tag">${U.esc(t)}</span>`).join(''):'<span class="muted">Chưa gán ứng dụng nào — bấm Sửa để thêm</span>'}</div>
        </div>`;
      }).join('')||'<p class="muted center">Chưa có nhóm nào. Bấm "Tạo nhóm" để thêm!</p>'}</div>
    </div>`;
  },

  openGroupEditor(existing, onDone){
    const g=existing?JSON.parse(JSON.stringify(existing)):{id:null,name:'',limit:30,web:[],custom:[],android:[],pc:[]};
    const m=UI.modal(`<div class="row"><h2 class="grow txt-accent">${existing?'Sửa nhóm ứng dụng':'Tạo nhóm ứng dụng mới'}</h2><button class="x-btn" data-x>${sv(IP.x,16)}</button></div>
      <div class="col" style="margin-top:10px">
        <label class="muted"><b>Tên nhóm</b></label>
        <input class="inp" id="gName" maxlength="24" value="${U.esc(g.name)}" placeholder="VD: Mạng xã hội, Game tối...">
        <label class="muted"><b>Giới hạn chung cho cả nhóm (phút/ngày)</b></label>
        <div class="row"><button class="btn sm" id="gMinus">–10p</button><b class="grow center txt-accent" id="gLimV" style="font-size:20px">${g.limit} phút</b><button class="btn sm" id="gPlus">+10p</button></div>
        <label class="muted"><b>Chọn ứng dụng thuộc nhóm này</b></label>
        <div id="gItems"></div>
        <button class="btn pri full" id="gSave" style="margin-top:6px">Lưu nhóm</button>
      </div>`);
    const renderItems=()=>{
      const box=m.box.querySelector('#gItems');
      if(Bridge.nativeApps){
        const fKey=this.appField(), apps=this._apps||[], picked=new Set((g[fKey]||[]).map(x=>x.pkg||x));
        box.innerHTML=`<div class="app-list" style="max-height:190px">${apps.map(a=>`<label class="app-pick ${picked.has(a.pkg)?'on':''}"><input type="checkbox" data-gp="${U.esc(a.pkg)}" data-gn="${U.esc(a.name)}" ${picked.has(a.pkg)?'checked':''}><span><b>${U.esc(a.name)}</b> ${a.running?'<span class="tag moss" style="font-size:10px;padding:1px 6px">Đang mở</span>':''}</span></label>`).join('')||'<p class="muted center">Không có ứng dụng.</p>'}</div>`;
        box.querySelectorAll('[data-gp]').forEach(cb=>cb.onchange=()=>{
          const pkg=cb.dataset.gp, name=cb.dataset.gn;
          g[fKey]=(g[fKey]||[]).filter(x=>(x.pkg||x)!==pkg);
          if(cb.checked) g[fKey].push({pkg,name});
          renderItems();
        });
      } else {
        box.innerHTML=`<div class="web-grid">${DATA.WEB_APPS.map(a=>{
          const on=(g.web||[]).includes(a.id), bg=APPS[a.icon]?APPS[a.icon].bg:'#eaf0dc';
          return `<button class="web-pill ${on?'on':''}" data-gw="${a.id}"><span class="web-ic" style="background:${bg}">${sv(IP[a.icon]||IP.shield,14)}</span><span>${a.name}</span>${on?'<b>✓</b>':''}</button>`;
        }).join('')}</div>
        <div class="row" style="margin-top:8px"><input class="inp" id="gDomIn" placeholder="Thêm web (vd: twitch.tv)" style="font-size:13px"><button class="btn sm" id="gDomAdd">Thêm</button></div>
        ${(g.custom||[]).length?`<div class="row" style="gap:5px;flex-wrap:wrap;margin-top:6px">${g.custom.map(d=>`<span class="tag">${U.esc(d)} <button class="x-mini" data-grm="${U.esc(d)}">×</button></span>`).join('')}</div>`:''}`;
        box.querySelectorAll('[data-gw]').forEach(b=>b.onclick=()=>{
          const id=b.dataset.gw; g.web=g.web.includes(id)?g.web.filter(x=>x!==id):[...g.web,id]; renderItems();
        });
        box.querySelector('#gDomAdd').onclick=()=>{
          const d=(box.querySelector('#gDomIn').value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
          if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)){ UI.toast('Tên miền chưa hợp lệ'); return; }
          g.custom=[...new Set([...(g.custom||[]),d])]; renderItems();
        };
        box.querySelectorAll('[data-grm]').forEach(b=>b.onclick=()=>{ g.custom=g.custom.filter(x=>x!==b.dataset.grm); renderItems(); });
      }
    };
    renderItems();
    m.box.querySelector('[data-x]').onclick=()=>m.close();
    m.box.querySelector('#gMinus').onclick=()=>{ g.limit=Math.max(5,g.limit-10); m.box.querySelector('#gLimV').textContent=g.limit+' phút'; };
    m.box.querySelector('#gPlus').onclick=()=>{ g.limit=Math.min(480,g.limit+10); m.box.querySelector('#gLimV').textContent=g.limit+' phút'; };
    m.box.querySelector('#gSave').onclick=()=>{
      g.name=(m.box.querySelector('#gName').value||'').trim()||'Nhóm mới';
      Core.upsertGroup(g); UI.toast(`Đã lưu nhóm "${U.esc(g.name)}"`); m.close(); onDone&&onDone();
    };
  },

  blockerCard(includeDailyBox=false){
    const m=['lockdown','apps','groups'].includes(Core.s.block.mode)?Core.s.block.mode:'apps';
    return `${Bridge.android?this.androidPermsHTML():Bridge.electron?this.desktopBannerHTML():''}
      <div class="card" style="padding:12px;margin-bottom:10px">
        <div class="row" style="margin-bottom:8px;flex-wrap:wrap">${sv(IP.shield,20)}<b class="grow">Chế độ khóa riêng biệt (Chỉ bật 1 chế độ)</b><span class="tag mid">1/3 đang bật</span></div>
        <div class="mode-banner">
          ${sv(IP.lock,16)}
          <div class="grow">Đang bật duy nhất: <b>${Core.blockModeLabel(m)}</b> — 2 chế độ còn lại đang <b>TẮT</b>.</div>
        </div>
        <div class="mode-cards" role="radiogroup" aria-label="Chọn 1 chế độ khóa">
          ${this.MODES.map(o=>{
            const on=o.id===m;
            return `<button type="button" class="mode-opt ${on?'on':''}" data-mode="${o.id}" role="radio" aria-checked="${on}">
              <div class="mode-opt-h">
                <span class="mode-radio"></span>
                <b class="grow" style="font-size:13px">${o.title}</b>
                <span class="tag ${on?'moss':''}">${on?'ĐANG BẬT ✓':'Đang tắt'}</span>
              </div>
              <span class="muted" style="font-size:11.5px">${o.desc}</span>
            </button>`;
          }).join('')}
        </div>
        ${m==='lockdown'?this.modeLockdownHTML(includeDailyBox):m==='groups'?this.modeGroupsHTML():this.modeAppsHTML()}
      </div>`;
  },

  /* Thẻ trạng thái ở cột trái — tự biến đổi theo đúng cơ chế khóa của chế độ đang bật */
  modeStatusCardHTML(){
    const s=Core.s, sc=s.screen, mode=s.block.mode||'apps', bed=Core.isBedtime(), extra=sc.extra||0;
    if(mode==='lockdown'){
      const rem=Core.screenRemaining(), lim=sc.limit+extra, pct=U.clamp(rem/Math.max(1,lim)*100), R=50, L=2*Math.PI*R;
      return `<div class="card" style="padding:12px">
        <div class="row" style="margin-bottom:6px"><b class="grow">Khóa toàn bộ hằng ngày</b><span class="tag mid">Hạn mức ngày</span></div>
        <div class="ring-wrap"><svg width="124" height="124" viewBox="0 0 130 130"><circle cx="65" cy="65" r="${R}" stroke="var(--border-dash)" stroke-width="12" fill="none"/><circle cx="65" cy="65" r="${R}" stroke="${rem<=20?C.rb:C.mg}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${L*pct/100} ${L}" transform="rotate(-90 65 65)"/><circle cx="65" cy="65" r="${R+6.5}" stroke="var(--border)" stroke-width="1.8" fill="none"/><circle cx="65" cy="65" r="${R-6.5}" stroke="var(--border)" stroke-width="1.8" fill="none"/></svg>
          <div class="lbl"><span class="big-num">${Math.max(0,rem)}</span><span style="font-size:12px">phút còn lại</span></div></div>
        <p class="center" style="font-weight:800;margin:6px 0 8px">${sc.locked?`<span class="tag rose">${sv(IP.lock,13)} Đang khóa toàn bộ</span>`:bed&&!s.night.broken?`<span class="tag mid">${sv(IP.moon,13)} Khóa giờ ngủ</span>`:`<span class="tag moss">${sv(IP.unlock,13)} Đang mở</span>`} Đã dùng ${sc.totalUsed||sc.used}p / ${lim}p${extra?` (+${extra}p)`:''}</p>
        <div class="divider"></div>
        <b>Giới hạn tổng hằng ngày (của chế độ Khóa toàn bộ)</b>
        <div class="row" style="margin-top:6px"><button class="btn sm" data-a="-">–15p</button><div class="grow center big-num" style="font-size:23px">${Math.floor(sc.limit/60)}h${U.pad(sc.limit%60)}</div><button class="btn sm" data-a="+">+15p</button></div>
        <div class="preset-row">${this.PRESETS.map(m=>`<button class="btn sm ${sc.limit===m?'mid':''}" data-preset="${m}">${m>=60?(m/60)+'h':m+'p'}</button>`).join('')}</div>
        ${sc.locked?`<button class="btn rose full" style="margin-top:8px" data-a="ov">Mở Màn hình Khóa</button>`:''}
      </div>`;
    }
    if(mode==='groups'){
      const groups=s.block.groups||[], lockedN=groups.filter(g=>Core.groupUsed(g)>=g.limit+extra).length;
      return `<div class="card" style="padding:12px">
        <div class="row" style="margin-bottom:6px"><b class="grow">Khóa theo nhóm app</b><span class="tag ${lockedN?'rose':'moss'}">${lockedN?`${lockedN}/${groups.length} nhóm khóa`:`${groups.length} nhóm đang mở`}</span></div>
        <p class="muted" style="margin-bottom:8px">Chế độ này <b>không dùng giới hạn tổng hằng ngày</b> — mỗi nhóm có quỹ giờ riêng bên dưới.</p>
        ${groups.slice(0,5).map(g=>{
          const u=Core.groupUsed(g), lim=g.limit+extra;
          return `<div style="margin-top:7px"><div class="row" style="margin-bottom:3px"><b class="grow" style="font-size:13px">${U.esc(g.name)}</b><span class="tag ${u>=lim?'rose':''}">${u}p / ${lim}p</span></div>${UI.bar(u/Math.max(1,lim)*100,u>=lim?'rose':'mid')}</div>`;
        }).join('')||'<p class="muted">Chưa có nhóm nào — tạo nhóm ở khung bên dưới.</p>'}
        <div class="muted center" style="margin-top:10px">Tổng thời gian toàn máy hôm nay: <b>${sc.totalUsed||sc.used} phút</b></div>
      </div>`;
    }
    /* mode === 'apps' */
    const apps=Core.activeAppEntries(), lockedN=apps.filter(a=>a.locked).length;
    return `<div class="card" style="padding:12px">
      <div class="row" style="margin-bottom:6px"><b class="grow">Khóa riêng từng app</b><span class="tag ${lockedN?'rose':'moss'}">${lockedN?`${lockedN}/${apps.length} app khóa`:`${apps.length} app đang canh`}</span></div>
      <p class="muted" style="margin-bottom:8px">Chế độ này <b>không dùng giới hạn tổng hằng ngày</b> — mỗi app dùng hạn mức phút riêng, hết app nào khóa đúng app đó.</p>
      ${apps.slice(0,5).map(a=>`<div style="margin-top:7px"><div class="row" style="margin-bottom:3px"><b class="grow" style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(a.name)}</b><span class="tag ${a.locked?'rose':''}">${a.used}p / ${a.limit}p</span></div>${UI.bar(a.used/Math.max(1,a.limit)*100,a.locked?'rose':'mid')}</div>`).join('')||'<p class="muted">Chưa chọn app nào — tích chọn app & số phút riêng ở bên dưới.</p>'}
      <div class="muted center" style="margin-top:10px">Tổng thời gian toàn máy hôm nay: <b>${sc.totalUsed||sc.used} phút</b></div>
    </div>`;
  },

  html(){
    const s=Core.s;
    return `${this.clockCard(true)}
      <div class="h-grid">
        ${this.modeStatusCardHTML()}
        <div class="col" style="gap:10px">
          <div class="card" style="padding:12px">
            <div class="row"><b class="grow">Quét thời gian dùng hôm nay</b><span class="tag ${Bridge.realUsage?'moss':''}">${Bridge.realUsage?'Đo thật':'Phiên web'}</span><button class="btn sm" data-a="rescan" title="Quét lại">↻</button></div>
            ${this.usageRows()}
          </div>
          <div class="card tint-teal" style="padding:12px">
            <div class="row">${sv(IP.bedtime,24)}<b class="grow">Khóa ngủ ${s.sleep.bed} → ${s.sleep.wake}</b><button class="btn sm" data-a="sleep">Đổi giờ</button></div>
            <div class="muted" style="margin-top:4px">Chế độ chặn đang bật (1/3): <b>${Core.blockModeLabel()}</b></div>
            <div class="muted" style="margin-top:2px">Nền tảng: <b>${Bridge.mode()}</b></div>
            <button class="btn sm moss full" style="margin-top:8px" data-a="openPanel">${sv(IP.gear,15)} Mở Bảng tùy chỉnh nhanh</button>
          </div>
        </div>
      </div>
      <div style="margin-top:10px">${this.blockerCard(false)}</div>`;
  },

  bindEvents(el, draw, onSleep, onCloseSheet){
    const sc=Core.s.screen;
    el.querySelectorAll('[data-clk]').forEach(b=>b.onclick=()=>{ this._clockPanel=this._clockPanel===b.dataset.clk?null:b.dataset.clk; draw(); });
    el.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
      const next=b.dataset.mode;
      if(Core.s.block.mode===next) return;
      Core.setBlockMode(next);
      UI.toast(`Đã bật "${Core.blockModeLabel(next)}" — 2 chế độ còn lại đã tắt.`);
      draw();
    });
    el.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
      Core.setLimit(+b.dataset.preset);
      UI.toast(`Đã đặt giới hạn ngày: ${Math.floor(+b.dataset.preset/60)}h${U.pad(+b.dataset.preset%60)}`);
      draw();
    });
    el.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{ const a=b.dataset.a;
      if(a==='-'){ Core.setLimit(Math.max(15,sc.limit-15)); draw(); }
      if(a==='+'){ Core.setLimit(Math.min(480,sc.limit+15)); draw(); }
      if(a==='ov') Overlays.screen(true);
      if(a==='openPanel') openUsageSettings();
      if(a==='sleep'){ if(onSleep) onSleep(); else { onCloseSheet&&onCloseSheet(); Nav.go('health','#sleep'); } }
      if(a==='goRemind'){ onCloseSheet&&onCloseSheet(); if(document.body.dataset.page==='health'&&typeof HealthPage!=='undefined') HealthPage.tab('remind'); else Nav.go('health','#remind'); }
      if(a==='goFull'){ onCloseSheet&&onCloseSheet(); if(document.body.dataset.page==='health'&&typeof HealthPage!=='undefined') HealthPage.tab('timer'); else Nav.go('health','#timer'); }
      if(a==='refreshPcApps'){ this.ensureApps(()=>{ UI.toast('Đã cập nhật danh sách ứng dụng PC!'); draw(); }, true); draw(); }
      if(a==='rescan'){
        const u=await Bridge.getUsage();
        if(u){ Core.s.screen.allSites=u.allSites||u.allApps||u.sites||u.apps||{}; Core.s.screen.sites=u.sites||u.apps||{}; Core.s.screen.totalUsed=u.totalMinutes??u.minutes??Core.s.screen.totalUsed; Core.save(); UI.toast('Đã quét cập nhật thời gian dùng thật!'); }
        else UI.toast('Đang đo thời gian phiên web theo giây thực.');
        draw();
      }
      if(a==='scanLoc'){
        this._scanning=true; draw();
        const r=await Core.scanLocationTime(); this._scanning=false;
        UI.toast(r.ok?`Đã quét giờ: ${r.tz} (${r.region})`:r.region);
        if(!r.ok) this._clockPanel='tz';
        draw();
      }
      if(a==='applyTz'){
        const custom=(el.querySelector('#tzCustom').value||'').trim(), tz=custom||el.querySelector('#tzSel').value;
        try{ new Intl.DateTimeFormat('en-US',{timeZone:tz}); }catch(e){ UI.toast('Múi giờ không hợp lệ (vd: Asia/Ho_Chi_Minh)'); return; }
        const label=(DATA.TIMEZONES.find(x=>x.tz===tz)||{}).label||tz;
        Core.setClockTimezone(tz,label); this._clockPanel=null; UI.toast(`Đã chuyển sang múi giờ ${tz}`); draw();
      }
      if(a==='applyMan'){
        const hm=el.querySelector('#manTime').value, dt=el.querySelector('#manDate').value;
        if(Core.setClockManual(hm,dt)){ this._clockPanel=null; UI.toast(`Đã đặt đồng hồ thủ công: ${hm}`); draw(); }
      }
      if(a==='resetAuto'){ Core.setClockAuto(ClockUtil.deviceTz(),'Tự động theo thiết bị'); this._clockPanel=null; UI.toast('Đã về giờ tự động theo thiết bị'); draw(); }
      if(a==='addDom'){
        const d=(el.querySelector('#customDom').value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
        if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)){ UI.toast('Tên miền chưa hợp lệ (vd: twitch.tv)'); return; }
        Core.setBlock('custom',[...Core.s.block.custom,d]); UI.toast('Đã thêm '+d); draw();
      }
      if(a==='addEmWeb'){
        const d=(el.querySelector('#emWebIn').value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
        if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)){ UI.toast('Tên miền chưa hợp lệ'); return; }
        const r=Core.setEmergency('emergencyWeb',[...new Set([...(Core.s.block.emergencyWeb||[]),d])]);
        if(!r.ok) UI.toast(r.msg); else UI.toast('Đã thêm trang khẩn cấp: '+d); draw();
      }
      if(a==='addGrp'){ this.openGroupEditor(null,draw); }
    });
    el.querySelectorAll('[data-web]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.web, cur=Core.s.block.web;
      Core.setBlock('web',cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]); draw(); });
    el.querySelectorAll('[data-rmdom]').forEach(b=>b.onclick=()=>{ Core.setBlock('custom',Core.s.block.custom.filter(x=>x!==b.dataset.rmdom)); draw(); });
    el.querySelectorAll('[data-rmemw]').forEach(b=>b.onclick=()=>{ Core.setEmergency('emergencyWeb',(Core.s.block.emergencyWeb||[]).filter(x=>x!==b.dataset.rmemw)); draw(); });
    el.querySelectorAll('[data-rmem]').forEach(b=>b.onclick=()=>{ const k=this.emField(); Core.setEmergency(k,(Core.s.block[k]||[]).filter(x=>(x.pkg||x)!==b.dataset.rmem)); draw(); });
    el.querySelectorAll('[data-lim]').forEach(sel=>sel.onchange=()=>{ Core.setAppLimit(sel.dataset.lim,+sel.value); UI.toast(`Đã đặt giới hạn riêng ${sel.value} phút`); draw(); });
    el.querySelectorAll('[data-edgrp]').forEach(b=>b.onclick=()=>{ const g=Core.s.block.groups.find(x=>x.id===b.dataset.edgrp); if(g) this.openGroupEditor(g,draw); });
    el.querySelectorAll('[data-delgrp]').forEach(b=>b.onclick=()=>{ if(confirm('Xóa nhóm ứng dụng này?')){ Core.deleteGroup(b.dataset.delgrp); draw(); } });
    el.querySelectorAll('[data-perm]').forEach(b=>b.onclick=()=>{ try{ window.LuaChillNative.openPermissionSettings(b.dataset.perm); }catch(e){} });
    const pcAuto=el.querySelector('#pcAutoLaunch');
    if(pcAuto && window.LuaChillDesktop && window.LuaChillDesktop.setAutoLaunch){
      pcAuto.onchange=async()=>{
        const ok=await window.LuaChillDesktop.setAutoLaunch(pcAuto.checked);
        this._deskCfg={...(this._deskCfg||{}),autoLaunch:ok};
        UI.toast(ok?'Đã bật khởi động Lừa Chill cùng máy tính':'Đã tắt khởi động cùng máy tính');
      };
    }
    const flt=el.querySelector('#appFilter');
    if(flt){ flt.oninput=()=>{ this._filter=flt.value; draw(); const nf=el.querySelector('#appFilter'); if(nf){ nf.focus(); nf.setSelectionRange(nf.value.length,nf.value.length); } }; }
    const ef=el.querySelector('#emFilter');
    if(ef){ ef.oninput=()=>{ this._emFilter=ef.value; draw(); const nf=el.querySelector('#emFilter'); if(nf){ nf.focus(); nf.setSelectionRange(nf.value.length,nf.value.length); } }; }
    el.querySelectorAll('[data-pkg]').forEach(cb=>cb.onchange=()=>{
      const fKey=this.appField(), pkg=cb.dataset.pkg, name=cb.dataset.name, cur=(Core.s.block[fKey]||[]).filter(x=>(x.pkg||x)!==pkg);
      if(cb.checked) cur.push({pkg,name});
      Core.setBlock(fKey,cur); draw(); });
    el.querySelectorAll('[data-empkg]').forEach(cb=>cb.onchange=()=>{
      const k=this.emField(), pkg=cb.dataset.empkg, name=cb.dataset.emname, cur=(Core.s.block[k]||[]).filter(x=>(x.pkg||x)!==pkg);
      if(cb.checked) cur.push({pkg,name});
      const r=Core.setEmergency(k,cur); if(!r.ok) UI.toast(r.msg); draw(); });
  },

  render(el,onSleep){
    let alive=true;
    const draw=()=>{ if(!alive) return; this.ensureApps(()=>{ if(alive&&!el.contains(document.activeElement)) draw(); }); el.innerHTML=this.html();
      this.bindEvents(el,draw,onSleep,null); };
    draw();
    const off=Core.on('tick',()=>{
      const lk=el.querySelector('#liveClk');
      if(lk){ const n=Core.now(); lk.textContent=`${U.hm(n)}:${U.pad(n.getSeconds())}`; }
    });
    const off2=Core.on('change',()=>{ if(!el.contains(document.activeElement)) draw(); });
    return ()=>{ alive=false; off(); off2(); };
  }
};

/* =============================================================================
   openUsageSettings() — Bảng tùy chỉnh thời gian sử dụng mở nhanh ở Màn hình khóa & Đồng hồ
   ============================================================================= */
function openUsageSettings(tabStart='mode'){
  let tab=tabStart==='clock'?'clock':'mode';
  const sh=UI.sheet({title:'Bảng Tùy Chỉnh Thời Gian Sử Dụng',icon:'clock',cls:'wide',onClose:()=>{
    if(typeof Overlays!=='undefined'){
      const os=document.getElementById('ovScreen'), ob=document.getElementById('ovBed');
      if(os&&os.classList.contains('on')) Overlays.screen(true);
      if(ob&&ob.classList.contains('on')) Overlays.bed(true);
    }
  }});
  let alive=true;
  const draw=()=>{
    if(!alive) return;
    Timer.ensureApps(()=>{ if(alive&&!sh.body.contains(document.activeElement)) draw(); });
    const bodyHTML=tab==='clock'
      ? Timer.clockCard(false)
      : Timer.blockerCard(true);
    sh.body.innerHTML=`<div class="seg" style="margin-bottom:10px">
        <button class="${tab==='mode'?'on':''}" data-ut="mode">${sv(IP.shield,14)} Chế độ khóa & Giới hạn (1/3)</button>
        <button class="${tab==='clock'?'on':''}" data-ut="clock">${sv(IP.globe,14)} Đồng hồ & Múi giờ</button>
      </div>
      ${bodyHTML}
      <div class="row" style="margin-top:10px;flex-wrap:wrap">
        <button class="btn sm grow" data-a="sleep">${sv(IP.bedtime,15)} Giờ ngủ 8 tiếng</button>
        <button class="btn sm grow" data-a="goRemind">${sv(IP.bell,15)} Nhắc hẹn</button>
        <button class="btn sm pri grow" data-a="goFull">${sv(IP.shield,15)} Mở trang Sức Khỏe</button>
      </div>`;
    sh.body.querySelectorAll('[data-ut]').forEach(b=>b.onclick=()=>{ tab=b.dataset.ut; draw(); });
    Timer.bindEvents(sh.body,draw,null,()=>sh.close());
  };
  draw();
  sh.track(()=>{ alive=false; });
  sh.track(Core.on('tick',()=>{
    const lk=sh.body.querySelector('#liveClk');
    if(lk){ const n=Core.now(); lk.textContent=`${U.hm(n)}:${U.pad(n.getSeconds())}`; }
  }));
  sh.track(Core.on('change',()=>{ if(!sh.body.contains(document.activeElement)) draw(); }));
  return sh;
}

/* =============================================================================
   Reminders — Tab "Nhắc hẹn" trong health.html (Nhiệm vụ • Điểm danh • Ngủ • Dậy • Giới hạn)
   ============================================================================= */
const Reminders={
  permStatus(){
    if(Bridge.android||Bridge.electron||Bridge.ext) return 'granted';
    if(typeof Notification==='undefined') return 'unsupported';
    return Notification.permission;
  },
  render(el){
    const draw=()=>{
      const s=Core.s, r=s.reminders, perm=this.permStatus();
      el.innerHTML=`<div class="card h-hero ${r.enabled?'tint-moss':'tint-cream'}">
          ${sv(IP.bell,42)}
          <div class="grow">
            <b style="font-size:16px">Nhắc hẹn thông minh</b>
            <div class="muted">Nhắc đúng giờ ngay cả khi bạn đang tập trung: Nhiệm vụ, Điểm danh 8h, Giờ đi ngủ, Giờ dậy & Gần chạm giới hạn màn hình.</div>
          </div>
          <label class="sw-tog"><input type="checkbox" id="rMaster" ${r.enabled?'checked':''}><span></span></label>
        </div>

        <div class="card row" style="padding:10px 12px;margin-bottom:10px;flex-wrap:wrap">
          <div class="grow"><b>Thông báo hệ thống</b><div class="muted">${perm==='granted'?'Đã cấp quyền thông báo ✓':perm==='denied'?'Trình duyệt đang chặn thông báo — hãy mở lại trong Cài đặt web.':'Cấp quyền để nhận thông báo đẩy từ thiết bị.'}</div></div>
          ${perm==='default'?`<button class="btn sm pri" id="rPerm">Cấp quyền</button>`:''}
          ${Bridge.android?`<button class="btn sm" id="rAndPerm">Cài đặt thông báo</button>`:''}
          <button class="btn sm moss" id="rTest">${sv(IP.bell,15)} Thử nhắc</button>
        </div>

        <div class="col" style="${r.enabled?'':'opacity:.55;pointer-events:none'}">
          <div class="card" style="padding:12px">
            <div class="row"><span class="ico">${sv(IP.quest,24)}</span><div class="grow"><b>Nhắc nhiệm vụ đời thực</b><div class="muted">Chỉ nhắc nếu bạn vẫn còn Quest chưa xong trong ngày</div></div><label class="sw-tog"><input type="checkbox" data-rk="quests" ${r.quests?'checked':''}><span></span></label></div>
            <div class="row" style="margin-top:8px;flex-wrap:wrap">
              <span class="muted">Sáng:</span><input class="inp" type="time" data-rt="questTime" value="${r.questTime}" style="width:120px;padding:5px 8px;font-size:14px">
              <span class="muted">Chiều:</span><input class="inp" type="time" data-rt="questTime2" value="${r.questTime2}" style="width:120px;padding:5px 8px;font-size:14px">
            </div>
          </div>

          <div class="card" style="padding:12px">
            <div class="row"><span class="ico">${sv(IP.calendar,24)}</span><div class="grow"><b>Nhắc điểm danh buổi sáng</b><div class="muted">Nhắc nhận Gem trong cửa sổ 8 tiếng sau giờ dậy (${s.sleep.wake} → ${SleepLock.winClose(s.sleep.wake)})</div></div><label class="sw-tog"><input type="checkbox" data-rk="checkin" ${r.checkin?'checked':''}><span></span></label></div>
          </div>

          <div class="card" style="padding:12px">
            <div class="row"><span class="ico">${sv(IP.moon,24)}</span><div class="grow"><b>Nhắc đến giờ đi ngủ (${s.sleep.bed})</b><div class="muted">Nhắc sớm chuẩn bị tắt máy và đúng giờ ngủ</div></div><label class="sw-tog"><input type="checkbox" data-rk="bed" ${r.bed?'checked':''}><span></span></label></div>
            <div class="row" style="margin-top:8px"><span class="muted grow">Nhắc trước giờ ngủ:</span>
              <div class="row" style="gap:5px">${[10,15,30].map(m=>`<button class="btn sm ${r.bedLead===m?'mid':''}" data-bl="${m}">${m}p</button>`).join('')}</div>
            </div>
          </div>

          <div class="card" style="padding:12px">
            <div class="row"><span class="ico">${sv(IP.sunrise,24)}</span><div class="grow"><b>Nhắc giờ thức dậy (${s.sleep.wake})</b><div class="muted">Chào buổi sáng sau 8 tiếng ngủ ngon</div></div><label class="sw-tog"><input type="checkbox" data-rk="wake" ${r.wake?'checked':''}><span></span></label></div>
          </div>

          <div class="card" style="padding:12px">
            <div class="row"><span class="ico">${sv(IP.clock,24)}</span><div class="grow"><b>Nhắc gần chạm giới hạn màn hình</b><div class="muted">Cảnh báo trước khi khóa tổng thời gian hoặc khóa nhóm app</div></div><label class="sw-tog"><input type="checkbox" data-rk="limitWarn" ${r.limitWarn?'checked':''}><span></span></label></div>
            <div class="row" style="margin-top:8px"><span class="muted grow">Cảnh báo khi còn:</span>
              <div class="row" style="gap:5px">${[5,10,15,20].map(m=>`<button class="btn sm ${r.limitLead===m?'mid':''}" data-ll="${m}">${m}p</button>`).join('')}</div>
            </div>
          </div>
        </div>`;

      el.querySelector('#rMaster').onchange=e=>{ Core.setReminder({enabled:e.target.checked}); draw(); };
      const rp=el.querySelector('#rPerm');
      if(rp) rp.onclick=async()=>{ try{ const res=await Notification.requestPermission(); UI.toast(res==='granted'?'Đã bật thông báo!':'Bạn chưa cấp quyền thông báo'); draw(); }catch(e){} };
      const ap=el.querySelector('#rAndPerm');
      if(ap) ap.onclick=()=>{ try{ window.LuaChillNative.openPermissionSettings('notify'); }catch(e){} };
      el.querySelector('#rTest').onclick=()=>{ Bridge.notify('Lừa Chill 🔔','Nhắc hẹn đang hoạt động! Hãy uống 1 ly nước và giữ mắt nghỉ ngơi nhé.'); UI.toast('🔔 Đã gửi thông báo thử!'); };
      el.querySelectorAll('[data-rk]').forEach(cb=>cb.onchange=()=>{ Core.setReminder({[cb.dataset.rk]:cb.checked}); });
      el.querySelectorAll('[data-rt]').forEach(inp=>inp.onchange=()=>{ Core.setReminder({[inp.dataset.rt]:inp.value}); UI.toast('Đã lưu giờ nhắc '+inp.value); });
      el.querySelectorAll('[data-bl]').forEach(b=>b.onclick=()=>{ Core.setReminder({bedLead:+b.dataset.bl}); draw(); });
      el.querySelectorAll('[data-ll]').forEach(b=>b.onclick=()=>{ Core.setReminder({limitLead:+b.dataset.ll}); draw(); });
    };
    draw();
    return Core.on('change',()=>{ if(!el.contains(document.activeElement)) draw(); });
  }
};
