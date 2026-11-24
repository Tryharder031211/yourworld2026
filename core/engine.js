/* =============================================================================
   core/engine.js — [CORE ENGINE] thuần logic & state, KHÔNG chạm DOM.
   Có thể port 1-1 sang Rust (Tauri v2 #[tauri::command]) hoặc chạy trong service worker.
   ============================================================================= */
'use strict';
const U = {
  clamp:(v,a=0,b=100)=>Math.max(a,Math.min(b,v)),
  lerp:(a,b,t)=>a+(b-a)*t,
  rand:(a,b)=>a+Math.random()*(b-a),
  ri:(a,b)=>Math.floor(a+Math.random()*(b-a+1)),
  pick:a=>a[Math.floor(Math.random()*a.length)],
  uid:()=>Math.random().toString(36).slice(2,9),
  pad:n=>String(n).padStart(2,'0'),
  vnd:n=>{const s=Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (n<0?'-':'')+s+'đ'},
  ymd:d=>d.getFullYear()+'-'+U.pad(d.getMonth()+1)+'-'+U.pad(d.getDate()),
  /* "ngày game" bắt đầu lúc thức dậy: 01:30 sáng vẫn tính là đêm của hôm trước */
  dayKeyAt:(d,shiftH)=>U.ymd(new Date(d.getTime()-shiftH*3600e3)),
  addDays:(k,n)=>{const [y,m,d]=k.split('-').map(Number);return U.ymd(new Date(y,m-1,d+n));},
  hm:d=>U.pad(d.getHours())+':'+U.pad(d.getMinutes()),
  hmToH:s=>{const [h,m]=String(s).split(':').map(Number);return h+(m||0)/60;},
  hToHm:h=>{h=((h%24)+24)%24;return U.pad(Math.floor(h))+':'+U.pad(Math.round((h%1)*60)%60);},
  angDiff:(a,b)=>((b-a)%360+540)%360-180,
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};

