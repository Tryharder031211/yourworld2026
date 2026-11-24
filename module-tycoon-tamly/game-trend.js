/* module-tycoon-tamly/game-trend.js — Minigame 1: SHOPPING TỈNH THỨC (chống chạy theo trend).
   Chế độ 1: Sàn TMĐT kiểu Shopee • Chế độ 2: Xe đẩy siêu thị (Canvas + A*) • Hóa đơn thực tế cuối tháng. */
'use strict';
Object.assign(DATA,{
  SHOP:{
    student:{
      name:'Sinh viên năm nhất', budget:3000000, reserve:2000000, reserveLabel:'Tiền trọ + ăn uống',
      goals:['Đủ tiền trọ (1.200.000đ)','Đủ ăn uống cả tháng (800.000đ)','Mua giáo trình'],
      items:[
        {id:'textbook',name:'Giáo trình chuyên ngành',price:180000,type:'need',util:18,space:3,goal:true,cat:'Học tập'},
        {id:'cooker',name:'Nồi cơm điện mini',price:250000,old:320000,type:'need',util:20,space:6,cat:'Gia dụng'},
        {id:'desklamp',name:'Đèn bàn học chống cận',price:150000,type:'need',util:15,space:4,cat:'Học tập'},
        {id:'raincoat',name:'Áo mưa bộ bền',price:60000,type:'need',util:12,space:2,cat:'Thiết yếu'},
        {id:'keyboard',name:'Bàn phím cơ LED RGB',price:650000,old:1300000,type:'fomo',util:1,space:9,burst:34,cat:'Công nghệ'},
        {id:'blindbox',name:'Blind box thần tượng',price:280000,old:350000,type:'fomo',util:1,space:5,burst:28,cat:'Trend'},
        {id:'cheesecoin',name:'Bánh đồng xu phô mai',price:35000,old:50000,type:'fomo',util:1,space:1,burst:14,cat:'Ăn vặt'},
        {id:'lemontea',name:'Trà chanh giã tay',price:25000,old:35000,type:'fomo',util:1,space:1,burst:12,cat:'Ăn vặt'}
      ]},
    traveler:{
      name:'Nhân viên văn phòng đi du lịch', budget:10000000, reserve:6000000, reserveLabel:'Vé máy bay + khách sạn',
      goals:['Giữ đủ vé máy bay + khách sạn (6.000.000đ)','Chuẩn bị đồ thiết yếu cho chuyến đi'],
      items:[
        {id:'suitcase',name:'Vali kéo bền',price:1200000,old:1500000,type:'need',util:22,space:12,goal:true,cat:'Du lịch'},
        {id:'sunscreen',name:'Kem chống nắng',price:250000,type:'need',util:14,space:1,cat:'Thiết yếu'},
        {id:'powerbank',name:'Sạc dự phòng',price:450000,type:'need',util:16,space:2,cat:'Công nghệ'},
        {id:'shoes',name:'Giày đi bộ êm (giày tốt)',price:900000,type:'need',util:20,space:5,cat:'Thiết yếu'},
        {id:'dress',name:'Váy áo sống ảo',price:1500000,old:3000000,type:'fomo',util:1,space:8,burst:32,cat:'Thời trang'},
        {id:'selfie',name:'Gậy selfie tích hợp AI',price:1200000,old:2400000,type:'fomo',util:1,space:4,burst:30,cat:'Công nghệ'},
        {id:'sunglass',name:'Kính râm hot TikTok',price:600000,old:1200000,type:'fomo',util:1,space:1,burst:20,cat:'Thời trang'},
        {id:'buckethat',name:'Mũ bucket trend',price:350000,old:700000,type:'fomo',util:1,space:2,burst:16,cat:'Thời trang'}
      ]}
  },
  CROWD:['Mày bị lạc hậu à?','Cháy hàng rồi chốt lẹ!','Cả lớp có hết rồi đó 😏','Sale này 10 năm mới có 1 lần!','Ai chưa mua là phí cả đời!','Còn 3 cái cuối cùng!!','Idol cũng dùng cái này nè'],
  NPC_TALK:['Ê mua lẹ đi, hết bây giờ!','Blind box mới về kìa!','Đang sale sốc kệ bên kia!','Tui mua 3 cái rồi nè 😎','Không mua là thiệt đó!']
});
class ShopSession {
  constructor(pid){ const p=DATA.SHOP[pid]; Object.assign(this,{pid,p,money:p.budget,util:35,base:58,dopa:0,space:18,day:1,dayT:0,cart:[],owned:[],ended:false,ls:{},pressureTotal:0}); }
  static DAY=3.2; static DAYS=30;
  on(e,f){ (this.ls[e]=this.ls[e]||[]).push(f); }
  emit(e,d){ (this.ls[e]||[]).forEach(f=>f(d)); }
  get happy(){ return U.clamp(this.base+this.dopa); }
  get spaceTotal(){ return U.clamp(this.space+this.cart.reduce((a,c)=>a+c.space,0)); }
  item(id){ return this.p.items.find(i=>i.id===id); }
  cartTotal(){ return this.cart.reduce((a,c)=>a+c.price,0); }
  addToCart(id,price,flash){ const it=this.item(id); this.cart.push({...it,price:price??it.price,flash:!!flash,uid:U.uid()}); this.emit('change'); }
  removeFromCart(uid){ this.cart=this.cart.filter(c=>c.uid!==uid); this.emit('change'); }
  checkout(){ const tot=this.cartTotal(); if(!this.cart.length) return {ok:false,msg:'Giỏ hàng trống'};
    if(tot>this.money) return {ok:false,msg:'Không đủ tiền VNĐ trong ví!'};
    const wasSafe=this.money>=this.p.reserve; this.money-=tot; let fomo=0, need=0;
    for(const c of this.cart){ this.owned.push({...c,uses:1,boughtDay:this.day}); this.space+=c.space;
      if(c.type==='need'){ need++; this.util+=c.util; this.base+=3; }
      else { fomo++; this.util+=1; this.dopa+=c.burst; this.base-=Math.round(c.burst*.2); } }
    this.cart=[]; this.clamp(); this.emit('change');
    return {ok:true,tot,fomo,need,eatReserve:wasSafe&&this.money<this.p.reserve}; }
  pressure(n){ this.base-=n; this.pressureTotal+=n; this.clamp(); this.emit('change'); }
  calm(n){ this.base+=n; this.clamp(); this.emit('change'); }
  cleanerCost(){ return Math.round(this.p.budget*.04/1000)*1000; }
  hireCleaner(){ const c=this.cleanerCost(); if(this.money<c) return false; this.money-=c; this.space=Math.max(10,this.space-35); this.base+=2; this.clamp(); this.emit('change'); return true; }
  clamp(){ this.util=U.clamp(this.util); this.base=U.clamp(this.base,-30,100); this.space=U.clamp(this.space); }
  tick(dt){ if(this.ended) return; this.dopa*=Math.exp(-dt/2.0); if(this.dopa<.3) this.dopa=0;
    this.dayT+=dt; if(this.dayT>=ShopSession.DAY){ this.dayT-=ShopSession.DAY; this.nextDay(); } }
  nextDay(){ this.day++; this.util-=.6; this.base-=.5;
    for(const o of this.owned) if(o.type==='need'){ o.uses++; this.base+=.35; }
    if(this.util<20) this.base-=1;
    if(this.spaceTotal>=100) this.base-=3;
    this.clamp(); this.emit('day');
    if(this.day>=ShopSession.DAYS){ this.day=ShopSession.DAYS; this.end(); } else this.emit('change'); }
  end(){ if(this.ended) return; this.ended=true; this.cart=[]; this.emit('end'); }
  summary(){ const fomo=this.owned.filter(o=>o.type==='fomo'), need=this.owned.filter(o=>o.type==='need');
    const fomoSpent=fomo.reduce((a,o)=>a+o.price,0), needSpent=need.reduce((a,o)=>a+o.price,0);
    const salvage=Math.round(fomoSpent*.1/1000)*1000; const moneyEnd=this.money+salvage;
    const reserveOk=moneyEnd>=this.p.reserve; const leftover=moneyEnd-this.p.reserve;
    const goalItems=this.p.items.filter(i=>i.goal); const goalsMet=goalItems.every(g=>this.owned.some(o=>o.id===g.id));
    const score=this.util*.35+this.happy*.35+(100-this.spaceTotal)*.15+(reserveOk?25:-15)-fomo.length*4+(goalsMet?10:0);
    const gem=Math.max(10,Math.round(score));
    const cmp=v=>v>=3000000?'mua một chiếc laptop cũ phục vụ học tập/công việc':v>=1000000?'đóng trọn một khóa học tiếng Anh online':v>=400000?'trả 2 tuần tiền ăn của sinh viên':v>=100000?'mua 2 cuốn sách hay':'mua vài bữa sáng đủ chất';
    const msg=fomo.length?`Bạn đã tiêu ${U.vnd(fomoSpent)} cho ${fomo.length} món đồ chỉ dùng đúng 1 lần — số tiền này đủ để ${cmp(fomoSpent)}.`:'Chúc mừng, bạn đã chi tiêu cực kỳ tỉnh thức! 🌿';
    return {profile:this.pid,fomo,need,fomoSpent,needSpent,spent:fomoSpent+needSpent,salvage,moneyEnd,reserveOk,leftover,goalsMet,
      util:Math.round(this.util),happy:Math.round(this.happy),space:Math.round(this.spaceTotal),gem,msg,fomoCount:fomo.length}; }
}