const DATA = {
  QUESTS:[
    {id:'water',   name:'Uống 1 ly nước',            icon:'glass', gem:20},
    {id:'exercise',name:'Tập thể dục 10 phút',       icon:'run',   gem:25},
    {id:'grass',   name:'Ra ngoài chạm vào cỏ',      icon:'grass', gem:25},
    {id:'read',    name:'Đọc 10 trang sách',         icon:'book',  gem:20},
    {id:'feed',    name:'Cho thú cưng ăn đúng giờ',  icon:'bowl',  gem:15},
    {id:'plant',   name:'Tưới cây đúng giờ',         icon:'can',   gem:15}
  ],
  GARDEN_WIN:[{id:'am',label:'Sáng',from:6,to:9},{id:'pm',label:'Chiều',from:16,to:18}],
  MEAL_WIN:[{id:'b',label:'Bữa sáng',from:7,to:9},{id:'l',label:'Bữa trưa',from:11,to:13},{id:'d',label:'Bữa tối',from:18,to:20}],
  GARDEN_STAGES:[{xp:0,name:'Hạt giống'},{xp:25,name:'Mầm non'},{xp:75,name:'Cây con'},{xp:150,name:'Nụ hoa'},{xp:250,name:'Nở rộ'}],
  PET_LV:[{xp:0,name:'Bé con',scale:.72},{xp:40,name:'Nhóc tì',scale:.86},{xp:100,name:'Trưởng thành',scale:1},{xp:200,name:'Siêu cưng',scale:1.16}],
  PETS:{ dog:{name:'Cún Mochi',price:0}, cat:{name:'Mèo Mướp',price:120}, rabbit:{name:'Thỏ Bông',price:180}, capy:{name:'Capybara Bơ',price:250} },
  ACCS:{ scarf:{name:'Khăn quàng cổ',price:80}, beanie:{name:'Mũ len',price:80}, headphones:{name:'Tai nghe',price:100} },
  DECOR:{
    bed:{name:'Giường gỗ',price:120,w:1,d:2,comfort:12}, desk:{name:'Bàn học',price:90,w:1,d:1,comfort:8},
    shelf:{name:'Kệ sách',price:80,w:1,d:1,comfort:8}, plant:{name:'Chậu cây',price:30,w:1,d:1,comfort:4},
    lamp:{name:'Đèn ngủ',price:40,w:1,d:1,comfort:4}, beanbag:{name:'Ghế lười',price:60,w:1,d:1,comfort:6},
    rug:{name:'Thảm tròn',price:50,w:2,d:2,flat:true,comfort:5}, wardrobe:{name:'Tủ quần áo',price:110,w:1,d:1,comfort:9},
    tank:{name:'Bể cá mini',price:70,w:1,d:1,comfort:7}, guitar:{name:'Đàn guitar',price:65,w:1,d:1,comfort:6}
  },
  WALLS:['#F7F4D5','#dfe6c8','#ecc9c2','#b9d3d6','#e8dcc0','#cfd9b4'],
  FLOORS:['#c99a6b','#a8b98a','#efe6c4','#d9b0a8','#7fa3ab','#b5a28a'],
  PAINT_COST:15,
  BED_OPTIONS:['20:30','21:00','21:30','22:00','22:30','23:00','23:30','00:00','00:30'],
  SLEEP_HOURS:8,            /* ngủ đủ 8 tiếng: giờ dậy = giờ ngủ + 8h */
  CHECKIN_WINDOW:8,         /* cửa sổ điểm danh: trong 8 tiếng sau giờ dậy */
  /* App/web có thể chặn (Chrome Extension & web). Android lấy danh sách app thật từ máy. */
  WEB_APPS:[
    {id:'facebook',name:'Facebook',icon:'fb',domains:['facebook.com','fb.com','messenger.com']},
    {id:'tiktok',name:'TikTok',icon:'tiktok',domains:['tiktok.com']},
    {id:'instagram',name:'Instagram',icon:'ig',domains:['instagram.com']},
    {id:'youtube',name:'YouTube',icon:'yt',domains:['youtube.com']},
    {id:'x',name:'X (Twitter)',icon:'chat',domains:['x.com','twitter.com']},
    {id:'threads',name:'Threads',icon:'chat',domains:['threads.net']},
    {id:'reddit',name:'Reddit',icon:'chat',domains:['reddit.com']},
    {id:'shopee',name:'Shopee',icon:'cart',domains:['shopee.vn']},
    {id:'lazada',name:'Lazada',icon:'cart',domains:['lazada.vn']},
    {id:'netflix',name:'Netflix',icon:'yt',domains:['netflix.com']}
  ],
  /* Ưu đãi chăm sóc */
  CARE:{golden:30,goldenGem:5,combo:40,streakPct:10,streakMax:5},
  FRIENDS:[
    {id:'f1',name:'Mèo Mun',animal:'cat',color:'#D3968C',gems:1840,screen:64,quests:41,sleep:'good',streak:12,wall:'#ecc9c2',floor:'#c99a6b',room:[['rug',2,2],['bed',0,1],['plant',4,0],['lamp',0,0],['shelf',2,0]],bio:'Ngủ 22:30 đều đặn 12 ngày liền!'},
    {id:'f2',name:'Gấu Trúc Pi',animal:'panda',color:'#F7F4D5',gems:2310,screen:152,quests:28,sleep:'bad',streak:0,wall:'#dfe6c8',floor:'#b5a28a',room:[['beanbag',1,1],['tank',4,0],['wardrobe',0,0],['guitar',3,3]],bio:'Đang cai TikTok... lần thứ 3 😅'},
    {id:'f3',name:'Cáo Cam',animal:'fox',color:'#e0a46a',gems:960,screen:48,quests:55,sleep:'good',streak:20,wall:'#cfd9b4',floor:'#a8b98a',room:[['desk',0,0],['shelf',1,0],['plant',5,0],['bed',4,3],['rug',1,2]],bio:'Chạy bộ 5h sáng, đọc sách mỗi tối.'},
    {id:'f4',name:'Thỏ Bông',animal:'rabbit',color:'#efe6c4',gems:1420,screen:95,quests:33,sleep:'good',streak:5,wall:'#b9d3d6',floor:'#efe6c4',room:[['bed',0,2],['lamp',0,1],['beanbag',3,1],['plant',5,5]],bio:'Thích trồng cây và nuôi pet.'},
    {id:'f5',name:'Vịt Vàng',animal:'duck',color:'#f1d77a',gems:720,screen:188,quests:12,sleep:'bad',streak:0,wall:'#e8dcc0',floor:'#d9b0a8',room:[['guitar',0,0],['tank',1,0],['beanbag',2,2]],bio:'Hay thức khuya xem livestream...'},
    {id:'f6',name:'Cú Đêm',animal:'owl',color:'#8a7a9a',gems:1105,screen:131,quests:19,sleep:'bad',streak:1,wall:'#F7F4D5',floor:'#7fa3ab',room:[['desk',0,0],['lamp',1,0],['shelf',0,1],['bed',4,2]],bio:'Đang tập ngủ trước 23h.'}
  ],
  REPLIES:['Cố lên nha! Hôm nay mình mới dùng máy {m} phút thôi 😎','Ok luôn! Tối nay đúng giờ là tắt máy cùng nhau nhé 🌙','Mình vừa đi bộ 15 phút, chạm cỏ xong rồi nè 🌿','Thi đua thì thi! Ai dùng máy ít hơn tuần này thắng 🏆','Cảm ơn sticker nha, dễ thương quá 💚','Vừa uống ly nước ấm, chill ghê','Mai qua thăm vườn bạn nhé!']
};

/* ---------- Persistence (localStorage dùng chung giữa các trang cùng origin) ---------- */
const Store = {
  KEY:'lua_chill_save_v1',
  load(){ try{ return JSON.parse(localStorage.getItem(this.KEY)); }catch(e){ return null; } },
  save(s){ try{ s.savedAt=Date.now(); localStorage.setItem(this.KEY, JSON.stringify(s)); }catch(e){ console.warn('save failed',e); } },
  clear(){ localStorage.removeItem(this.KEY); }
};

/* ---------- Native Bridge ----------
   • Android app (android/): window.LuaChillNative — AccessibilityService chặn app thật + UsageStats đo phút thật.
   • Chrome Extension: ghi "policy" vào chrome.storage.local → background.js chặn web bằng declarativeNetRequest.
   • Tauri v2: invoke('set_policy').
   • Web/PWA: chỉ khóa trong app (iOS/iPadOS không cho web chặn app khác).                        */
const Bridge = {
  get android(){ return typeof window!=='undefined' && !!window.LuaChillNative; },
  get ext(){ try{ return typeof chrome!=='undefined' && !!(chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local); }catch(e){ return false; } },
  get tauri(){ return !!(window.__TAURI__ && window.__TAURI__.core); },
  get canBlock(){ return this.android||this.ext||this.tauri; },
  mode(){ return this.android?'Android (chặn app thật)':this.ext?'Chrome Extension (chặn web thật)':this.tauri?'Tauri Native':'Web/PWA (chỉ khóa trong app)'; },
  syncPolicy(p){
    if(this.android){ try{ window.LuaChillNative.setPolicy(JSON.stringify(p)); }catch(e){ console.warn(e); } }
    else if(this.ext){ chrome.storage.local.set({policy:p}); try{ const r=chrome.runtime.sendMessage({type:'evaluate'}); if(r&&r.catch) r.catch(()=>{}); }catch(e){} }
    else if(this.tauri){ window.__TAURI__.core.invoke('set_policy',{policy:p}).catch(e=>console.warn(e)); } },
  getUsage(){ if(this.android){ try{ return Promise.resolve(JSON.parse(window.LuaChillNative.getUsage())); }catch(e){ return Promise.resolve(null); } }
    if(!this.ext) return Promise.resolve(null); return chrome.storage.local.get('usage').then(r=>r.usage||null).catch(()=>null); }
};

/* ---------- Game Core ---------- */
class GameCore {
  constructor(){ this.ls={}; this.state=Store.load(); this.bedLockOn=false; this._n=0; this.visible=true; if(this.state) this.migrate(); }
  migrate(){ const s=this.state; if(!s||s.v!==1){ this.state=null; return; }
    s.sleep.bed=s.sleep.bed||'23:00'; s.sleep.wake=s.sleep.wake||'06:30'; s.sleep.hist=s.sleep.hist||[];
    s.checkin=s.checkin||{last:null,streak:0,hist:[]}; s.garden.xp=s.garden.xp??30; s.pets.xp=s.pets.xp||{};
    s.decor.lastCollect=s.decor.lastCollect||Date.now(); s.monster=s.monster||{best:0,plays:0}; s.screen.floor=s.screen.floor||0;
    s.sleep.wake=U.hToHm(U.hmToH(s.sleep.bed)+DATA.SLEEP_HOURS);
    s.block=s.block||{web:['facebook','tiktok'],custom:[],android:[]}; s.care=s.care||{streak:0,last:null,combo:{}}; }
  reload(){ this.state=Store.load(); this.migrate(); this.emit('change'); }
  on(e,f){ (this.ls[e]=this.ls[e]||[]).push(f); return ()=>{ this.ls[e]=this.ls[e].filter(x=>x!==f); }; }
  emit(e,d){ (this.ls[e]||[]).slice().forEach(f=>{ try{ f(d); }catch(err){ console.error(err); } }); }
  save(){ if(this.state) Store.save(this.state); }
  get s(){ return this.state; }

  newGame(name,acc){ const now=new Date(), day=U.dayKeyAt(now,7);
    this.state={ v:1, name:name||'Bạn Lừa', created:{day,hour:now.getHours()+now.getMinutes()/60},
      acc:{owned:acc?[acc]:[],on:acc?[acc]:[]}, gems:150, energy:82, happy:72, offset:0, day,
      screen:{limit:120,used:86,extra:0,acc:0,locked:false,floor:0,sites:{}},
      night:{key:null,slept:false,broken:false},
      sleep:{last:null,lastDay:null,streak:2,buffDay:null,bed:'23:00',wake:'07:00',hist:[]},
      checkin:{last:null,streak:0,hist:[]},
      quests:{day,done:{}}, questsTotal:0,
      garden:{health:72,xp:30,watered:{},missed:{}},
      pets:{owned:['dog'],fed:{},happy:70,xp:{dog:0}},
      force:{until:0,id:null},
      decor:{wall:'#F7F4D5',floor:'#c99a6b',lastCollect:Date.now(),
        placed:[{uid:'b1',id:'bed',gx:0,gy:1,rot:0},{uid:'p1',id:'plant',gx:5,gy:0,rot:0},{uid:'r1',id:'rug',gx:2,gy:2,rot:0}],
        boxes:[{uid:'x1',id:'lamp'}]},
      chats:{}, shop:{month:1,history:[]}, monster:{best:0,plays:0}, pendingMorning:null, seenHint:false,
      block:{web:['facebook','tiktok'],custom:[],android:[]}, care:{streak:0,last:null,combo:{}} };
    this.save(); this.syncPolicy(); this.emit('change'); }