/* ---------- Grid A* pathfinding (8 hướng, không cắt góc) + làm mượt LOS ---------- */
const ShopUI={
  init(){ this.el=document.getElementById('shopping'); this.imgs={};
    for(const p of Object.values(DATA.SHOP)) for(const it of p.items) this.imgs[it.id]=toImg(sv(IP[it.id],64)); },
  start(pid,mode){ const S=this.S=new ShopSession(pid); this.mode=mode; this.warn={};
    S.on('end',()=>this.showSummary()); S.on('change',()=>this.hud()); S.on('day',()=>this.hud());
    App.show('shopping'); this.render(); UI.toast(`Tháng mới bắt đầu! Ví: ${U.vnd(S.money)}`); },
  abort(){ this.S=null; Market.unmount(); },
  render(){ const S=this.S, p=S.p;
    this.el.innerHTML=`<div class="s-hud" id="sHud"><div class="row"><button class="icon-btn" style="width:34px;height:34px;border-radius:10px" data-a="exit">${sv(IP.back,20)}</button>
      <div class="grow" style="min-width:0"><b style="font-size:14px;line-height:1">${p.name}</b><div style="font-size:11px;opacity:.85">Ngày <b id="sDay">1</b>/30 • Tháng #${Core.s.shop.month}</div></div>
      <div class="money">${sv(IP.bill,26)}<span id="sMoney"></span></div></div>
      <div style="font-size:10.5px;margin-top:3px;opacity:.92" id="sSafe"></div>
      <div class="s-stats"><div class="stat"><span>Hữu Dụng <b id="vU"></b></span><div class="bar"><i id="bU"></i></div></div><div class="stat"><span>Hạnh Phúc <b id="vHa"></b></span><div class="bar rose"><i id="bHa"></i></div></div><div class="stat"><span>Diện Tích Phòng <b id="vSp"></b></span><div class="bar mid"><i id="bSp"></i></div></div></div>
      <div class="row" style="margin-top:6px;gap:6px"><div class="seg dark grow"><button data-m="shopee">${'Sàn TMĐT'}</button><button data-m="market">Siêu Thị</button></div><button class="btn sm" data-a="clean">${sv(IP.broom,16)} Dọn</button><button class="btn sm rose" data-a="end">Chốt tháng</button></div></div>
      <div class="s-body" id="sBody"></div>`;
    this.el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>this.setMode(b.dataset.m));
    this.el.querySelector('[data-a=exit]').onclick=()=>{ if(confirm('Thoát giữa tháng? Tiến trình tháng này sẽ mất.')){ this.abort(); App.show('hub'); Hub.resize(); this.reviveHubDk(); } };
    this.el.querySelector('[data-a=clean]').onclick=()=>{ const c=S.cleanerCost(); if(confirm(`Thuê người dọn phòng giá ${U.vnd(c)} (giảm 35% diện tích)?`)){ if(S.hireCleaner()) UI.toast('Phòng gọn gàng hơn rồi!'); else UI.toast('Không đủ tiền VNĐ'); } };
    this.el.querySelector('[data-a=end]').onclick=()=>{ if(confirm('Chốt sổ cuối tháng ngay bây giờ?')) S.end(); };
    this.setMode(this.mode); },
  reviveHubDk(){ Hub.dk.el.classList.remove('tp-out','tp-in'); },
  setMode(m){ this.mode=m; Market.unmount(); this.el.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
    const body=document.getElementById('sBody'); body.style.top=document.getElementById('sHud').offsetHeight+'px'; body.innerHTML='';
    if(m==='shopee') this.renderShopee(body); else Market.mount(body,this.S); this.hud(); },
  hud(){ const S=this.S; if(!S||!document.getElementById('sMoney')) return; const $=id=>document.getElementById(id);
    $('sDay').textContent=S.day; $('sMoney').textContent=U.vnd(S.money);
    const free=S.money-S.p.reserve; $('sSafe').innerHTML=`Cần giữ cho <b>${S.p.reserveLabel}</b>: ${U.vnd(S.p.reserve)} • ${free>=0?`Có thể tiêu thoải mái: <b>${U.vnd(free)}</b>`:`<b style="color:#f3c2b9">Đã tiêu lẹm ${U.vnd(-free)}!</b>`}`;
    const set=(b,v,val)=>{ $(b).style.width=U.clamp(val)+'%'; $(v).textContent=Math.round(U.clamp(val)); };
    set('bU','vU',S.util); set('bHa','vHa',S.happy); set('bSp','vSp',S.spaceTotal);
    $('bU').parentElement.classList.toggle('warn',S.util<20); $('bSp').parentElement.classList.toggle('warn',S.spaceTotal>=90);
    const n=document.getElementById('spCartN'); if(n){ n.textContent=S.cart.length; n.style.display=S.cart.length?'':'none'; }
    const w=this.warn;
    if(S.happy<15&&!w.h){ w.h=1; UI.toast('Hạnh phúc sắp chạm đáy! Hãy chọn đồ dùng bền vững thay vì chạy theo trend.'); } if(S.happy>25) w.h=0;
    if(S.spaceTotal>=100&&!w.s){ w.s=1; UI.toast('Phòng chật kín 100%! Hạnh phúc bị trừ mỗi ngày — bấm "Dọn" để thuê người dọn.'); } if(S.spaceTotal<90) w.s=0;
    if(S.util<20&&!w.u){ w.u=1; UI.toast('Độ Hữu Dụng quá thấp: thiếu đồ thiết yếu cho cuộc sống!'); } if(S.util>28) w.u=0; },
  update(dt){ const S=this.S; if(!S||S.ended) return; S.tick(dt); this._h=(this._h||0)+dt; if(this._h>.2){ this._h=0; this.hud(); }
    if(this.mode==='market') Market.update(dt); else this.shopeeTick(dt); },
  addCart(id,price,flash,el){ this.S.addToCart(id,price,flash); if(el) UI.floatEl(el,`+1 ${sv(IP.cart,16)}`,C.mn); },
  /* ---------------- Chế độ 1: Sàn TMĐT kiểu Shopee ---------------- */
  renderShopee(body){ const S=this.S, items=S.p.items; this.sp={cdEnd:Date.now()+14*60e3+59e3,vT:6,cT:4,cat:'all',lastBuy:0};
    const card=it=>{ const pct=it.old?Math.round((1-it.price/it.old)*100):0; const sold=it.type==='fomo'?U.ri(2,9)+','+U.ri(1,9)+'k':U.ri(120,900);
      return `<div class="pcard">${pct?`<span class="disc">-${pct}%</span>`:''}<div class="pimg">${sv(IP[it.id],64)}</div><div class="pinfo"><div class="pn">${it.name}</div>
        <div><span class="price">${U.vnd(it.price)}</span> ${it.old?`<span class="old">${U.vnd(it.old)}</span>`:''}</div>
        <div class="row" style="justify-content:space-between;gap:4px"><span style="font-size:10.5px;opacity:.65;font-weight:700">Đã bán ${sold}</span><button class="btn sm moss" data-add="${it.id}">+ Giỏ</button></div></div></div>`; };
    const grid=()=>items.filter(it=>this.sp.cat==='all'||(this.sp.cat==='sale'&&it.old)||(this.sp.cat==='need'&&it.type==='need')||it.cat===this.sp.cat).map(card).join('');
    const cats=[['all','Tất cả'],['sale','Đang Sale'],['need','Thiết yếu'],...[...new Set(items.map(i=>i.cat))].map(c=>[c,c])];
    body.innerHTML=`<div class="sp" id="spRoot"><div class="sp-head"><div class="row"><div class="sp-search">${sv(IP.search,16)} Tìm "${items.find(i=>i.type==='fomo').name} giảm sốc"</div><button class="icon-btn" id="spCartTop" style="width:38px;height:38px;position:relative">${sv(IP.cart,24)}<span class="badge" id="spCartN" style="top:-6px;right:-6px"></span></button></div></div>
      <div class="sp-cats">${cats.map(([k,n])=>`<span data-c="${k}" class="${k==='all'?'on':''}" style="cursor:pointer">${n}</span>`).join('')}</div>
      <div class="flash"><div class="row"><b style="font-size:18px;letter-spacing:1px" class="grow">${sv(IP.fire,22)} FLASH SALE</b><span style="font-size:11px;font-weight:800">Kết thúc sau</span><span class="cd" id="spCd"></span></div>
        <div class="row" style="margin-top:7px;gap:8px;overflow-x:auto;touch-action:pan-x;padding-bottom:2px">${items.filter(i=>i.type==='fomo').map(it=>`<div style="flex:none;width:96px;background:${C.bg};color:${C.dg};border:2px solid ${C.dg};border-radius:10px;padding:4px;text-align:center"><div>${sv(IP[it.id],40)}</div><div class="price" style="font-size:13px">${U.vnd(it.price)}</div><div class="sold" style="border-color:${C.dg}"><i style="width:96%"></i><span>Đã bán 96%</span></div><button class="btn sm rose" style="margin-top:3px;padding:0 6px;font-size:11px" data-add="${it.id}">Mua ngay</button></div>`).join('')}</div></div>
      <div class="pgrid" id="spGrid">${grid()}</div><p class="muted center" style="margin:12px">— Bạn đã xem hết. Có thật sự cần không? —</p></div>
      <button class="btn pri sp-cartbtn" id="spCartBtn">${sv(IP.cart,22)} Giỏ hàng</button>`;
    const bindAdd=root=>root.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ this.addCart(b.dataset.add,undefined,false,b); UI.toast('Đã thêm vào giỏ hàng'); });
    bindAdd(body);
    body.querySelectorAll('[data-c]').forEach(c=>c.onclick=()=>{ this.sp.cat=c.dataset.c; body.querySelectorAll('[data-c]').forEach(x=>x.classList.toggle('on',x===c)); const g=body.querySelector('#spGrid'); g.innerHTML=grid(); bindAdd(g); });
    body.querySelector('#spCartBtn').onclick=body.querySelector('#spCartTop').onclick=()=>this.openCart('Chốt đơn');
    this.shopeeTick(0,true); },
  shopeeTick(dt,force){ const sp=this.sp; if(!sp) return; const cd=document.getElementById('spCd'); if(!cd) return;
    let ms=sp.cdEnd-Date.now(); if(ms<=0){ sp.cdEnd=Date.now()+14*60e3+59e3; ms=sp.cdEnd-Date.now(); }
    const t=Math.floor(ms/1000), h=Math.floor(t/3600), m=Math.floor(t/60)%60, s=t%60; cd.innerHTML=`<b>${U.pad(h)}</b>:<b>${U.pad(m)}</b>:<b>${U.pad(s)}</b>`;
    if(force||document.querySelector('.sheet-wrap,.modal-wrap')) return;
    sp.vT-=dt; sp.cT-=dt;
    if(sp.vT<=0){ sp.vT=U.rand(22,32); this.voucher(); }
    if(sp.cT<=0){ sp.cT=U.rand(6,10); this.crowd(); } },
  voucher(){ const S=this.S, it=U.pick(S.p.items.filter(i=>i.type==='fomo')); let left=30;
    const m=UI.modal(`<div class="center">${sv(IP.ticket,64)}<h2 style="color:#a5584c;font-size:24px">VOUCHER FREESHIP 0đ!</h2><p style="font-weight:700">Áp dụng cho <b>${it.name}</b> — hết hạn sau <b id="vLeft">00:30</b></p>
      <p class="muted">"Không mua bây giờ là mất cơ hội đó!"</p><div class="row" style="margin-top:10px"><button class="btn grow" data-a="no">Thôi, mình không cần</button><button class="btn rose grow" data-a="yes">Dùng ngay</button></div></div>`,{dismiss:false});
    const iv=setInterval(()=>{ left--; const e=m.box.querySelector('#vLeft'); if(e) e.textContent='00:'+U.pad(Math.max(0,left)); if(left<=0){ clearInterval(iv); m.close(); } },1000);
    m.box.querySelector('[data-a=no]').onclick=()=>{ clearInterval(iv); m.close(); S.calm(2); UI.toast('Tỉnh táo! Không bị voucher dắt mũi (+2 Hạnh phúc bền vững)'); };
    m.box.querySelector('[data-a=yes]').onclick=()=>{ clearInterval(iv); m.close(); S.addToCart(it.id); this.openCart('Chốt đơn'); }; },
  crowd(){ const body=document.getElementById('sBody'); if(!body) return; const f=U.pick(DATA.FRIENDS), b=document.createElement('div'); b.className='crowd';
    b.style.bottom=U.ri(70,260)+'px'; b.innerHTML=`<div style="width:30px;height:30px;flex:none">${friendFace(f,30)}</div><div class="bub">${U.pick(DATA.CROWD)}</div>`; body.appendChild(b);
    const t0=Date.now(); setTimeout(()=>{ b.remove(); if(this.S&&!this.S.ended&&this.mode==='shopee'&&(this.sp.lastBuy||0)<t0){ this.S.pressure(2); UI.float(`-2 ${sv(IP.heart,14)} áp lực đám đông`,120,UI.app.clientHeight-140,'#a5584c'); } },4200); },
  openCart(cta){ const S=this.S; const sh=UI.sheet({title:'Giỏ hàng',icon:'cart'});
    const render=()=>{ const tot=S.cartTotal(), after=S.money-tot;
      sh.body.innerHTML=S.cart.length?S.cart.map(c=>`<div class="li card">${sv(IP[c.id],40)}<div class="grow"><b>${c.name}</b><div><span class="price" style="font-size:14px">${U.vnd(c.price)}</span>${c.flash?' <span class="tag rose">FLASH</span>':''}</div></div><button class="x-btn" data-rm="${c.uid}" style="width:28px;height:28px">${sv(IP.x,13)}</button></div>`).join('')+
        `<div class="card" style="padding:10px;margin-top:4px"><div class="row"><b class="grow">Tổng thanh toán</b><b class="price">${U.vnd(tot)}</b></div><div class="row"><span class="grow muted">Ví sau khi trả</span><b>${U.vnd(after)}</b></div>
        ${after<S.p.reserve?`<div class="muted" style="color:#a5584c;font-weight:800;margin-top:4px">⚠ Đơn này sẽ tiêu lẹm vào ${S.p.reserveLabel}!</div>`:''}</div>
        <button class="btn pri big full" style="margin-top:10px" id="payBtn">${sv(IP.bill,26)} ${cta} • ${U.vnd(tot)}</button>`
        :`<div class="center" style="padding:20px">${sv(IP.cart,60)}<p class="muted">Giỏ hàng trống. Không mua gì cũng là một lựa chọn tỉnh thức!</p></div>`;
      sh.body.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ S.removeFromCart(b.dataset.rm); render(); });
      const pay=sh.body.querySelector('#payBtn'); if(pay) pay.onclick=()=>{ const r=S.checkout(); if(!r.ok){ UI.toast(r.msg); return; } UI.bills(pay,14); if(this.sp) this.sp.lastBuy=Date.now(); sh.close(); this.afterPay(r); }; };
    render(); },
  afterPay(r){ let msg=`Đã chốt đơn ${U.vnd(r.tot)}!`; if(r.fomo) msg+=` Dopamine tăng vọt... nhưng sẽ tụt rất nhanh.`; else if(r.need) msg+=' Đồ hữu ích — hạnh phúc sẽ tăng bền vững theo số lần dùng.';
    if(r.eatReserve) msg+=` ⚠ Bạn vừa tiêu vào ${this.S.p.reserveLabel}!`; UI.toast(msg); this.hud(); Market.refreshCart(); },
  /* ---------------- Tổng kết & Thanh lý cuối tháng ---------------- */
  showSummary(demo){ const S=this.S; if(!S) return; const sum=S.summary(), p=S.p; this.lastSum=sum; Market.paused=true;
    const lines=[...sum.need,...sum.fomo].map(o=>`<div class="ln"><span>${o.name}<br>${o.type==='fomo'?'<span class="dusty">Bám bụi (Số lần sử dụng: 1 lần)</span>':`<small>Đã dùng: ${o.uses} lần ✓</small>`}</span><span>${U.vnd(o.price)}</span></div>`).join('')||'<div class="ln"><span>(Không mua món nào)</span><span>0đ</span></div>';
    const m=UI.modal(`<div class="receipt"><div class="center"><b style="font-size:17px">HÓA ĐƠN THỰC TẾ</b><br>REALITY RECEIPT • THÁNG #${Core.s.shop.month}<br>${p.name}<br>Ngân sách: ${U.vnd(p.budget)}</div><div class="dash"></div>${lines}<div class="dash"></div>
      <div class="ln"><b>Tổng đã chi</b><b>${U.vnd(sum.spent)}</b></div><div class="ln"><span>• Đồ thiết yếu</span><span>${U.vnd(sum.needSpent)}</span></div><div class="ln"><span>• Đồ theo trend/FOMO</span><span>${U.vnd(sum.fomoSpent)}</span></div>
      <div class="ln"><span>Thanh lý đồng nát (10% giá gốc)</span><span>+${U.vnd(sum.salvage)}</span></div><div class="ln"><span>Ví cuối tháng</span><span>${U.vnd(sum.moneyEnd)}</span></div>
      <div class="ln"><span>Giữ cho ${p.reserveLabel}</span><span>-${U.vnd(p.reserve)}</span></div><div class="ln"><b>${sum.reserveOk?'Còn dư':'THIẾU HỤT'}</b><b>${U.vnd(sum.leftover)}</b></div><div class="dash"></div>
      <div class="ln"><span>Hữu dụng / Hạnh phúc / Diện tích</span><span>${sum.util} / ${sum.happy} / ${sum.space}%</span></div>
      <div class="ln"><span>Mục tiêu tháng</span><span>${sum.reserveOk&&sum.goalsMet?'ĐẠT ✓':'CHƯA ĐẠT ✗'}</span></div></div>
      <div class="card" style="margin-top:16px;padding:12px;background:${sum.fomoCount?'#f3e0dc':'#e1e9c9'}"><b style="font-size:15px">${sum.msg}</b>${sum.reserveOk?'':`<div class="muted" style="margin-top:4px;color:#a5584c;font-weight:800">Bạn đã tiêu lẹm ${U.vnd(-sum.leftover)} vào ${p.reserveLabel}!</div>`}</div>
      <button class="btn pri big full" style="margin-top:12px" data-a="claim">${sv(IP.gem,24)} Nhận +${sum.gem} Gem & Về Nhà</button>`,{dismiss:false});
    m.box.querySelector('[data-a=claim]').onclick=()=>{ m.close(); this.claim(sum,demo); }; },
  async claim(sum,demo){ Core.finishShopping(sum); this.S=null;
    if(App.cur==='shopping' && this.mode==='market' && Market.dk){ await FX.teleport(Market.world,Market.mv.x,Market.mv.y,Market.dk,'out'); }
    else { App.show('hub'); Hub.resize(); this.reviveHubDk(); await FX.teleport(Hub.world,195,284,Hub.dk,'out'); }
    Market.unmount(); Nav.go('home','',{tp:1}); },
  demoMonthEnd(){ if(this.S && !this.S.ended){ this.S.end(); return; }
    const S=this.S=new ShopSession('student'); this.mode='shopee';
    for(const id of ['textbook','cooker','keyboard','blindbox','lemontea']) S.addToCart(id); S.checkout();
    for(let i=0;i<29;i++) S.nextDay(); S.ended=true; this.showSummary(true); }
};