  /* --- time & sleep schedule (giờ ngủ do người chơi chọn) --- */
  now(){ return new Date(Date.now()+(this.s?this.s.offset:0)); }
  hour(){ const n=this.now(); return n.getHours()+n.getMinutes()/60+n.getSeconds()/3600; }
  bedH(){ return U.hmToH(this.s.sleep.bed); }
  wakeH(){ return U.hmToH(this.s.sleep.wake); }
  dk(d){ return U.dayKeyAt(d,this.s?this.wakeH():6.5); }
  isBedtime(h=this.hour()){ const b=this.bedH(), w=this.wakeH(); return b>w?(h>=b||h<w):(h>=b&&h<w); }
  isNight(){ const h=this.hour(); return h>=19||h<this.wakeH(); }
  sleepHours(bed=this.s.sleep.bed,wake=this.s.sleep.wake){ return ((U.hmToH(wake)-U.hmToH(bed))+24)%24; }
  minsToBed(){ return Math.round((((this.bedH()-this.hour())+24)%24)*60); }
  /* Người chơi chọn GIỜ NGỦ; giờ dậy tự = giờ ngủ + 8 tiếng (ngủ đủ, hợp lý) */
  setSleepCfg(bed){ const s=this.s;
    if(this.isBedtime() && !s.night.broken) return {ok:false,msg:'Đang trong giờ ngủ — không thể đổi lịch lúc này (chống "lách luật") 😉'};
    s.sleep.bed=bed; s.sleep.wake=U.hToHm(U.hmToH(bed)+DATA.SLEEP_HOURS); this.bedLockOn=false; this.save(); this.syncPolicy(); this.emit('change'); this.tick();
    return {ok:true,hours:DATA.SLEEP_HOURS,wake:s.sleep.wake}; }
  /* --- danh sách app/web bị chặn --- */
  blockedDomains(){ const b=this.s.block; return [...DATA.WEB_APPS.filter(a=>b.web.includes(a.id)).flatMap(a=>a.domains),...b.custom]; }
  setBlock(kind,list){ this.s.block[kind]=[...new Set(list)]; this.save(); this.syncPolicy(); this.emit('change'); }
  hasBuff(){ return this.s.sleep.buffDay===this.s.day; }
  isTiredToday(){ return this.s.sleep.last==='bad' && this.s.sleep.lastDay===this.s.day; }
  mood(){ const s=this.s; if(!s) return 'normal';
    if(this.isBedtime() && s.night.slept) return 'sleep';
    if(this.isTiredToday() || s.energy<30 || (this.isBedtime()&&s.night.broken)) return 'tired';
    if(s.happy<30) return 'sad';
    if(s.energy>=65 && s.happy>=60) return 'happy';
    return 'normal'; }

  /* --- policy gửi xuống background/native blocker --- */
  policy(){ const s=this.s; return {limit:s.screen.limit,extra:s.screen.extra,usedFloor:s.screen.floor||0,screenLocked:s.screen.locked,
    bed:s.sleep.bed,wake:s.sleep.wake,brokenNight:s.night.broken?s.night.key:null,slept:!!s.night.slept,day:s.day,offset:s.offset||0,
    blocked:this.blockedDomains(),blockedPkgs:s.block.android.map(a=>a.pkg||a),updated:Date.now()}; }
  syncPolicy(){ if(this.s) Bridge.syncPolicy(this.policy()); }

  tick(){ const s=this.s; if(!s) return;
    const dk=this.dk(this.now()); if(dk>s.day) this.newDay(); else if(dk<s.day){ s.day=dk; s.quests.day=dk; }
    const bed=this.isBedtime();
    if(bed){ if(s.night.key!==s.day) s.night={key:s.day,slept:false,broken:false};
      if(!s.night.broken && !this.bedLockOn){ this.bedLockOn=true; this.syncPolicy(); this.emit('bedLock',true); } }
    else if(this.bedLockOn){ this.bedLockOn=false; this.emit('bedLock',false); }
    if(Bridge.android||Bridge.ext){ if(this._n%3===0) Bridge.getUsage().then(u=>{ if(!u||u.day!==s.day) return; const v=Math.max(u.minutes,s.screen.floor||0);
        if(v!==s.screen.used){ s.screen.used=v; s.screen.sites=u.sites||u.apps||{}; this.emit('change'); } }); }
    else if(!(bed&&s.night.slept) && this.visible){ s.screen.acc++; if(s.screen.acc>=20){ s.screen.acc=0; s.screen.used++; } }
    if(this.screenRemaining()<=0 && !s.screen.locked){ s.screen.locked=true; this.syncPolicy(); this.emit('screenLock',true); }
    s.energy=U.clamp(s.energy-1/80); s.happy=U.clamp(s.happy-1/110); s.pets.happy=U.clamp(s.pets.happy-1/90);
    this.checkMissed();
    if(++this._n%5===0) this.save();
    this.emit('tick'); }

  /* --- sáng hôm sau: đánh giá giấc ngủ (điểm danh nhận Gem riêng) --- */
  newDay(force){ const s=this.s; const prev=s.day;
    const q=force || ((s.night.key===prev && s.night.broken)?'bad':'good');
    s.day=this.dk(this.now());
    s.quests={day:s.day,done:{}};
    Object.assign(s.screen,{used:0,extra:0,acc:0,locked:false,floor:0,sites:{}});
    s.night={key:null,slept:false,broken:false}; this.bedLockOn=false;
    if(q==='good'){ s.sleep.streak++; s.energy=100; s.happy=U.clamp(s.happy+12); s.sleep.buffDay=s.day; s.garden.health=U.clamp(s.garden.health+25); }
    else { s.sleep.streak=0; s.energy=40; s.happy=U.clamp(s.happy-10); s.sleep.buffDay=null; s.garden.health=U.clamp(s.garden.health-5); }
    s.sleep.last=q; s.sleep.lastDay=s.day; s.sleep.hist=[...s.sleep.hist,{day:prev,q}].slice(-14);
    s.pendingMorning={q,streak:s.sleep.streak,day:s.day};
    this.save(); this.syncPolicy();
    this.emit('bedLock',false); this.emit('screenLock',false); this.emit('morning',s.pendingMorning); this.emit('change'); }

  /* --- Điểm danh buổi sáng: mở trong 8 tiếng sau giờ dậy --- */
  hoursSinceWake(){ return ((this.hour()-this.wakeH())+24)%24; }
  checkInOpen(){ return !this.isBedtime() && this.hoursSinceWake()<DATA.CHECKIN_WINDOW; }
  canCheckIn(){ return !!this.s && this.s.checkin.last!==this.s.day && this.checkInOpen(); }
  checkInPreview(){ const s=this.s, c=s.checkin; const streak=c.last===U.addDays(s.day,-1)?c.streak+1:1;
    const q=s.sleep.lastDay===s.day?s.sleep.last:null; const after=this.hoursSinceWake()*60, onTime=after<=60;
    const parts=[['Điểm danh',20]]; if(streak>1) parts.push([`Chuỗi ${streak} ngày`,Math.min(30,(streak-1)*5)]);
    if(q==='good') parts.push([`Ngủ đủ ${DATA.SLEEP_HOURS} tiếng`,30]); if(onTime) parts.push([`Dậy đúng ${s.sleep.wake}`,15]);
    return {streak,parts,gem:parts.reduce((a,p)=>a+p[1],0),onTime,q,leftH:Math.max(0,DATA.CHECKIN_WINDOW-this.hoursSinceWake())}; }
  checkIn(){ const s=this.s; if(!this.canCheckIn()) return {ok:false};
    const p=this.checkInPreview(), c=s.checkin; c.streak=p.streak; c.last=s.day; c.hist=[...c.hist.filter(d=>d!==s.day),s.day].slice(-30);
    this.boost(4,5); this.addGems(p.gem,'Điểm danh'); this.save(); this.emit('checkin',p); this.emit('change'); return {ok:true,...p}; }

  /* --- gems & stats --- */
  addGems(n,why){ this.s.gems+=n; this.emit('gems',{n,why}); this.save(); }
  spend(n){ if(this.s.gems<n) return false; this.s.gems-=n; this.emit('gems',{n:-n}); this.save(); return true; }
  boost(e,h){ this.s.energy=U.clamp(this.s.energy+e); this.s.happy=U.clamp(this.s.happy+h); }

  /* --- screen time --- */
  screenRemaining(){ const sc=this.s.screen; return sc.limit+sc.extra-sc.used; }
  setLimit(m){ const sc=this.s.screen; sc.limit=m; if(sc.locked && this.screenRemaining()>0){ sc.locked=false; this.emit('screenLock',false); } this.save(); this.syncPolicy(); this.emit('change'); }

  /* --- bedtime --- */
  goSleep(){ this.s.night.slept=true; this.save(); this.syncPolicy(); this.emit('sleepState'); this.emit('change'); }
  breakBedLock(){ this.s.night.broken=true; this.s.night.slept=false; this.bedLockOn=false; this.save(); this.syncPolicy(); this.emit('bedLock',false); this.emit('change'); }

  /* --- quests --- */
  questGem(id){ const q=DATA.QUESTS.find(x=>x.id===id); return Math.round(q.gem*(this.hasBuff()?1.2:1)); }
  questCount(){ return Object.keys(this.s.quests.done).length; }
  completeQuest(id,photo,auto){ const s=this.s, d=s.quests.done;
    if(d[id]){ if(photo && !d[id].photo){ d[id].photo=photo; this.save(); this.emit('quest',{id}); } return {ok:false}; }
    d[id]={photo:photo||null,auto:!!auto,t:Date.now()};
    const g=this.questGem(id); s.questsTotal++; this.boost(6,6); this.addGems(g,'Quest');
    let bonus=false;
    if(s.screen.locked){ s.screen.extra+=5; s.screen.locked=false; s.gems+=10; bonus=true; this.emit('screenLock',false); }
    this.save(); this.syncPolicy(); this.emit('quest',{id,g,bonus}); this.emit('change');
    return {ok:true,g,bonus}; }

  /* --- time windows --- */
  activeWin(list){ const s=this.s; if(Date.now()<s.force.until) return {id:s.force.id,label:'Demo',from:0,to:24,demo:true};
    const h=this.hour(); return list.find(w=>h>=w.from&&h<w.to)||null; }
  winState(list,doneMap){ const h=this.hour(), s=this.s;
    return list.map(w=>{ const k=s.day+'|'+w.id; let st='later';
      if(doneMap[k]) st='done'; else if(h>=w.from&&h<w.to) st='now'; else if(h>=w.to && h>=this.wakeH()) st='miss';
      return {...w,st}; }); }
  checkMissed(){ const s=this.s, h=this.hour(); if(h<this.wakeH()) return;
    for(const w of DATA.GARDEN_WIN){ const k=s.day+'|'+w.id;
      if(h>=w.to && !s.garden.watered[k] && !s.garden.missed[k]){
        if(s.day===s.created.day && w.to<=s.created.hour){ s.garden.missed[k]=2; continue; }
        s.garden.missed[k]=1; s.garden.health=U.clamp(s.garden.health-15); this.emit('wilt'); this.emit('change'); } } }