/* ---------------- Chế độ 2: Minigame Xe Đẩy Siêu Thị (Top-down Canvas + A*) ---------------- */
const Market={
  CS:30,COLS:13,ROWS:17,
  mount(body,S){ this.S=S; this.paused=false;
    body.innerHTML=`<div class="mk" id="mk"><div class="world" id="mkW"><canvas id="mkC"></canvas></div><div class="mk-banner hide" id="mkBan"></div>
      <div class="mk-btns"><button class="btn sm" data-a="list">${sv(IP.cart,18)} Xe (<span id="mkN">0</span>)</button><button class="btn sm pri" data-a="cash">${sv(IP.bill,20)} Tới Thu Ngân</button></div></div>`;
    this.root=body.querySelector('#mk'); this.world=body.querySelector('#mkW'); this.cv=body.querySelector('#mkC'); this.ctx=this.cv.getContext('2d');
    const needs=S.p.items.filter(i=>i.type==='need'), fomos=S.p.items.filter(i=>i.type==='fomo');
    const sh=[['n1','need',1,2,4,1],['f1','fomo',7,2,4,1],['f2','fomo',1,5,4,1],['n2','need',7,5,4,1],['n3','need',1,8,4,1],['f3','fomo',7,8,4,1],['n4','need',1,11,3,1],['f4','fomo',8,11,3,1]];
    let ni=0, fi=0; this.shelves=sh.map(([id,type,x,y,w,h])=>({id,type,x,y,w,h,items:[]}));
    const ns=this.shelves.filter(s=>s.type==='need'), fs=this.shelves.filter(s=>s.type==='fomo');
    needs.forEach((it,i)=>ns[i%ns.length].items.push(it)); fomos.forEach((it,i)=>fs[i%fs.length].items.push(it));
    ns.forEach(s=>{ if(!s.items.length) s.items.push(needs[(ni++)%needs.length]); }); fs.forEach(s=>{ if(!s.items.length) s.items.push(fomos[(fi++)%fomos.length]); });
    this.cash={id:'cash',type:'cash',x:7,y:14,w:4,h:1};
    const all=[...this.shelves,this.cash];
    this.at=(cx,cy)=>all.find(s=>cx>=s.x&&cx<s.x+s.w&&cy>=s.y&&cy<s.y+s.h);
    this.G=Path.make(this.COLS,this.ROWS,this.CS,(x,y,cx,cy)=>cx===0||cy===0||cx===this.COLS-1||cy===this.ROWS-1||!!this.at(cx,cy));
    this.dk=new Donkey({scale:.7,tilt:-38,acc:Core.s.acc.on,mood:'happy'}); this.dk.addCart(); this.world.appendChild(this.dk.el);
    this.mv=new Mover(2.5*30,14.5*30,105); this.mv.yaw=this.mv.tyaw=180; this.cartYaw=180; this.dk.pos(this.mv.x,this.mv.y);
    this.flash=null; this.flashT=U.rand(10,14); this.npc=null; this.npcT=U.rand(6,9);
    this.bind(); this.resize(); this.ro=new ResizeObserver(()=>this.resize()); this.ro.observe(this.root); this.refreshCart();
    body.querySelector('[data-a=cash]').onclick=()=>this.interact(this.cash);
    body.querySelector('[data-a=list]').onclick=()=>ShopUI.openCart('Thanh toán');
    this.busy=true; FX.teleport(this.world,this.mv.x,this.mv.y,this.dk,'in').then(()=>{ this.busy=false; }); },
  unmount(){ if(this.ro){ this.ro.disconnect(); this.ro=null; } this.dk=null; this.root=null; FX.unlock(); },
  resize(){ if(!this.root) return; const W=this.root.clientWidth, H=this.root.clientHeight; if(!W||!H) return; const s=this.sc=Math.min(W/390,(H-46)/510); this.ox=(W-390*s)/2; this.oy=Math.max(0,(H-46-510*s)/2);
    this.world.style.transform=`translate(${this.ox}px,${this.oy}px) scale(${s})`; const r=Math.min(3,(window.devicePixelRatio||1)*s);
    if(this.cv.width!==Math.round(390*r)){ this.cv.width=Math.round(390*r); this.cv.height=Math.round(510*r); this.cv.style.width='390px'; this.cv.style.height='510px'; this.ctx.setTransform(r,0,0,r,0,0); }
    try{ this.draw(); }catch(e){} },
  toWorld(cx,cy){ const r=this.root.getBoundingClientRect(); return [(cx-r.left-this.ox)/this.sc,(cy-r.top-this.oy)/this.sc]; },
  bind(){ const st=this.root; st.addEventListener('contextmenu',e=>e.preventDefault());
    st.addEventListener('pointerdown',e=>{ if(this.busy||e.target.closest('button')) return; e.preventDefault(); try{ st.setPointerCapture(e.pointerId); }catch(_){}
      const [x,y]=this.toWorld(e.clientX,e.clientY); const hit=this.at(Math.floor(x/30),Math.floor(y/30)); this.down={x0:e.clientX,y0:e.clientY,t:performance.now(),steer:false,obj:!!hit,last:0};
      if(hit){ this.interact(hit); return; } this.moveTo(x,y,true); });
    st.addEventListener('pointermove',e=>{ const d=this.down; if(!d||d.obj||this.busy) return; const now=performance.now();
      if(!d.steer&&(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>10||now-d.t>220)) d.steer=true;
      if(d.steer&&now-d.last>70){ d.last=now; const [x,y]=this.toWorld(e.clientX,e.clientY); this.moveTo(x,y,false); this.steerDot(x,y); } });
    const up=()=>{ this.down=null; if(this.dot){ this.dot.remove(); this.dot=null; } }; st.addEventListener('pointerup',up); st.addEventListener('pointercancel',up); },
  steerDot(x,y){ if(!this.dot){ this.dot=document.createElement('div'); this.dot.className='fx-steer'; this.world.appendChild(this.dot); } this.dot.style.left=x+'px'; this.dot.style.top=y+'px'; },
  moveTo(x,y,fx){ FX.unlock(); if(fx) FX.move(this.world,x,y); this.mv.go(Path.route(this.G,this.mv.x,this.mv.y,x,y)); },
  interact(s){ const cx=(s.x+s.w/2)*30, cy=(s.y+s.h/2)*30; FX.lock(this.world,cx,cy,Math.max(28,s.w*16));
    const cand=[]; for(let x=s.x;x<s.x+s.w;x++) cand.push([x,s.y-1],[x,s.y+s.h]); for(let y=s.y;y<s.y+s.h;y++) cand.push([s.x-1,y],[s.x+s.w,y]);
    const free=cand.filter(([x,y])=>!Path.blocked(this.G,x,y)).map(([x,y])=>[(x+.5)*30,(y+.5)*30]);
    let best=null, bl=1e9; for(const [x,y] of free.sort((a,b)=>Math.hypot(a[0]-this.mv.x,a[1]-this.mv.y)-Math.hypot(b[0]-this.mv.x,b[1]-this.mv.y)).slice(0,4)){
      const r=Path.route(this.G,this.mv.x,this.mv.y,x,y); let L=0, px=this.mv.x, py=this.mv.y; for(const [qx,qy] of r){ L+=Math.hypot(qx-px,qy-py); px=qx; py=qy; } if(L<bl){ bl=L; best=r; } }
    const done=()=>{ FX.unlock(true); this.mv.face(cx,cy); setTimeout(()=>s.type==='cash'?ShopUI.openCart('Thanh toán tại quầy'):this.openShelf(s),200); };
    this.mv.go(best||[],done); },
  flashPrice(it){ return Math.round(it.price*.6/1000)*1000; },
  openShelf(s){ const S=this.S; const sh=UI.sheet({title:s.type==='fomo'?'Kệ Bẫy FOMO — SALE!':'Kệ Thiết Yếu',icon:s.type==='fomo'?'fire':'check'});
    const render=()=>{ sh.body.innerHTML=s.items.map(it=>{ const fl=this.flash&&this.flash.item.id===it.id; const price=fl?this.flashPrice(it):it.price; const inCart=S.cart.filter(c=>c.id===it.id).length;
      return `<div class="shelf-it card">${sv(IP[it.id],52)}<div class="grow"><b>${it.name}</b><div><span class="price">${U.vnd(price)}</span> ${it.old||fl?`<span class="old">${U.vnd(it.old||it.price)}</span>`:''}</div>
        <div class="row" style="gap:4px;flex-wrap:wrap">${it.type==='fomo'?`<span class="tag rose sale-blink">${fl?'FLASH 8 GIÂY!':'SALE SỐC'}</span><span class="tag">+${it.space}% diện tích</span>`:`<span class="tag moss">Dùng hằng ngày</span><span class="tag">+${it.space}% diện tích</span>`}${inCart?`<span class="tag mid">Trong xe: ${inCart}</span>`:''}</div></div>
        <button class="btn sm ${it.type==='fomo'?'rose':'moss'}" data-add="${it.id}" data-p="${price}" data-f="${fl?1:0}">Bỏ vào xe</button></div>`; }).join('')+
      `<p class="muted center">Đồ trong xe chỉ trừ tiền khi thanh toán ở Quầy Thu Ngân.</p>`;
      sh.body.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ ShopUI.addCart(b.dataset.add,+b.dataset.p,b.dataset.f==='1',b); this.refreshCart(); render(); }); };
    render(); },
  refreshCart(){ if(!this.dk||!this.S) return; const n=document.getElementById('mkN'); if(n) n.textContent=this.S.cart.length;
    const cols=[...this.S.owned,...this.S.cart].map(o=>o.type==='fomo'?C.rb:C.mg); this.dk.setCartFill(Math.round(this.S.spaceTotal/100*16),cols.length?cols:[C.bg]); },
  update(dt){ if(!this.dk||this.paused) return; const m=this.mv;
    if(!this.busy){ m.update(dt); this.dk.pos(m.x,m.y); this.dk.setYaw(m.yaw); this.dk.setWalk(m.moving);
      this.cartYaw+=U.angDiff(this.cartYaw,m.yaw)*Math.min(1,dt*3.2); this.dk.setCartSwing(U.clamp(U.angDiff(m.yaw,this.cartYaw),-38,38)); }
    this.dk.setMood(this.S.happy<25?'sad':this.S.dopa>8?'happy':'normal');
    this._cf=(this._cf||0)+dt; if(this._cf>.5){ this._cf=0; this.refreshCart(); }
    const open=!!document.querySelector('.sheet-wrap,.modal-wrap');
    if(!open){ this.flashT-=dt; this.npcT-=dt; }
    if(!this.flash&&this.flashT<=0) this.startFlash();
    if(this.flash){ this.flash.t-=dt; const ban=document.getElementById('mkBan'); if(ban) ban.querySelector('#mkS').textContent=Math.ceil(Math.max(0,this.flash.t));
      if(this.flash.t<=0){ const bought=this.S.cart.some(c=>c.flash)||this.S.owned.some(c=>c.flash&&c.boughtDay>=this.flash.day); this.flash=null; this.flashT=U.rand(16,24); if(ban) ban.classList.add('hide');
        if(!bought){ this.S.calm(2); UI.toast('Bạn đã bình tĩnh bỏ qua Flash Sale! +2 Hạnh phúc bền vững'); } } }
    if(!this.npc&&this.npcT<=0){ const f=U.pick(DATA.FRIENDS), row=U.pick([3.5,6.5,9.5,12.5]), dir=Math.random()<.5?1:-1;
      this.npc={f,img:toImg(friendFace(f,48)),x:dir>0?-20:410,y:row*30,v:dir*120,text:U.pick(DATA.NPC_TALK)}; this.npcT=U.rand(12,18);
      this.S.pressure(1); UI.float(`-1 ${sv(IP.heart,14)} FOMO từ bạn bè`,UI.app.clientWidth/2,UI.app.clientHeight-120,'#a5584c'); }
    if(this.npc){ this.npc.x+=this.npc.v*dt; if(this.npc.x<-40||this.npc.x>440) this.npc=null; }
    this.draw(); },
  startFlash(){ const s=U.pick(this.shelves.filter(x=>x.type==='fomo')), it=U.pick(s.items); this.flash={shelf:s,item:it,t:8,day:this.S.day};
    const ban=document.getElementById('mkBan'); if(ban){ ban.classList.remove('hide'); ban.innerHTML=`${sv(IP.speaker,24)}<span class="grow">LOA SIÊU THỊ: FLASH SALE <b id="mkS">8</b>s! ${it.name} chỉ ${U.vnd(this.flashPrice(it))}!</span>`; } },
  draw(){ const c=this.ctx, t=performance.now()/1000, S=30; if(!c) return;
    const rr=(x,y,w,h,r,fill,stroke=C.dg,lw=2.5)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); if(fill){ c.fillStyle=fill; c.fill(); } if(stroke){ c.strokeStyle=stroke; c.lineWidth=lw; c.stroke(); } };
    c.clearRect(0,0,390,510);
    for(let y=1;y<this.ROWS-1;y++) for(let x=1;x<this.COLS-1;x++){ c.fillStyle=(x+y)%2?'#efe9c6':'#e5deb5'; c.fillRect(x*S,y*S,S,S); }
    c.fillStyle=C.mn; c.fillRect(0,0,390,S); c.fillStyle=C.dg; c.fillRect(0,S,S,510-S); c.fillRect(390-S,S,S,510-S); c.fillRect(0,510-S,390,S);
    c.fillStyle=C.bg; c.font='800 14px "Baloo 2",sans-serif'; c.textAlign='center'; c.fillText('SIÊU THỊ TỈNH THỨC',195,20);
    c.fillStyle=C.rb; c.fillRect(S,510-S,S*2.2,S); c.fillStyle=C.dg; c.font='800 10px "Baloo 2",sans-serif'; c.fillText('LỐI VÀO',S*2.1,510-10);
    c.save(); c.translate(330,15); c.fillStyle=C.rb; c.strokeStyle=C.bg; c.lineWidth=1.5; c.beginPath(); c.moveTo(-8,-4); c.lineTo(-3,-4); c.lineTo(3,-9); c.lineTo(3,9); c.lineTo(-3,4); c.lineTo(-8,4); c.closePath(); c.fill(); c.stroke();
    if(this.flash){ c.beginPath(); c.arc(4,0,7+3*Math.sin(t*10),-.8,.8); c.stroke(); } c.restore();
    for(const s of this.shelves){ const x=s.x*S+3, y=s.y*S+4, w=s.w*S-6, h=s.h*S-8, fl=this.flash&&this.flash.shelf===s;
      if(s.type==='fomo'){ c.save(); c.shadowColor=fl?'#ff9d8c':C.rb; c.shadowBlur=(fl?26:10)+10*(.5+.5*Math.sin(t*(fl?14:6))); rr(x,y,w,h,6,'#ecc9c2'); c.restore(); rr(x,y,w,h,6,null); }
      else rr(x,y,w,h,6,'#c5d1a6');
      c.strokeStyle='#0A332355'; c.lineWidth=1.5; c.beginPath(); c.moveTo(x+4,y+h-5); c.lineTo(x+w-4,y+h-5); c.stroke();
      for(let i=0;i<s.w;i++){ const it=s.items[i%s.items.length], img=ShopUI.imgs[it.id]; if(img&&img.complete) c.drawImage(img,x+3+i*S,y+0,24,24); }
      c.font='800 9px "Baloo 2",sans-serif'; c.textAlign='center';
      if(s.type==='fomo'){ if(Math.floor(t*(fl?6:2.5))%2===0){ c.font='800 13px "Baloo 2",sans-serif'; c.lineWidth=3; c.strokeStyle=C.bg; c.strokeText(fl?'FLASH SALE!':'SALE!',x+w/2,y-4); c.fillStyle='#a5584c'; c.fillText(fl?'FLASH SALE!':'SALE!',x+w/2,y-4); } }
      else { c.fillStyle=C.dg; c.fillText('KỆ THIẾT YẾU',x+w/2,y-3); } }
    const k=this.cash, kx=k.x*S+3, ky=k.y*S+4; rr(kx,ky,k.w*S-6,S-8,6,C.mn); rr(kx+k.w*S-36,ky-10,24,16,3,C.bg); c.fillStyle=C.dg; c.font='800 9px "Baloo 2",sans-serif'; c.fillText('VNĐ',kx+k.w*S-24,ky+2);
    c.fillStyle=C.bg; c.font='800 11px "Baloo 2",sans-serif'; c.fillText('QUẦY THU NGÂN',kx+(k.w*S-6)/2-16,ky+15);
    if(this.flash){ const s=this.flash.shelf, tx=(s.x+s.w/2)*S, ty=(s.y+s.h/2)*S, a=Math.atan2(ty-this.mv.y,tx-this.mv.x), R=34+4*Math.sin(t*10);
      c.save(); c.translate(this.mv.x+Math.cos(a)*R,this.mv.y-10+Math.sin(a)*R); c.rotate(a); c.beginPath(); c.moveTo(12,0); c.lineTo(-6,-9); c.lineTo(-2,0); c.lineTo(-6,9); c.closePath(); c.fillStyle=C.rb; c.fill(); c.strokeStyle=C.dg; c.lineWidth=2.5; c.stroke(); c.restore(); }
    if(this.npc){ const n=this.npc, bob=Math.abs(Math.sin(t*14))*4; c.fillStyle='#0A332333'; c.beginPath(); c.ellipse(n.x,n.y+12,12,4,0,0,7); c.fill();
      if(n.img.complete) c.drawImage(n.img,n.x-15,n.y-22-bob,30,30);
      c.font='800 10px "Baloo 2",sans-serif'; const tw=c.measureText(n.text).width+14; rr(n.x-tw/2,n.y-50-bob,tw,18,8,'#fff',C.dg,2); c.fillStyle=C.dg; c.fillText(n.text,n.x,n.y-37-bob); } }
};