  /* --- ƯU ĐÃI CHĂM SÓC: Giờ vàng (30' đầu khung giờ) • Chuỗi chăm sóc +10%/ngày (tối đa +50%) • Combo cả ngày +40 --- */
  careMult(){ return 1+Math.min(DATA.CARE.streakMax,this.s.care.streak)*DATA.CARE.streakPct/100; }
  isGolden(w){ return w.demo || (this.hour()-w.from)*60<=DATA.CARE.golden; }
  careStatus(){ const s=this.s, d=s.day; const wDone=DATA.GARDEN_WIN.filter(w=>s.garden.watered[d+'|'+w.id]).length, fDone=DATA.MEAL_WIN.filter(w=>s.pets.fed[d+'|'+w.id]).length;
    return {wDone,wTot:DATA.GARDEN_WIN.length,fDone,fTot:DATA.MEAL_WIN.length,streak:s.care.streak,mult:this.careMult(),comboDone:s.care.last===d}; }
  careReward(base,w){ const parts=[[ 'Cơ bản',base ]]; let g=base; const m=this.careMult();
    if(m>1){ const x=Math.round(base*(m-1)); parts.push([`Chuỗi chăm sóc ×${m.toFixed(1)}`,x]); g+=x; }
    if(this.isGolden(w)){ parts.push(['Giờ vàng',DATA.CARE.goldenGem]); g+=DATA.CARE.goldenGem; }
    return {g,parts}; }
  checkCombo(){ const s=this.s, c=this.careStatus(); if(c.comboDone||c.wDone<c.wTot||c.fDone<c.fTot) return 0;
    s.care.streak=(s.care.last===U.addDays(s.day,-1)?s.care.streak:0)+1; s.care.last=s.day; this.addGems(DATA.CARE.combo,'Combo chăm sóc'); this.boost(5,8); return DATA.CARE.combo; }
  /* --- vườn: tưới đúng giờ → cây LỚN dần qua 5 giai đoạn --- */
  lvOf(xp,table){ let i=0; table.forEach((t,j)=>{ if(xp>=t.xp) i=j; }); return i; }
  gardenStage(){ return this.lvOf(this.s.garden.xp,DATA.GARDEN_STAGES); }
  water(){ const s=this.s, w=this.activeWin(DATA.GARDEN_WIN);
    if(!w) return {ok:false,msg:'Chưa tới khung giờ tưới. Tưới đúng giờ mới được thưởng nhé!'};
    const k=s.day+'|'+w.id; if(s.garden.watered[k]) return {ok:false,msg:'Khung giờ này đã tưới rồi, hoa đang no nước!'};
    const before=this.gardenStage(), r=this.careReward(15,w); s.garden.watered[k]=1; s.garden.xp+=25; s.garden.health=U.clamp(s.garden.health+30); this.boost(2,5);
    this.addGems(r.g,'Tưới cây'); this.completeQuest('plant',null,true); const combo=this.checkCombo(); const stage=this.gardenStage(); this.emit('change');
    return {ok:true,gem:r.g,parts:r.parts,combo,stageUp:stage>before,stage}; }

  /* --- pet: cho ăn đúng bữa → pet LỚN (4 cấp) --- */
  petLv(id){ return this.lvOf(this.s.pets.xp[id]||0,DATA.PET_LV); }
  feed(){ const s=this.s, w=this.activeWin(DATA.MEAL_WIN);
    if(!w) return {ok:false,msg:'Chưa tới giờ ăn. Pet ăn đúng bữa mới khỏe nha!'};
    const k=s.day+'|'+w.id; if(s.pets.fed[k]) return {ok:false,msg:'Các bé đã ăn bữa này rồi, no căng bụng!'};
    s.pets.fed[k]=1; const ups=[];
    for(const id of s.pets.owned){ const b=this.petLv(id); s.pets.xp[id]=(s.pets.xp[id]||0)+20; const a=this.petLv(id); if(a>b) ups.push({id,lv:a}); }
    const r=this.careReward(10*s.pets.owned.length,w); s.pets.happy=U.clamp(s.pets.happy+30); this.boost(2,8);
    this.addGems(r.g,'Cho pet ăn'); this.completeQuest('feed',null,true); const combo=this.checkCombo(); this.emit('change');
    return {ok:true,gem:r.g,parts:r.parts,combo,ups}; }
  fedNow(){ const w=this.activeWin(DATA.MEAL_WIN); return !!(w && this.s.pets.fed[this.s.day+'|'+w.id]); }
  adopt(id){ const p=DATA.PETS[id]; if(this.s.pets.owned.includes(id)) return {ok:false,msg:'Đã nhận nuôi rồi'};
    if(!this.spend(p.price)) return {ok:false,msg:'Chưa đủ Gem'}; this.s.pets.owned.push(id); this.s.pets.xp[id]=0; this.boost(0,10); this.save(); this.emit('pets'); this.emit('change'); return {ok:true}; }

  /* --- accessories --- */
  buyAcc(id){ const a=DATA.ACCS[id]; if(this.s.acc.owned.includes(id)) return true; if(!this.spend(a.price)) return false;
    this.s.acc.owned.push(id); this.s.acc.on.push(id); this.save(); this.emit('acc'); return true; }
  toggleAcc(id){ const on=this.s.acc.on; const i=on.indexOf(id); if(i>=0) on.splice(i,1); else on.push(id); this.save(); this.emit('acc'); }

  /* --- decor + tycoon income --- */
  buyDecor(id){ if(!this.spend(DATA.DECOR[id].price)) return false; this.s.decor.boxes.push({uid:U.uid(),id}); this.save(); this.emit('decor'); return true; }
  fp(id,rot){ const d=DATA.DECOR[id]; return rot?{w:d.d,d:d.w}:{w:d.w,d:d.d}; }
  canPlace(id,gx,gy,rot,ignore){ const f=this.fp(id,rot), flat=!!DATA.DECOR[id].flat;
    if(gx<0||gy<0||gx+f.w>6||gy+f.d>6) return false;
    return !this.s.decor.placed.some(p=>{ if(p.uid===ignore) return false; if(!!DATA.DECOR[p.id].flat!==flat) return false;
      const g=this.fp(p.id,p.rot); return gx<p.gx+g.w && gx+f.w>p.gx && gy<p.gy+g.d && gy+f.d>p.gy; }); }
  place(uid,id,gx,gy,rot){ const D=this.s.decor; if(!this.canPlace(id,gx,gy,rot,uid)) return false;
    D.boxes=D.boxes.filter(b=>b.uid!==uid); const ex=D.placed.find(p=>p.uid===uid);
    if(ex) Object.assign(ex,{gx,gy,rot}); else D.placed.push({uid,id,gx,gy,rot}); this.save(); this.emit('decor'); return true; }
  storeItem(uid){ const D=this.s.decor; const p=D.placed.find(x=>x.uid===uid); if(!p) return; D.placed=D.placed.filter(x=>x!==p); D.boxes.push({uid,id:p.id}); this.save(); this.emit('decor'); }
  paint(kind,color){ const D=this.s.decor; if(D[kind]===color) return true; if(!this.spend(DATA.PAINT_COST)) return false; D[kind]=color; this.save(); this.emit('decor'); return true; }
  comfort(){ return this.s.decor.placed.reduce((a,p)=>a+(DATA.DECOR[p.id].comfort||5),0)+(this.s.decor.wall!=='#F7F4D5'?3:0); }
  incomeRate(){ return Math.round(this.comfort()/5); }
  income(){ const h=Math.min(8,(Date.now()-this.s.decor.lastCollect)/3600e3); return Math.floor(h*this.incomeRate()); }
  collect(){ const g=this.income(); if(g<=0) return 0; this.s.decor.lastCollect=Date.now(); this.addGems(g,'Thu nhập phòng'); return g; }

  /* --- social --- */
  sendChat(fid,m){ const c=(this.s.chats[fid]=this.s.chats[fid]||[]); c.push({me:true,...m}); this.save(); this.emit('chat',fid);
    const f=DATA.FRIENDS.find(x=>x.id===fid);
    setTimeout(()=>{ c.push({me:false,text:U.pick(DATA.REPLIES).replace('{m}',f.screen)}); this.save(); this.emit('chat',fid); },1100+Math.random()*900); }
  board(tab){ const s=this.s;
    const me={id:'me',me:true,name:s.name,gems:s.gems,screen:s.screen.used,quests:s.questsTotal};
    const all=[...DATA.FRIENDS.map(f=>({...f})),me];
    return all.sort((a,b)=>tab==='screen'?a.screen-b.screen:b[tab]-a[tab]); }

  /* --- minigames --- */
  finishShopping(sum){ const s=this.s; s.shop.history.push({month:s.shop.month,profile:sum.profile,spent:sum.spent,fomo:sum.fomoCount,gem:sum.gem}); s.shop.month++;
    this.boost(0,sum.reserveOk?8:-4); this.addGems(sum.gem,'Shopping Tỉnh Thức'); this.emit('change'); }
  finishMonster(score,gem){ const m=this.s.monster; m.plays++; m.best=Math.max(m.best,score); this.boost(0,gem>20?6:0); this.addGems(gem,'Quái vật FOMO'); this.emit('change'); }

  /* --- demo controls --- */
  demoScreenOut(){ const sc=this.s.screen; sc.used=sc.limit+sc.extra; sc.floor=sc.used; sc.locked=false; this.tick(); }
  demoBedtime(){ const [y,m,d]=this.s.day.split('-').map(Number), b=this.bedH(); const plus=b<this.wakeH()?1:0;
    this.s.offset=new Date(y,m-1,d+plus,Math.floor(b),Math.round((b%1)*60),0)-Date.now(); this.s.night={key:this.s.day,slept:false,broken:false}; this.bedLockOn=false; this.syncPolicy(); this.tick(); }
  demoMorning(q){ const s=this.s, [y,m,d]=s.day.split('-').map(Number), w=this.wakeH();
    s.night={key:s.day,slept:q==='good',broken:q==='bad'}; s.offset=new Date(y,m-1,d+1,Math.floor(w),Math.round((w%1)*60)+2,0)-Date.now(); this.newDay(q); }
  demoWindows(){ this.s.force={until:Date.now()+10*60e3,id:'demo'+Date.now()}; this.save(); this.emit('change'); }
  demoIncome(){ this.s.decor.lastCollect=Date.now()-8*3600e3; this.save(); this.emit('decor'); }
  realTime(){ this.s.offset=0; this.s.force.until=0; this.bedLockOn=false; this.save(); this.syncPolicy(); this.tick(); this.emit('change'); }
}

/* ---------- Grid A* pathfinding (8 hướng, không cắt góc) + làm mượt LOS ---------- */
const Path = {
  make(cols,rows,cell,blockedFn){ const g=new Uint8Array(cols*rows);
    for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) g[y*cols+x]=blockedFn((x+.5)*cell,(y+.5)*cell,x,y)?1:0;
    return {cols,rows,cell,g}; },
  blocked(G,x,y){ return x<0||y<0||x>=G.cols||y>=G.rows||G.g[y*G.cols+x]===1; },
  nearestFree(G,x,y){ if(!this.blocked(G,x,y)) return [x,y]; const seen=new Set([y*G.cols+x]); const q=[[x,y]];
    while(q.length){ const [cx,cy]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){ const nx=cx+dx, ny=cy+dy, k=ny*G.cols+nx;
      if(nx<0||ny<0||nx>=G.cols||ny>=G.rows||seen.has(k)) continue; seen.add(k); if(!this.blocked(G,nx,ny)) return [nx,ny]; q.push([nx,ny]); } }
    return [x,y]; },
  find(G,sx,sy,tx,ty){ [sx,sy]=this.nearestFree(G,sx,sy); [tx,ty]=this.nearestFree(G,tx,ty);
    const C=G.cols, N=C*G.rows, gS=new Float32Array(N).fill(1e9), from=new Int32Array(N).fill(-1), closed=new Uint8Array(N);
    const h=(x,y)=>{ const dx=Math.abs(x-tx), dy=Math.abs(y-ty); return Math.max(dx,dy)+.414*Math.min(dx,dy); };
    const open=[]; const s=sy*C+sx, t=ty*C+tx; gS[s]=0; open.push({k:s,f:h(sx,sy)});
    while(open.length){ let bi=0; for(let i=1;i<open.length;i++) if(open[i].f<open[bi].f) bi=i; const cur=open.splice(bi,1)[0].k;
      if(cur===t) break; if(closed[cur]) continue; closed[cur]=1; const cx=cur%C, cy=(cur/C)|0;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dy) continue; const nx=cx+dx, ny=cy+dy;
        if(this.blocked(G,nx,ny)) continue; if(dx&&dy&&(this.blocked(G,cx+dx,cy)||this.blocked(G,cx,cy+dy))) continue;
        const nk=ny*C+nx; if(closed[nk]) continue; const ng=gS[cur]+(dx&&dy?1.414:1);
        if(ng<gS[nk]){ gS[nk]=ng; from[nk]=cur; open.push({k:nk,f:ng+h(nx,ny)}); } } }
    if(from[t]===-1 && s!==t) return null;
    const out=[]; for(let k=t;k!==-1;k=from[k]){ out.push([k%C,(k/C)|0]); if(k===s) break; } return out.reverse(); },
  los(G,x0,y0,x1,y1){ const d=Math.hypot(x1-x0,y1-y0), n=Math.ceil(d/(G.cell*.25));
    for(let i=0;i<=n;i++){ const x=x0+(x1-x0)*i/n, y=y0+(y1-y0)*i/n;
      for(const [ox,oy] of [[0,0],[5,0],[-5,0],[0,5],[0,-5]]) if(this.blocked(G,Math.floor((x+ox)/G.cell),Math.floor((y+oy)/G.cell))) return false; }
    return true; },
  route(G,fx,fy,tx,ty){ const c=G.cell; const p=this.find(G,Math.floor(fx/c),Math.floor(fy/c),Math.floor(tx/c),Math.floor(ty/c));
    if(!p) return [];
    const pts=p.map(([x,y])=>[(x+.5)*c,(y+.5)*c]);
    const end=pts[pts.length-1]; if(!this.blocked(G,Math.floor(tx/c),Math.floor(ty/c))){ end[0]=tx; end[1]=ty; }
    const out=[]; let cur=[fx,fy], i=0;
    while(i<pts.length-1){ let j=pts.length-1; while(j>i+1 && !this.los(G,cur[0],cur[1],pts[j][0],pts[j][1])) j--; out.push(pts[j]); cur=pts[j]; i=j; }
    if(!out.length) out.push(end);
    return out; }
};

/* ---------- Mover: di chuyển theo waypoint, xoay mặt mượt ---------- */
class Mover {
  constructor(x,y,speed){ Object.assign(this,{x,y,speed,path:[],yaw:0,tyaw:0,moving:false,onArrive:null}); }
  go(path,cb){ this.path=path.slice(); this.onArrive=cb||null; if(!this.path.length && cb){ this.onArrive=null; cb(); } }
  stop(){ this.path=[]; this.onArrive=null; this.moving=false; }
  face(x,y){ this.tyaw=Math.atan2(x-this.x,y-this.y)*180/Math.PI; }
  update(dt){ if(this.path.length){ const [tx,ty]=this.path[0]; const dx=tx-this.x, dy=ty-this.y, d=Math.hypot(dx,dy), st=this.speed*dt;
      if(d>.5) this.tyaw=Math.atan2(dx,dy)*180/Math.PI;
      if(d<=st){ this.x=tx; this.y=ty; this.path.shift(); if(!this.path.length){ this.moving=false; const f=this.onArrive; this.onArrive=null; f&&f(); } }
      else { this.x+=dx/d*st; this.y+=dy/d*st; this.moving=true; } }
    else this.moving=false;
    this.yaw+=U.angDiff(this.yaw,this.tyaw)*Math.min(1,dt*9); }
}

const Core = new GameCore();
