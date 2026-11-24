/* =============================================================================
   core/engine.js — [CORE ENGINE] thuần logic & state, KHÔNG chạm DOM.
   • Hỗ trợ đồng hồ theo vị trí / GPS / múi giờ IANA / chỉnh giờ thủ công.
   • 3 chế độ chặn tùy chỉnh: Lockdown (khóa tất cả chừa 3 app khẩn cấp) • Từng app • Nhóm app.
   • Nhắc hẹn thông minh: Nhiệm vụ • Điểm danh • Giờ ngủ • Giờ dậy • Gần hết giới hạn.
   • Cầu nối native: Android (Kotlin + Accessibility + Draw-Over-Apps + UsageStats + AlarmManager),
     Chrome Extension (MV3), Electron Desktop (Windows/macOS/Linux), và Web/PWA.
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
  dayKeyAt:(d,shiftH)=>U.ymd(new Date(d.getTime()-shiftH*3600e3)),
  addDays:(k,n)=>{const [y,m,d]=k.split('-').map(Number);return U.ymd(new Date(y,m-1,d+n));},
  hm:d=>U.pad(d.getHours())+':'+U.pad(d.getMinutes()),
  hmToH:s=>{const [h,m]=String(s).split(':').map(Number);return h+(m||0)/60;},
  hToHm:h=>{h=((h%24)+24)%24;return U.pad(Math.floor(h))+':'+U.pad(Math.round((h%1)*60)%60);},
  angDiff:(a,b)=>((b-a)%360+540)%360-180,
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};

/* ---------- Tiện ích Múi giờ & Vị trí (hoạt động hoàn toàn offline + có quét GPS/IP) ---------- */
const ClockUtil = {
  deviceTz(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Ho_Chi_Minh'; }catch(e){ return 'Asia/Ho_Chi_Minh'; } },
  /* Tính độ lệch (ms) giữa múi giờ IANA `tz` và giờ cục bộ của trình duyệt tại thời điểm `date` */
  tzShiftMs(tz, date=new Date()){
    try{
      const fmt=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
      const ps=Object.fromEntries(fmt.formatToParts(date).map(p=>[p.type,p.value]));
      const h=ps.hour==='24'?0:+ps.hour;
      const wall=new Date(+ps.year,+ps.month-1,+ps.day,h,+ps.minute,+ps.second);
      return Math.round((wall.getTime()-date.getTime())/60000)*60000;
    }catch(e){ return 0; }
  },
  dateInTz(date, tz){ return new Date(date.getTime()+this.tzShiftMs(tz,date)); },
  utcLabel(tz){
    try{
      const s=new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'shortOffset'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName');
      return s?s.value.replace('GMT','UTC'):'UTC';
    }catch(e){ return 'UTC'; }
  },
  allTimezones(){
    try{ if(typeof Intl.supportedValuesOf==='function') return Intl.supportedValuesOf('timeZone'); }catch(e){}
    return DATA.TIMEZONES.map(x=>x.tz);
  },
  /* Ước lượng múi giờ dự phòng từ tọa độ GPS khi mất mạng */
  guessTzByCoords(lat, lon){
    if(lat>=8&&lat<=24&&lon>=102&&lon<=110) return {tz:'Asia/Ho_Chi_Minh',region:'Việt Nam (GPS)'};
    if(lat>=5&&lat<=21&&lon>=97&&lon<=106) return {tz:'Asia/Bangkok',region:'Đông Nam Á (GPS)'};
    if(lat>=1&&lat<=7&&lon>=100&&lon<=105) return {tz:'Asia/Singapore',region:'Singapore / Malaysia (GPS)'};
    if(lat>=24&&lat<=46&&lon>=123&&lon<=146) return {tz:'Asia/Tokyo',region:'Nhật Bản (GPS)'};
    if(lat>=33&&lat<=39&&lon>=124&&lon<=131) return {tz:'Asia/Seoul',region:'Hàn Quốc (GPS)'};
    const off=Math.max(-12,Math.min(14,Math.round(lon/15)));
    const map={'7':'Asia/Ho_Chi_Minh','8':'Asia/Singapore','9':'Asia/Tokyo','10':'Australia/Sydney','0':'Europe/London','1':'Europe/Paris','-5':'America/New_York','-8':'America/Los_Angeles'};
    const tz=map[String(off)]||(off===0?'UTC':`Etc/GMT${off>0?'-'+off:'+'+Math.abs(off)}`);
    return {tz,region:`Tọa độ ${lat.toFixed(2)}, ${lon.toFixed(2)} (UTC${off>=0?'+':''}${off})`};
  },
  async fetchJson(url, ms=3500){
    const ac=new AbortController(), t=setTimeout(()=>ac.abort(),ms);
    try{ const r=await fetch(url,{signal:ac.signal}); if(!r.ok) throw new Error(r.status); return await r.json(); }
    finally{ clearTimeout(t); }
  }
};

const DATA = {
  QUEST_CATS:{body:'Thể chất',outdoor:'Ngoài trời',mind:'Tinh thần',social:'Kết nối',care:'Chăm sóc'},
  DAILY_QUEST_COUNT:6,
  DAILY_REROLLS:2,
  QUESTS:[
    /* Thể chất */
    {id:'water',     cat:'body',    name:'Uống đủ 2 ly nước lọc',                   icon:'glass',      gem:20},
    {id:'exercise',  cat:'body',    name:'Tập thể dục / giãn cơ 10 phút',           icon:'run',        gem:25},
    {id:'walk',      cat:'body',    name:'Đi bộ 15 phút không nhìn điện thoại',     icon:'shoes',      gem:25},
    {id:'eyes',      cat:'body',    name:'Nghỉ mắt 20-20-20 nhìn xa ra ngoài trời', icon:'sun',        gem:20},
    {id:'posture',   cat:'body',    name:'Giãn cổ vai gáy & chỉnh tư thế ngồi',     icon:'bolt',       gem:20},
    {id:'fruit',     cat:'body',    name:'Ăn 1 phần trái cây hoặc rau xanh',        icon:'flower',     gem:20},
    /* Ngoài trời & Đời thực */
    {id:'grass',     cat:'outdoor', name:'Ra ngoài chạm vào cỏ / cây xanh',         icon:'grass',      gem:25},
    {id:'sunlight',  cat:'outdoor', name:'Phơi nắng sáng / hít thở ngoài trời 5p',  icon:'sunrise',    gem:20},
    {id:'sky',       cat:'outdoor', name:'Chụp 1 tấm ảnh bầu trời hoặc cây quanh bạn',icon:'camera',   gem:20},
    {id:'tidy',      cat:'outdoor', name:'Dọn gọn bàn học / góc làm việc',          icon:'broom',      gem:25},
    {id:'cook',      cat:'outdoor', name:'Tự pha đồ uống lành mạnh hoặc làm bữa nhẹ',icon:'cooker',    gem:25},
    {id:'plant_real',cat:'outdoor', name:'Tưới hoặc lau lá cho 1 chậu cây thật',    icon:'sprout',     gem:20},
    /* Tinh thần & Cai màn hình */
    {id:'read',      cat:'mind',    name:'Đọc 10 trang sách giấy',                  icon:'book',       gem:20},
    {id:'journal',   cat:'mind',    name:'Viết 3 điều khiến bạn biết ơn hôm nay',   icon:'quest',      gem:20},
    {id:'breathe',   cat:'mind',    name:'Hít thở sâu / thiền tĩnh tâm 5 phút',     icon:'moon',       gem:20},
    {id:'detox30',   cat:'mind',    name:'Đặt điện thoại sang phòng khác 30 phút',  icon:'phone',      gem:30},
    {id:'music',     cat:'mind',    name:'Nghe 1 bản nhạc thư giãn không lướt mạng',icon:'headphones', gem:20},
    {id:'learn',     cat:'mind',    name:'Học 1 kiến thức mới ngoài mạng xã hội',   icon:'desklamp',   gem:25},
    /* Kết nối */
    {id:'talk',      cat:'social',  name:'Trò chuyện trực tiếp với gia đình / bạn 10p',icon:'heart',   gem:25},
    {id:'smile',     cat:'social',  name:'Gửi 1 lời hỏi thăm tích cực cho người thân',icon:'chat',     gem:20},
    {id:'declutter', cat:'social',  name:'Tắt bớt thông báo từ 1 app gây xao nhãng',icon:'bell',       gem:20},
    {id:'plan',      cat:'social',  name:'Viết ra 3 việc quan trọng nhất hôm nay',  icon:'calendar',   gem:20},
    /* Chăm sóc trong game (tự hoàn thành khi tưới/cho ăn đúng giờ) */
    {id:'feed',      cat:'care',    name:'Cho thú cưng ăn đúng giờ',                icon:'bowl',       gem:15},
    {id:'plant',     cat:'care',    name:'Tưới cây trong vườn đúng giờ',            icon:'can',        gem:15}
  ],
  GARDEN_WIN:[{id:'am',label:'Sáng',from:6,to:10},{id:'pm',label:'Chiều',from:16,to:19}],
  MEAL_WIN:[{id:'b',label:'Bữa sáng',from:6,to:10},{id:'l',label:'Bữa trưa',from:11,to:14},{id:'d',label:'Bữa tối',from:18,to:21}],
  GARDEN_STAGES:[{xp:0,name:'Hạt giống'},{xp:25,name:'Mầm non'},{xp:75,name:'Cây con'},{xp:150,name:'Nụ hoa'},{xp:250,name:'Nở rộ'}],
  PET_LV:[{xp:0,name:'Bé con',scale:.72},{xp:40,name:'Nhóc tì',scale:.86},{xp:100,name:'Trưởng thành',scale:1},{xp:200,name:'Siêu cưng',scale:1.16}],
  PETS:{ dog:{name:'Cún Mochi',price:0}, cat:{name:'Mèo Mướp',price:120}, rabbit:{name:'Thỏ Bông',price:180}, capy:{name:'Capybara Bơ',price:250} },
  ACCS:{ scarf:{name:'Khăn quàng cổ',price:80}, beanie:{name:'Mũ len',price:80}, headphones:{name:'Tai nghe',price:100} },
  DECOR:{
    bed:     {name:'Giường gỗ',    price:120,w:1,d:2,comfort:12,cat:'bedroom'},
    desk:    {name:'Bàn học',      price:90, w:1,d:1,comfort:8, cat:'bedroom'},
    wardrobe:{name:'Tủ quần áo',   price:110,w:1,d:1,comfort:9, cat:'bedroom'},
    lamp:    {name:'Đèn ngủ',      price:40, w:1,d:1,comfort:4, cat:'bedroom'},
    sofa:    {name:'Ghế sofa',     price:130,w:2,d:1,comfort:14,cat:'living'},
    tv:      {name:'Tivi & kệ',    price:150,w:2,d:1,comfort:16,cat:'living'},
    ctable:  {name:'Bàn trà',      price:55, w:1,d:1,comfort:6, cat:'living'},
    shelf:   {name:'Kệ sách',      price:80, w:1,d:1,comfort:8, cat:'living'},
    plant:   {name:'Chậu cây',     price:30, w:1,d:1,comfort:4, cat:'living'},
    beanbag: {name:'Ghế lười',     price:60, w:1,d:1,comfort:6, cat:'living'},
    rug:     {name:'Thảm tròn',    price:50, w:2,d:2,flat:true,comfort:5,cat:'living'},
    tank:    {name:'Bể cá mini',   price:70, w:1,d:1,comfort:7, cat:'living'},
    fridge:  {name:'Tủ lạnh',      price:120,w:1,d:1,comfort:12,cat:'kitchen'},
    stove:   {name:'Bếp nấu',      price:140,w:2,d:1,comfort:14,cat:'kitchen'},
    dtable:  {name:'Bàn ăn',       price:95, w:1,d:2,comfort:10,cat:'kitchen'},
    tub:     {name:'Bồn tắm bọt',  price:160,w:2,d:1,comfort:16,cat:'bathroom'},
    sink:    {name:'Bồn rửa mặt',  price:85, w:1,d:1,comfort:9, cat:'bathroom'},
    toilet:  {name:'Bồn cầu gọn',  price:70, w:1,d:1,comfort:7, cat:'bathroom'},
    pc:      {name:'Góc PC Gaming',price:180,w:2,d:1,comfort:18,cat:'gaming'},
    gchair:  {name:'Ghế Gaming',   price:95, w:1,d:1,comfort:10,cat:'gaming'},
    arcade:  {name:'Máy Game Thùng',price:145,w:1,d:1,comfort:15,cat:'gaming'},
    guitar:  {name:'Đàn guitar',   price:65, w:1,d:1,comfort:6, cat:'gaming'}
  },
  ROOMS:{
    bedroom: {name:'Phòng ngủ',       price:0,  wall:'#F7F4D5',floor:'#c99a6b',desc:'Không gian nghỉ ngơi ấm áp mặc định'},
    living:  {name:'Phòng khách',     price:180,wall:'#dfe6c8',floor:'#efe6c4',desc:'Đặt TV, ghế sofa, bàn trà tiếp bạn bè'},
    kitchen: {name:'Nhà bếp',         price:200,wall:'#e8dcc0',floor:'#d9b0a8',desc:'Tủ lạnh, bếp nấu & bàn ăn ấm cúng'},
    bathroom:{name:'Phòng tắm',       price:220,wall:'#b9d3d6',floor:'#7fa3ab',desc:'Bồn tắm bọt, bồn rửa & góc spa'},
    gaming:  {name:'Phòng chơi game', price:260,wall:'#cfd9b4',floor:'#b5a28a',desc:'Góc PC Gaming, ghế gaming & máy thùng'}
  },
  HOUSES:{
    mushroom:  {name:'Nhà Nấm Cổ Điển',    size:'Nhỏ',    theme:'Cổ tích',   price:0,  comfort:0, desc:'Ngôi nhà mái nấm ấm cúng khởi đầu'},
    cottage:   {name:'Nhà Gỗ Mái Ngói',    size:'Nhỏ',    theme:'Đồng quê',  price:180,comfort:10,desc:'Mái ngói hồng đất, ống khói & bồn hoa'},
    greenhouse:{name:'Nhà Kính Vườn Xanh', size:'Vừa',    theme:'Thực vật',  price:260,comfort:18,desc:'Nhà kính tràn nắng & cây xanh mát mắt'},
    japanese:  {name:'Nhà Trà Đạo Zen',    size:'Vừa',    theme:'Nhật Bản',  price:340,comfort:24,desc:'Mái ngói cong, cửa shoji & đèn lồng ấm'},
    treehouse: {name:'Nhà Trên Cây Cổ Thụ',size:'Lớn',    theme:'Rừng xanh', price:450,comfort:32,desc:'Nhà gỗ trên tán cây kèm ban công & thang dây'},
    villa:     {name:'Biệt Thự Đồi Xanh',  size:'Rất lớn',theme:'Sang trọng',price:600,comfort:45,desc:'Biệt thự 2 tầng sang trọng, ban công & cửa đôi'}
  },
  THEMES:[
    {id:'classic', name:'Cổ Điển (Beige & Moss)',desc:'Bảng màu chuẩn ấm áp mặc định',     sw:['#F7F4D5','#839958','#D3968C','#105666','#0A3323'], dsw:['#142a22','#203f33','#839958','#D3968C','#F7F4D5']},
    {id:'matcha',  name:'Rừng Matcha',           desc:'Xanh rêu dịu mắt tràn sức sống',    sw:['#e7eed8','#839958','#D3968C','#105666','#0A3323'], dsw:['#162b1f','#234230','#97b264','#D3968C','#F7F4D5']},
    {id:'rosy',    name:'Bình Minh Hồng Đào',    desc:'Kem hồng đất nhẹ nhàng, ngọt ngào', sw:['#f6e9e4','#D3968C','#839958','#105666','#0A3323'], dsw:['#281e21','#3c2b30','#D3968C','#839958','#F7F4D5']},
    {id:'midnight',name:'Biển Đêm Thanh Mát',    desc:'Lam xanh Midnight tập trung thư thái',sw:['#ddebee','#105666','#839958','#D3968C','#0A3323'], dsw:['#0d262e','#153a46','#8cd1de','#839958','#F7F4D5']},
    {id:'sunset',  name:'Cát Hoàng Hôn',         desc:'Vàng kem ấm áp dịu nhẹ cuối chiều', sw:['#f5ebd2','#D3968C','#105666','#839958','#0A3323'], dsw:['#292218','#3d3222','#e0a889','#839958','#F7F4D5']},
    {id:'forest',  name:'Rừng Sâu Cổ Thụ',       desc:'Xanh lá rừng trầm ổn, dịu mắt',     sw:['#dce6d5','#0A3323','#839958','#105666','#D3968C'], dsw:['#0c2920','#143c30','#839958','#8cd1de','#F7F4D5']}
  ],
  WALLS:['#F7F4D5','#dfe6c8','#ecc9c2','#b9d3d6','#e8dcc0','#cfd9b4'],
  FLOORS:['#c99a6b','#a8b98a','#efe6c4','#d9b0a8','#7fa3ab','#b5a28a'],
  PAINT_COST:15,
  BED_OPTIONS:['20:30','21:00','21:30','22:00','22:30','23:00','23:30','00:00','00:30'],
  SLEEP_HOURS:8,
  CHECKIN_WINDOW:8,
  TIMEZONES:[
    {tz:'Asia/Ho_Chi_Minh', label:'Việt Nam — TP.HCM / Hà Nội'},
    {tz:'Asia/Bangkok',     label:'Thái Lan — Bangkok'},
    {tz:'Asia/Singapore',   label:'Singapore / Malaysia'},
    {tz:'Asia/Tokyo',       label:'Nhật Bản — Tokyo'},
    {tz:'Asia/Seoul',       label:'Hàn Quốc — Seoul'},
    {tz:'Asia/Shanghai',    label:'Trung Quốc / Đài Loan'},
    {tz:'Australia/Sydney', label:'Úc — Sydney'},
    {tz:'Europe/London',    label:'Anh — London'},
    {tz:'Europe/Paris',     label:'Pháp / Đức — Paris'},
    {tz:'America/New_York', label:'Mỹ (Đông) — New York'},
    {tz:'America/Los_Angeles',label:'Mỹ (Tây) — Los Angeles'},
    {tz:'UTC',              label:'Giờ quốc tế (UTC)'}
  ],
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
  DEFAULT_GROUPS:[
    {id:'social',name:'Mạng xã hội',limit:45,web:['facebook','tiktok','instagram','x','threads'],custom:[],android:[],pc:[]},
    {id:'video', name:'Video & Phim',limit:60,web:['youtube','netflix'],custom:[],android:[],pc:[]},
    {id:'shop',  name:'Mua sắm FOMO',limit:20,web:['shopee','lazada'],custom:[],android:[],pc:[]},
    {id:'game',  name:'Game giải trí',limit:30,web:[],custom:[],android:[],pc:[]}
  ],
  MAX_EMERGENCY:3,
  DEFAULT_APP_LIMIT:30,
  CARE:{golden:30,goldenGem:5,combo:40,streakPct:10,streakMax:5},
  /* Giữ cho NPC minh họa trong minigame Shopee/Siêu thị (game-trend.js) */
  FRIENDS:[
    {id:'f1',name:'Mèo Mun',animal:'cat',color:'#D3968C',gems:1840,screen:64,quests:41,sleep:'good',streak:12,wall:'#ecc9c2',floor:'#c99a6b',room:[['rug',2,2],['bed',0,1],['plant',4,0],['lamp',0,0],['shelf',2,0]],bio:'Ngủ 22:30 đều đặn 12 ngày liền!'},
    {id:'f2',name:'Gấu Trúc Pi',animal:'panda',color:'#F7F4D5',gems:2310,screen:152,quests:28,sleep:'bad',streak:0,wall:'#dfe6c8',floor:'#b5a28a',room:[['beanbag',1,1],['tank',4,0],['wardrobe',0,0],['guitar',3,3]],bio:'Đang cai TikTok... lần thứ 3 😅'},
    {id:'f3',name:'Cáo Cam',animal:'fox',color:'#e0a46a',gems:960,screen:48,quests:55,sleep:'good',streak:20,wall:'#cfd9b4',floor:'#a8b98a',room:[['desk',0,0],['shelf',1,0],['plant',5,0],['bed',4,3],['rug',1,2]],bio:'Chạy bộ 5h sáng, đọc sách mỗi tối.'},
    {id:'f4',name:'Thỏ Bông',animal:'rabbit',color:'#efe6c4',gems:1420,screen:95,quests:33,sleep:'good',streak:5,wall:'#b9d3d6',floor:'#efe6c4',room:[['bed',0,2],['lamp',0,1],['beanbag',3,1],['plant',5,5]],bio:'Thích trồng cây và nuôi pet.'},
    {id:'f5',name:'Vịt Vàng',animal:'duck',color:'#f1d77a',gems:720,screen:188,quests:12,sleep:'bad',streak:0,wall:'#e8dcc0',floor:'#d9b0a8',room:[['guitar',0,0],['tank',1,0],['beanbag',2,2]],bio:'Hay thức khuya xem livestream...'},
    {id:'f6',name:'Cú Đêm',animal:'owl',color:'#8a7a9a',gems:1105,screen:131,quests:19,sleep:'bad',streak:1,wall:'#F7F4D5',floor:'#7fa3ab',room:[['desk',0,0],['lamp',1,0],['shelf',0,1],['bed',4,2]],bio:'Đang tập ngủ trước 23h.'}
  ]
};

const Store = {
  KEY:'lua_chill_save_v1',
  load(){ try{ return JSON.parse(localStorage.getItem(this.KEY)); }catch(e){ return null; } },
  save(s){ try{ s.savedAt=Date.now(); localStorage.setItem(this.KEY, JSON.stringify(s)); }catch(e){ console.warn('save failed',e); } },
  clear(){ localStorage.removeItem(this.KEY); }
};

/* ---------- Native Bridge: Android • Electron Desktop • Chrome Extension • Web ---------- */
const Bridge = {
  get android(){ return typeof window!=='undefined' && !!window.LuaChillNative; },
  get electron(){ return typeof window!=='undefined' && !!window.LuaChillDesktop; },
  get ext(){ try{ return typeof chrome!=='undefined' && !!(chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local); }catch(e){ return false; } },
  get canBlock(){ return this.android||this.ext||this.electron; },
  get realUsage(){ return this.android||this.ext||this.electron; },
  get nativeApps(){ return this.android||this.electron; },
  mode(){
    if(this.android) return 'Android Native Kotlin (đo & chặn app thật + Draw-Over-Apps)';
    if(this.electron) return 'Desktop PC Electron (đo, chặn 3 chế độ & chạy nền khay hệ thống)';
    if(this.ext) return 'Chrome Extension (đo & chặn web thật)';
    return 'Web / PWA (đo phiên trong app)';
  },
  getInstalledApps(){
    if(this.android){ try{ return Promise.resolve(JSON.parse(window.LuaChillNative.getInstalledApps()||'[]')); }catch(e){ return Promise.resolve([]); } }
    if(this.electron && window.LuaChillDesktop.getInstalledApps){ try{ return Promise.resolve(window.LuaChillDesktop.getInstalledApps()); }catch(e){ return Promise.resolve([]); } }
    return Promise.resolve([]);
  },
  syncPolicy(p){
    if(this.android){ try{ window.LuaChillNative.setPolicy(JSON.stringify(p)); }catch(e){ console.warn(e); } }
    else if(this.electron){ try{ window.LuaChillDesktop.setPolicy(p); }catch(e){ console.warn(e); } }
    else if(this.ext){ chrome.storage.local.set({policy:p}); try{ const r=chrome.runtime.sendMessage({type:'evaluate'}); if(r&&r.catch) r.catch(()=>{}); }catch(e){} }
  },
  getUsage(){
    if(this.android){ try{ return Promise.resolve(JSON.parse(window.LuaChillNative.getUsage())); }catch(e){ return Promise.resolve(null); } }
    if(this.electron){ try{ return Promise.resolve(window.LuaChillDesktop.getUsage()); }catch(e){ return Promise.resolve(null); } }
    if(this.ext) return chrome.storage.local.get('usage').then(r=>r.usage||null).catch(()=>null);
    return Promise.resolve(null);
  },
  notify(title, body, tag='luachill'){
    if(this.android && window.LuaChillNative.showNotification){
      try{ window.LuaChillNative.showNotification(title, body); return; }catch(e){}
    }
    if(this.electron && window.LuaChillDesktop.notify){
      try{ window.LuaChillDesktop.notify({title, body}); return; }catch(e){}
    }
    if(typeof Notification!=='undefined' && Notification.permission==='granted'){
      try{ new Notification(title, {body, tag, icon:'assets/icons/icon128.png'}); }catch(e){}
    }
  }
};

function defaultClock(){
  const tz=ClockUtil.deviceTz();
  return {mode:'auto',tz,region:'Tự động theo thiết bị',manualOffset:0,lat:null,lon:null,lastScan:null};
}
function defaultBlock(){
  return {
    mode:'apps', /* 'lockdown' | 'apps' | 'groups' */
    web:['facebook','tiktok'], custom:[], android:[], pc:[],
    appLimits:{},
    emergency:[], /* Android: tối đa 3 {pkg,name} */
    emergencyPc:[], /* Electron PC: tối đa 3 {pkg,name} */
    emergencyWeb:['zalo.me'], /* Web/Ext: tối đa 3 tên miền */
    groups:JSON.parse(JSON.stringify(DATA.DEFAULT_GROUPS))
  };
}
function defaultReminders(){
  return {enabled:true,quests:true,questTime:'10:00',questTime2:'17:00',checkin:true,bed:true,bedLead:15,wake:true,limitWarn:true,limitLead:10,fired:{}};
}
function rollDailyQuests(prevIds=[], keepIds=[]){
  const valid=new Set(DATA.QUESTS.map(q=>q.id));
  const used=new Set((keepIds||[]).filter(id=>valid.has(id)));
  const avoid=new Set(prevIds||[]);
  const pickFrom=pool=>{
    const avail=pool.filter(q=>!used.has(q.id));
    if(!avail.length) return null;
    const fresh=avail.filter(q=>!avoid.has(q.id));
    const chosen=U.pick(fresh.length?fresh:avail);
    used.add(chosen.id);
    return chosen.id;
  };
  const out=[...used];
  /* Bảo đảm mỗi ngày đủ 4 nhóm đời thực cân bằng + 1 quest đời thực ngẫu nhiên + 1 quest chăm sóc game */
  for(const cat of ['body','outdoor','mind','social']){
    if(out.length>=DATA.DAILY_QUEST_COUNT) break;
    if(!out.some(id=>(DATA.QUESTS.find(q=>q.id===id)||{}).cat===cat)){
      const id=pickFrom(DATA.QUESTS.filter(q=>q.cat===cat));
      if(id) out.push(id);
    }
  }
  if(out.length<DATA.DAILY_QUEST_COUNT && !out.some(id=>(DATA.QUESTS.find(q=>q.id===id)||{}).cat==='care')){
    const id=pickFrom(DATA.QUESTS.filter(q=>q.cat==='care'));
    if(id) out.push(id);
  }
  while(out.length<DATA.DAILY_QUEST_COUNT){
    const id=pickFrom(DATA.QUESTS.filter(q=>q.cat!=='care'))||pickFrom(DATA.QUESTS);
    if(!id) break;
    out.push(id);
  }
  /* Xáo trộn thứ tự (Fisher-Yates) để bảng Quest mỗi ngày mới mẻ */
  for(let i=out.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
  return out.slice(0,DATA.DAILY_QUEST_COUNT);
}

class GameCore {
  constructor(){ this.ls={}; this.state=Store.load(); this.bedLockOn=false; this._n=0; this.visible=true; this._lastRealMs=Date.now(); if(this.state) this.migrate(); }
  migrate(){ const s=this.state; if(!s||s.v!==1){ this.state=null; return; }
    s.sleep.bed=s.sleep.bed||'23:00'; s.sleep.hist=s.sleep.hist||[];
    s.sleep.wake=U.hToHm(U.hmToH(s.sleep.bed)+DATA.SLEEP_HOURS);
    s.checkin=s.checkin||{last:null,streak:0,hist:[]}; s.garden.xp=s.garden.xp??30; s.pets.xp=s.pets.xp||{};
    s.created=s.created||{day:s.day,hour:8};
    s.decor.lastCollect=s.decor.lastCollect||Date.now(); s.monster=s.monster||{best:0,plays:0};
    s.offset=0;
    s.screen.floor=0; s.screen.sites=s.screen.sites||{}; s.screen.allSites=s.screen.allSites||{}; s.screen.perPkg=s.screen.perPkg||{};
    s.screen.totalUsed=s.screen.totalUsed??s.screen.used??0; s.screen.webSec=s.screen.webSec||0;
    s.clock={...defaultClock(),...(s.clock||{})};
    const db=defaultBlock();
    s.block={...db,...(s.block||{})};
    if(!Array.isArray(s.block.groups)||!s.block.groups.length) s.block.groups=db.groups;
    s.block.groups.forEach(g=>{ g.android=Array.isArray(g.android)?g.android:[]; g.pc=Array.isArray(g.pc)?g.pc:[]; });
    s.block.pc=Array.isArray(s.block.pc)?s.block.pc:[];
    s.block.appLimits=s.block.appLimits||{}; s.block.emergency=s.block.emergency||[]; s.block.emergencyPc=s.block.emergencyPc||[]; s.block.emergencyWeb=s.block.emergencyWeb||['zalo.me'];
    s.reminders={...defaultReminders(),...(s.reminders||{})}; s.reminders.fired=s.reminders.fired||{};
    s.care=s.care||{streak:0,last:null,combo:{}};
    /* Di chuyển / đảm bảo danh sách 6 Quest ngẫu nhiên mỗi ngày */
    s.quests=s.quests||{day:s.day,done:{}};
    s.quests.done=s.quests.done||{};
    s.quests.prev=Array.isArray(s.quests.prev)?s.quests.prev:[];
    s.quests.rerolls=Number(s.quests.rerolls)||0;
    const validQ=new Set(DATA.QUESTS.map(q=>q.id));
    if(!Array.isArray(s.quests.list) || s.quests.list.length!==DATA.DAILY_QUEST_COUNT || !s.quests.list.every(id=>validQ.has(id))){
      const keep=Object.keys(s.quests.done).filter(id=>validQ.has(id));
      s.quests.list=rollDailyQuests(s.quests.prev, keep);
    }
    /* Di chuyển save phòng cũ sang hệ thống nhiều phòng + ngoại thất nhà + theme miễn phí */
    s.decor=s.decor||{wall:'#F7F4D5',floor:'#c99a6b',placed:[],boxes:[],lastCollect:Date.now()};
    if(!s.decor.rooms){
      s.decor.rooms={bedroom:{wall:s.decor.wall||'#F7F4D5',floor:s.decor.floor||'#c99a6b',placed:Array.isArray(s.decor.placed)?s.decor.placed:[]}};
    }
    if(!s.decor.activeRoom||!s.decor.rooms[s.decor.activeRoom]) s.decor.activeRoom='bedroom';
    s.decor.house=s.decor.house||'mushroom';
    if(!Array.isArray(s.decor.housesOwned)||!s.decor.housesOwned.length) s.decor.housesOwned=['mushroom'];
    if(!s.decor.housesOwned.includes(s.decor.house)) s.decor.housesOwned.push(s.decor.house);
    this._syncRoomMirror();
    let th=s.theme||(typeof localStorage!=='undefined'&&localStorage.getItem('lc_theme'))||'classic';
    let sc=s.scheme||(typeof localStorage!=='undefined'&&localStorage.getItem('lc_scheme'))||'light';
    if(th==='darkforest'){ th='forest'; sc='dark'; }
    if(!DATA.THEMES.some(t=>t.id===th)) th='classic';
    s.theme=th; s.scheme=(sc==='dark'?'dark':'light'); }
  reload(){ this.state=Store.load(); this.migrate(); this.emit('change'); }
  on(e,f){ (this.ls[e]=this.ls[e]||[]).push(f); return ()=>{ this.ls[e]=this.ls[e].filter(x=>x!==f); }; }
  emit(e,d){ (this.ls[e]||[]).slice().forEach(f=>{ try{ f(d); }catch(err){ console.error(err); } }); }
  save(){ if(this.state) Store.save(this.state); }
  get s(){ return this.state; }

  newGame(name,acc){
    const clock=defaultClock(), now=ClockUtil.dateInTz(new Date(),clock.tz), day=U.dayKeyAt(now,7);
    this.state={ v:1, name:name||'Bạn Lừa', created:{day,hour:now.getHours()+now.getMinutes()/60},
      acc:{owned:acc?[acc]:[],on:acc?[acc]:[]}, gems:150, energy:82, happy:72, offset:0, day,
      clock,
      screen:{limit:120,used:0,totalUsed:0,extra:0,acc:0,webSec:0,locked:false,floor:0,sites:{},allSites:{},perPkg:{}},
      night:{key:null,slept:false,broken:false},
      sleep:{last:null,lastDay:null,streak:0,buffDay:null,bed:'23:00',wake:'07:00',hist:[]},
      checkin:{last:null,streak:0,hist:[]},
      quests:{day,list:rollDailyQuests([],[]),done:{},prev:[],rerolls:0}, questsTotal:0,
      garden:{health:72,xp:30,watered:{},missed:{}},
      pets:{owned:['dog'],fed:{},happy:70,xp:{dog:0}},
      decor:{wall:'#F7F4D5',floor:'#c99a6b',lastCollect:Date.now(),activeRoom:'bedroom',house:'mushroom',housesOwned:['mushroom'],
        rooms:{bedroom:{wall:'#F7F4D5',floor:'#c99a6b',placed:[{uid:'b1',id:'bed',gx:0,gy:1,rot:0},{uid:'p1',id:'plant',gx:5,gy:0,rot:0},{uid:'r1',id:'rug',gx:2,gy:2,rot:0}]}},
        placed:[{uid:'b1',id:'bed',gx:0,gy:1,rot:0},{uid:'p1',id:'plant',gx:5,gy:0,rot:0},{uid:'r1',id:'rug',gx:2,gy:2,rot:0}],
        boxes:[{uid:'x1',id:'lamp'}]},
      theme:((typeof localStorage!=='undefined'&&localStorage.getItem('lc_theme'))||'classic')==='darkforest'?'forest':((typeof localStorage!=='undefined'&&localStorage.getItem('lc_theme'))||'classic'),
      scheme:((typeof localStorage!=='undefined'&&localStorage.getItem('lc_scheme'))||((typeof localStorage!=='undefined'&&localStorage.getItem('lc_theme')==='darkforest')?'dark':'light')),
      chats:{}, shop:{month:1,history:[]}, monster:{best:0,plays:0}, pendingMorning:null, seenHint:false,
      block:defaultBlock(), reminders:defaultReminders(), care:{streak:0,last:null,combo:{}} };
    this.save(); this.syncPolicy(); this.emit('change'); }

  /* ---------------- ĐỒNG HỒ: Auto Location / Timezone / Manual ---------------- */
  effectiveOffsetMs(){
    const s=this.s; if(!s) return 0;
    const c=s.clock||defaultClock();
    if(c.mode==='manual') return c.manualOffset||0;
    return ClockUtil.tzShiftMs(c.tz||ClockUtil.deviceTz(), new Date());
  }
  now(){ return new Date(Date.now()+this.effectiveOffsetMs()); }
  hour(){ const n=this.now(); return n.getHours()+n.getMinutes()/60+n.getSeconds()/3600; }
  clockLabel(){
    const c=(this.s&&this.s.clock)||defaultClock();
    if(c.mode==='manual') return 'Giờ thủ công';
    return `${c.tz} (${ClockUtil.utcLabel(c.tz)})`;
  }
  canEditClock(){
    if(this.s && this.isBedtime() && !this.s.night.broken) return {ok:false,msg:'Đang trong giờ ngủ — không thể đổi giờ để tránh lách luật khóa ngủ 😉'};
    return {ok:true};
  }
  setClockTimezone(tz, region){
    const chk=this.canEditClock(); if(!chk.ok) return chk;
    const s=this.s; s.clock={...s.clock,mode:'tz',tz,region:region||tz,manualOffset:0,lastScan:Date.now()};
    this.save(); this.syncPolicy(); this.tick(); this.emit('change');
    return {ok:true};
  }
  setClockAuto(tz, region, coords){
    const chk=this.canEditClock(); if(!chk.ok) return chk;
    const s=this.s; s.clock={...s.clock,mode:'auto',tz:tz||ClockUtil.deviceTz(),region:region||'Tự động theo thiết bị',manualOffset:0,lat:coords?coords.lat:null,lon:coords?coords.lon:null,lastScan:Date.now()};
    this.save(); this.syncPolicy(); this.tick(); this.emit('change');
    return {ok:true};
  }
  setClockManual(hm, ymdStr){
    const chk=this.canEditClock(); if(!chk.ok) return chk;
    const s=this.s; const [h,m]=String(hm).split(':').map(Number); if(isNaN(h)||isNaN(m)) return {ok:false,msg:'Giờ không hợp lệ'};
    const base=new Date();
    let target;
    if(ymdStr && /^\d{4}-\d{2}-\d{2}$/.test(ymdStr)){ const [Y,M,D]=ymdStr.split('-').map(Number); target=new Date(Y,M-1,D,h,m,base.getSeconds()); }
    else target=new Date(base.getFullYear(),base.getMonth(),base.getDate(),h,m,base.getSeconds());
    s.clock={...s.clock,mode:'manual',manualOffset:target.getTime()-base.getTime(),region:`Tự chỉnh (${U.pad(h)}:${U.pad(m)})`,lastScan:Date.now()};
    this.save(); this.syncPolicy(); this.tick(); this.emit('change'); return {ok:true};
  }
  async scanLocationTime(){
    const chk=this.canEditClock(); if(!chk.ok) return {ok:false,source:'locked',tz:this.s.clock.tz,region:chk.msg};
    /* 1. Ưu tiên GPS/Vị trí trình duyệt (nếu người dùng cho phép) */
    const gps=await new Promise(res=>{
      if(typeof navigator==='undefined'||!navigator.geolocation){ res(null); return; }
      navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lon:p.coords.longitude}),()=>res(null),{timeout:5000,maximumAge:300000});
    });
    if(gps){
      try{
        const j=await ClockUtil.fetchJson(`https://timeapi.io/api/TimeZone/coordinate?latitude=${gps.lat.toFixed(4)}&longitude=${gps.lon.toFixed(4)}`,3500);
        if(j&&j.timeZone){ this.setClockAuto(j.timeZone,`Vị trí GPS (${j.timeZone})`,gps); return {ok:true,source:'gps',tz:j.timeZone,region:`Vị trí GPS (${j.timeZone})`}; }
      }catch(e){}
      const g=ClockUtil.guessTzByCoords(gps.lat,gps.lon);
      this.setClockAuto(g.tz,g.region,gps);
      return {ok:true,source:'gps-offline',tz:g.tz,region:g.region};
    }
    /* 2. Dự phòng: quét vùng qua IP (chỉ đọc múi giờ/thành phố) */
    try{
      const ip=await ClockUtil.fetchJson('https://ipapi.co/json/',3000);
      if(ip&&ip.timezone){
        const reg=[ip.city,ip.country_name].filter(Boolean).join(', ')||ip.timezone;
        this.setClockAuto(ip.timezone,`${reg} (Vùng mạng)`);
        return {ok:true,source:'ip',tz:ip.timezone,region:reg};
      }
    }catch(e){}
    /* 3. Dự phòng cuối: múi giờ hệ điều hành */
    const tz=ClockUtil.deviceTz();
    this.setClockAuto(tz,'Múi giờ hệ thống (không quét được GPS/vùng)');
    return {ok:false,source:'device',tz,region:'Không quét được vị trí — đang dùng giờ máy. Bạn có thể chọn múi giờ hoặc tự chỉnh giờ.'};
  }

  /* ---------------- GIỜ NGỦ 8 TIẾNG & ĐIỂM DANH 8 TIẾNG ---------------- */
  bedH(){ return U.hmToH(this.s.sleep.bed); }
  wakeH(){ return U.hmToH(this.s.sleep.wake); }
  dk(d){ return U.dayKeyAt(d,this.s?this.wakeH():7); }
  isBedtime(h=this.hour()){ const b=this.bedH(), w=this.wakeH(); return b>w?(h>=b||h<w):(h>=b&&h<w); }
  isNight(){ const h=this.hour(); return h>=19||h<this.wakeH(); }
  sleepHours(bed=this.s.sleep.bed,wake=this.s.sleep.wake){ return ((U.hmToH(wake)-U.hmToH(bed))+24)%24; }
  minsToBed(){ return Math.round((((this.bedH()-this.hour())+24)%24)*60); }
  setSleepCfg(bed){ const s=this.s;
    if(this.isBedtime() && !s.night.broken) return {ok:false,msg:'Đang trong giờ ngủ — không thể đổi lịch lúc này (chống "lách luật") 😉'};
    s.sleep.bed=bed; s.sleep.wake=U.hToHm(U.hmToH(bed)+DATA.SLEEP_HOURS); this.bedLockOn=false; this.save(); this.syncPolicy(); this.emit('change'); this.tick();
    return {ok:true,hours:DATA.SLEEP_HOURS,wake:s.sleep.wake}; }

  /* ---------------- 3 CHẾ ĐỘ KHÓA ĐỘC LẬP (MỖI CHẾ ĐỘ 1 CƠ CHẾ RIÊNG) ---------------- */
  domainsOfWebIds(ids, custom=[]){
    return [...new Set([...DATA.WEB_APPS.filter(a=>(ids||[]).includes(a.id)).flatMap(a=>a.domains),...(custom||[])])];
  }
  blockedDomains(){ const b=this.s.block;
    if(b.mode==='groups') return [...new Set(b.groups.flatMap(g=>this.domainsOfWebIds(g.web,g.custom)))];
    return this.domainsOfWebIds(b.web,b.custom);
  }
  setBlockMode(mode){ if(!['lockdown','apps','groups'].includes(mode)) return;
    this.s.block.mode=mode;
    if(mode==='lockdown'){
      this.s.screen.used=Math.max(this.s.screen.totalUsed||0,this.s.screen.used||0);
      const locked=this.screenRemaining()<=0;
      this.s.screen.locked=locked;
      this.emit('screenLock',locked);
    } else if(this.s.screen.locked){
      this.s.screen.locked=false;
      if(!this.hasAnyLimitLock()) this.emit('screenLock',false);
    }
    this.save(); this.syncPolicy(); this.emit('change'); }
  blockModeLabel(mode=(this.s&&this.s.block&&this.s.block.mode)||'apps'){
    return mode==='lockdown'?'Khóa toàn bộ hằng ngày (chừa 3 khẩn cấp)'
      :mode==='groups'?'Khóa theo nhóm app'
      :'Khóa riêng từng app';
  }
  setBlock(kind,list){
    const next=[...new Set(list)];
    this.s.block[kind]=next;
    /* Tự cấp hạn mức riêng mặc định (30p) cho app/web mới được chọn ở chế độ Khóa riêng từng app */
    if(kind==='android'||kind==='pc'){
      next.forEach(a=>{ const k=a.pkg||a; if(k && !this.s.block.appLimits[k]) this.s.block.appLimits[k]=DATA.DEFAULT_APP_LIMIT; });
    } else if(kind==='web'){
      next.forEach(id=>{ const wa=DATA.WEB_APPS.find(x=>x.id===id); if(wa && !this.s.block.appLimits[wa.domains[0]]) this.s.block.appLimits[wa.domains[0]]=DATA.DEFAULT_APP_LIMIT; });
    } else if(kind==='custom'){
      next.forEach(d=>{ if(d && !this.s.block.appLimits[d]) this.s.block.appLimits[d]=DATA.DEFAULT_APP_LIMIT; });
    }
    this.save(); this.syncPolicy(); this.emit('change');
  }
  appLimitOf(key){
    const raw=Number((this.s&&this.s.block&&this.s.block.appLimits&&this.s.block.appLimits[key])||0);
    return raw>0?raw:DATA.DEFAULT_APP_LIMIT;
  }
  appLimitByDisplay(displayKey){
    const s=this.s, b=s&&s.block; if(!b||b.mode!=='apps') return 0;
    const dl=String(displayKey||'').toLowerCase(), extra=s.screen.extra||0;
    if(Bridge.nativeApps){
      const arr=Bridge.electron?(b.pc||[]):(b.android||[]);
      const hit=arr.find(a=>String(a.pkg||a).toLowerCase()===dl || String(a.name||'').toLowerCase()===dl);
      return hit?(this.appLimitOf(hit.pkg||hit)+extra):0;
    }
    for(const a of DATA.WEB_APPS){
      if(!(b.web||[]).includes(a.id)) continue;
      if(a.domains.some(d=>dl===d||dl.endsWith('.'+d))) return this.appLimitOf(a.domains[0])+extra;
    }
    const cust=(b.custom||[]).find(d=>dl===d||dl.endsWith('.'+d));
    return cust?(this.appLimitOf(cust)+extra):0;
  }
  appUsedOf(key, label=''){
    const sc=this.s&&this.s.screen; if(!sc) return 0;
    const kl=String(key||'').toLowerCase(), ll=String(label||'').toLowerCase();
    const perPkg=sc.perPkg||{};
    if(kl && perPkg[key]!==undefined) return perPkg[key];
    for(const [pk,v] of Object.entries(perPkg)) if(pk.toLowerCase()===kl) return v;
    const all=sc.allSites||sc.sites||{};
    let sum=0;
    for(const [k,v] of Object.entries(all)){
      const s=k.toLowerCase();
      if(s===kl || (ll&&s===ll) || (kl&&s.endsWith('.'+kl))) sum+=v;
    }
    return sum;
  }
  activeAppEntries(){
    const b=this.s.block, extra=this.s.screen.extra||0;
    if(Bridge.nativeApps){
      const arr=Bridge.electron?(b.pc||[]):(b.android||[]);
      return arr.map(a=>{ const pkg=a.pkg||a, name=a.name||pkg, lim=this.appLimitOf(pkg)+extra, used=this.appUsedOf(pkg,name); return {key:pkg,name,limit:lim,baseLimit:this.appLimitOf(pkg),used,locked:used>=lim}; });
    }
    const out=[];
    for(const a of DATA.WEB_APPS){
      if(!b.web.includes(a.id)) continue;
      const key=a.domains[0], base=this.appLimitOf(key), lim=base+extra;
      const used=a.domains.reduce((sum,d)=>sum+this.appUsedOf(d),0);
      out.push({key,name:a.name,limit:lim,baseLimit:base,used,locked:used>=lim});
    }
    for(const d of (b.custom||[])){
      const base=this.appLimitOf(d), lim=base+extra, used=this.appUsedOf(d);
      out.push({key:d,name:d,limit:lim,baseLimit:base,used,locked:used>=lim});
    }
    return out;
  }
  setAppLimit(key, mins){
    const m=Math.max(5,Math.min(480,Math.round(Number(mins)||DATA.DEFAULT_APP_LIMIT)));
    this.s.block.appLimits[key]=m;
    this.save(); this.syncPolicy(); this.emit('change');
  }
  setEmergency(kind, list){
    const arr=Array.isArray(list)?list:[];
    if(arr.length>DATA.MAX_EMERGENCY) return {ok:false,msg:`Chỉ được chọn tối đa ${DATA.MAX_EMERGENCY} app khẩn cấp!`};
    this.s.block[kind]=arr; this.save(); this.syncPolicy(); this.emit('change'); return {ok:true};
  }
  upsertGroup(g){
    const list=this.s.block.groups; const idx=list.findIndex(x=>x.id===g.id);
    const clean={id:g.id||('g_'+U.uid()),name:String(g.name||'Nhóm mới').trim().slice(0,24),limit:Math.max(5,Math.min(480,Math.round(Number(g.limit)||30))),
      web:[...new Set(g.web||[])],custom:[...new Set(g.custom||[])],android:Array.isArray(g.android)?g.android:[],pc:Array.isArray(g.pc)?g.pc:[]};
    if(idx>=0) list[idx]=clean; else list.push(clean);
    this.save(); this.syncPolicy(); this.emit('change'); return clean;
  }
  deleteGroup(id){
    this.s.block.groups=this.s.block.groups.filter(g=>g.id!==id);
    this.save(); this.syncPolicy(); this.emit('change');
  }
  /* Tính phút đã dùng của 1 nhóm từ dữ liệu đo thật */
  groupUsed(g){
    const sc=this.s.screen, perPkg=sc.perPkg||{}, all=sc.allSites||sc.sites||{};
    if(Bridge.android||Bridge.electron){
      const arr=Bridge.electron?(g.pc||[]):(g.android||[]);
      if(Object.keys(perPkg).length){
        const lowMap=Object.fromEntries(Object.entries(perPkg).map(([k,v])=>[k.toLowerCase(),v]));
        return arr.reduce((sum,a)=>sum+(lowMap[String(a.pkg||a).toLowerCase()]||0),0);
      }
      const names=new Set(arr.map(a=>String(a.name||a.pkg||a).toLowerCase()));
      const pkgs=new Set(arr.map(a=>String(a.pkg||a).toLowerCase()));
      let sum=0; for(const [k,v] of Object.entries(all)){ const kl=k.toLowerCase(); if(names.has(kl)||pkgs.has(kl)) sum+=v; }
      return sum;
    }
    const doms=this.domainsOfWebIds(g.web,g.custom);
    let sum=0; for(const [d,v] of Object.entries(all)) if(doms.some(x=>d===x||d.endsWith('.'+x))) sum+=v;
    return sum;
  }
  hasAnyLimitLock(){
    const s=this.s; if(!s) return false;
    const mode=s.block.mode||'apps', extra=s.screen.extra||0;
    if(mode==='lockdown') return !!(s.screen.locked || this.screenRemaining()<=0);
    if(mode==='groups') return (s.block.groups||[]).some(g=>this.groupUsed(g)>=g.limit+extra);
    return this.activeAppEntries().some(a=>a.locked);
  }
  isBlockedTargetLocked(target){
    const s=this.s; if(!s) return false;
    const mode=s.block.mode||'apps', extra=s.screen.extra||0;
    if(mode==='lockdown') return !!(s.screen.locked || this.screenRemaining()<=0);
    const tl=String(target||'').toLowerCase();
    if(mode==='groups'){
      if(!tl) return this.hasAnyLimitLock();
      const g=(s.block.groups||[]).find(x=>tl.includes(x.name.toLowerCase()) || this.domainsOfWebIds(x.web,x.custom).some(d=>tl===d||tl.endsWith('.'+d)) || (Bridge.electron?x.pc:x.android||[]).some(a=>String(a.name||a.pkg||a).toLowerCase()===tl));
      return g?(this.groupUsed(g)>=g.limit+extra):this.hasAnyLimitLock();
    }
    if(!tl) return this.hasAnyLimitLock();
    const a=this.activeAppEntries().find(x=>x.name.toLowerCase()===tl || x.key.toLowerCase()===tl || tl.endsWith('.'+x.key.toLowerCase()));
    return a?a.locked:this.hasAnyLimitLock();
  }
  async syncUsageNow(){
    const s=this.s; if(!s||!Bridge.realUsage) return null;
    try{
      const u=await Bridge.getUsage();
      if(!u||u.day!==s.day) return null;
      const tot=u.totalMinutes??u.minutes??0;
      const rel=s.block.mode==='lockdown'?tot:(u.minutes??tot);
      const perPkg=u.perPkgMinutes||{};
      const sites=u.sites||u.apps||{};
      const allSites=u.allSites||u.allApps||sites;
      const changed=rel!==s.screen.used || tot!==s.screen.totalUsed || JSON.stringify(allSites)!==JSON.stringify(s.screen.allSites||{}) || JSON.stringify(perPkg)!==JSON.stringify(s.screen.perPkg||{});
      s.screen.used=rel; s.screen.totalUsed=tot; s.screen.sites=sites; s.screen.allSites=allSites; s.screen.perPkg=perPkg;
      if(s.block.mode==='lockdown'){
        const shouldLock=this.screenRemaining()<=0;
        if(shouldLock && !s.screen.locked){ s.screen.locked=true; this.syncPolicy(); this.emit('screenLock',true); }
      }
      if(changed) this.emit('change');
      return u;
    }catch(e){ return null; }
  }

  /* ---------------- NHẮC HẸN THÔNG MINH ---------------- */
  setReminder(patch){
    Object.assign(this.s.reminders, patch);
    this.save(); this.syncPolicy(); this.emit('change');
  }
  checkReminders(){
    const s=this.s, r=s.reminders; if(!r||!r.enabled) return;
    const h=this.hour(), hmNow=U.hm(this.now()), day=s.day;
    const fire=(key,title,body,tab)=>{
      const k=day+'|'+key; if(r.fired[k]) return;
      r.fired[k]=Date.now();
      /* Dọn key ngày cũ */
      for(const old of Object.keys(r.fired)) if(!old.startsWith(day+'|')) delete r.fired[old];
      this.save();
      this.emit('remind',{key,title,body,tab});
    };
    if(r.bed){
      const toBed=this.minsToBed();
      if(toBed>0 && toBed<=r.bedLead) fire('bedLead','Sắp đến giờ ngủ 🌙',`Còn ${toBed} phút tới ${s.sleep.bed}. Hãy cất máy chuẩn bị ngủ đủ 8 tiếng nhé!`,'sleep');
      if(this.isBedtime() && !s.night.slept && !s.night.broken) fire('bedNow','Đến giờ ngủ rồi 🌙',`Đã ${s.sleep.bed}! Toàn bộ app giải trí sẽ khóa đến ${s.sleep.wake}.`,'sleep');
    }
    if(r.wake && !this.isBedtime() && this.hoursSinceWake()<=0.25){
      fire('wake','Chào buổi sáng! ☀️',`Đã ${s.sleep.wake} rồi — dậy uống 1 ly nước và bắt đầu ngày mới nhé!`,'sleep');
    }
    if(r.checkin && this.canCheckIn() && this.hoursSinceWake()>=0.15){
      fire('checkin','Nhớ điểm danh buổi sáng 📅',`Cửa sổ điểm danh 8 tiếng đang mở — vào nhận Gem ngay!`,'sleep');
    }
    const qTot=this.todayQuests().length;
    if(r.quests && this.questCount()<qTot){
      if(hmNow===r.questTime) fire('quest1','Nhắc nhiệm vụ đời thực ✅',`Còn ${qTot-this.questCount()} Quest ngẫu nhiên hôm nay đang chờ bạn!`,'tasks');
      if(r.questTime2 && hmNow===r.questTime2) fire('quest2','Nhắc nhiệm vụ buổi chiều 🌿',`Hoàn thành nốt ${qTot-this.questCount()} Quest hôm nay để nhận thêm Gem nhé!`,'tasks');
    }
    if(r.limitWarn){
      const mode=s.block.mode||'apps', extra=s.screen.extra||0;
      if(mode==='lockdown'){
        const rem=this.screenRemaining();
        if(rem>0 && rem<=r.limitLead) fire('limitWarn','Sắp chạm giới hạn hằng ngày ⏳',`Chỉ còn ${rem} phút trước khi bật Khóa toàn bộ!`,'timer');
      } else if(mode==='apps'){
        for(const a of this.activeAppEntries()){
          const left=a.limit-a.used;
          if(left>0 && left<=r.limitLead) fire('app_'+a.key,`${a.name} sắp hết giờ ⏳`,`Chỉ còn ${left} phút cho ${a.name} hôm nay.`,'timer');
        }
      } else if(mode==='groups'){
        for(const g of s.block.groups){
          const left=(g.limit+extra)-this.groupUsed(g);
          if(left>0 && left<=r.limitLead) fire('grp_'+g.id,`Nhóm "${g.name}" sắp hết giờ ⏳`,`Chỉ còn ${left} phút cho nhóm ${g.name} hôm nay.`,'timer');
        }
      }
    }
  }

  hasBuff(){ return this.s.sleep.buffDay===this.s.day; }
  isTiredToday(){ return this.s.sleep.last==='bad' && this.s.sleep.lastDay===this.s.day; }
  mood(){ const s=this.s; if(!s) return 'normal';
    if(this.isBedtime() && s.night.slept) return 'sleep';
    if(this.isTiredToday() || s.energy<30 || (this.isBedtime()&&s.night.broken)) return 'tired';
    if(s.happy<30) return 'sad';
    if(s.energy>=65 && s.happy>=60) return 'happy';
    return 'normal'; }

  /* ---------------- POLICY GỬI XUỐNG ANDROID / EXTENSION / ELECTRON (CHỈ 1 CHẾ ĐỘ DUY NHẤT) ---------------- */
  policy(){
    const s=this.s, b=s.block, r=s.reminders, isPc=Bridge.electron;
    const mode=['lockdown','apps','groups'].includes(b.mode)?b.mode:'apps';
    const pickedApps=isPc?(b.pc||[]):(b.android||[]);
    const pickedEm=isPc?(b.emergencyPc||[]):(b.emergency||[]);
    /* Với chế độ 'apps': mọi app/domain đã chọn luôn có hạn mức phút riêng cụ thể (không dùng giới hạn tổng hằng ngày) */
    const appLims={};
    if(mode==='apps'){
      if(Bridge.nativeApps){
        pickedApps.forEach(a=>{ const k=a.pkg||a; if(k) appLims[k]=this.appLimitOf(k); });
      } else {
        DATA.WEB_APPS.filter(a=>(b.web||[]).includes(a.id)).forEach(a=>{
          const m=this.appLimitOf(a.domains[0]);
          a.domains.forEach(d=>{ appLims[d]=m; });
        });
        (b.custom||[]).forEach(d=>{ appLims[d]=this.appLimitOf(d); });
      }
    }
    return {
      limit:s.screen.limit, extra:s.screen.extra, usedFloor:0, screenLocked:mode==='lockdown'&&!!s.screen.locked,
      bed:s.sleep.bed, wake:s.sleep.wake, brokenNight:s.night.broken?s.night.key:null, slept:!!s.night.slept,
      day:s.day, offset:this.effectiveOffsetMs(), tz:(s.clock&&s.clock.tz)||ClockUtil.deviceTz(),
      blockMode:mode,
      blocked:mode==='apps'?this.domainsOfWebIds(b.web,b.custom):[],
      blockedPkgs:mode==='apps'?pickedApps.map(a=>a.pkg||a):[],
      appLimits:appLims,
      emergencyPkgs:mode==='lockdown'?pickedEm.slice(0,DATA.MAX_EMERGENCY).map(a=>a.pkg||a):[],
      emergencyWeb:mode==='lockdown'?(b.emergencyWeb||[]).slice(0,DATA.MAX_EMERGENCY):[],
      groups:mode==='groups'?(b.groups||[]).map(g=>({
        id:g.id, name:g.name, limit:g.limit,
        domains:this.domainsOfWebIds(g.web,g.custom),
        pkgs:(isPc?(g.pc||[]):(g.android||[])).map(a=>a.pkg||a)
      })):[],
      reminders:{
        enabled:!!r.enabled, quests:!!r.quests, questTime:r.questTime, questTime2:r.questTime2,
        checkin:!!r.checkin, bed:!!r.bed, bedLead:r.bedLead, wake:!!r.wake, limitWarn:!!r.limitWarn, limitLead:r.limitLead
      },
      updated:Date.now()
    };
  }
  syncPolicy(){ if(this.s) Bridge.syncPolicy(this.policy()); }

  tick(){ const s=this.s; if(!s) return;
    const dk=this.dk(this.now()); if(dk>s.day) this.newDay(); else if(dk<s.day){ s.day=dk; s.quests.day=dk; }
    const bed=this.isBedtime();
    if(bed){ if(s.night.key!==s.day) s.night={key:s.day,slept:false,broken:false};
      if(!s.night.broken && !this.bedLockOn){ this.bedLockOn=true; this.syncPolicy(); this.emit('bedLock',true); } }
    else if(this.bedLockOn){ this.bedLockOn=false; this.emit('bedLock',false); }

    /* Đo thời gian sử dụng THẬT theo từng nền tảng */
    if(Bridge.realUsage){
      if(this._n%3===0) this.syncUsageNow();
    } else if(!(bed&&s.night.slept) && this.visible){
      /* Trên Web/PWA: đo đúng thời gian thực (60 giây = 1 phút) */
      const nowMs=Date.now(), dtSec=Math.min(5,Math.max(0,(nowMs-this._lastRealMs)/1000));
      this._lastRealMs=nowMs;
      s.screen.webSec=(s.screen.webSec||0)+dtSec;
      const realMins=Math.floor(s.screen.webSec/60);
      if(realMins!==s.screen.used){ s.screen.used=realMins; s.screen.totalUsed=realMins; s.screen.allSites={'Lừa Chill (Web)':realMins}; this.emit('change'); }
    } else { this._lastRealMs=Date.now(); }

    if(s.block.mode==='lockdown' && this.screenRemaining()<=0 && !s.screen.locked){ s.screen.locked=true; this.syncPolicy(); this.emit('screenLock',true); }
    /* Nhịp giảm chỉ số hợp lý theo thời gian thực (~4%/giờ khi thức; hồi năng lượng khi ngủ) */
    if(bed && s.night.slept){
      s.energy=U.clamp(s.energy+1/240);
    } else {
      s.energy=U.clamp(s.energy-1/900);
      s.happy=U.clamp(s.happy-1/1440);
      s.pets.happy=U.clamp(s.pets.happy-1/1200);
    }
    this.checkMissed();
    if(this._n%5===0) this.checkReminders();
    if(++this._n%5===0) this.save();
    this.emit('tick'); }

  _pruneDayMap(map, keepFromDay){
    if(!map) return;
    for(const k of Object.keys(map)){ const dk=k.split('|')[0]; if(dk && dk<keepFromDay) delete map[k]; }
  }
  newDay(){ const s=this.s; const prev=s.day, nextDay=this.dk(this.now());
    const consecutive=(nextDay===U.addDays(prev,1));
    const prevQList=Array.isArray(s.quests&&s.quests.list)?s.quests.list.slice():[];
    s.day=nextDay;
    s.quests={day:s.day,list:rollDailyQuests(prevQList,[]),done:{},prev:prevQList,rerolls:0};
    Object.assign(s.screen,{used:0,totalUsed:0,extra:0,acc:0,webSec:0,locked:false,floor:0,sites:{},allSites:{},perPkg:{}});
    const wasBroken=(s.night.key===prev && s.night.broken);
    s.night={key:null,slept:false,broken:false}; this.bedLockOn=false;
    const cutoff=U.addDays(s.day,-14);
    this._pruneDayMap(s.garden.watered,cutoff); this._pruneDayMap(s.garden.missed,cutoff); this._pruneDayMap(s.pets.fed,cutoff);
    if(consecutive){
      const q=wasBroken?'bad':'good';
      if(q==='good'){ s.sleep.streak++; s.energy=100; s.happy=U.clamp(s.happy+12); s.sleep.buffDay=s.day; s.garden.health=U.clamp(s.garden.health+25); }
      else { s.sleep.streak=0; s.energy=40; s.happy=U.clamp(s.happy-10); s.sleep.buffDay=null; s.garden.health=U.clamp(s.garden.health-5); }
      s.sleep.last=q; s.sleep.lastDay=s.day; s.sleep.hist=[...s.sleep.hist,{day:prev,q}].slice(-14);
      s.pendingMorning={q,streak:s.sleep.streak,day:s.day};
    } else {
      /* Quay lại sau nhiều ngày vắng mặt: bắt đầu ngày mới gọn gàng, không tăng streak giả */
      s.sleep.streak=0; s.sleep.buffDay=null; s.energy=Math.max(s.energy,85); s.pendingMorning=null;
    }
    this.save(); this.syncPolicy();
    this.emit('bedLock',false); this.emit('screenLock',false);
    if(s.pendingMorning) this.emit('morning',s.pendingMorning);
    this.emit('change'); }

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

  addGems(n,why){ this.s.gems+=n; this.emit('gems',{n,why}); this.save(); }
  spend(n){ if(this.s.gems<n) return false; this.s.gems-=n; this.emit('gems',{n:-n}); this.save(); return true; }
  boost(e,h){ this.s.energy=U.clamp(this.s.energy+e); this.s.happy=U.clamp(this.s.happy+h); }

  screenRemaining(){ const sc=this.s.screen; return sc.limit+sc.extra-Math.max(sc.totalUsed||0,sc.used||0); }
  setLimit(m){ const sc=this.s.screen; sc.limit=m; if(sc.locked && this.screenRemaining()>0){ sc.locked=false; this.emit('screenLock',false); } this.save(); this.syncPolicy(); this.emit('change'); }

  goSleep(){ this.s.night.slept=true; this.save(); this.syncPolicy(); this.emit('sleepState'); this.emit('change'); }
  breakBedLock(){ this.s.night.broken=true; this.s.night.slept=false; this.bedLockOn=false; this.save(); this.syncPolicy(); this.emit('bedLock',false); this.emit('change'); }

  todayQuestIds(){
    const s=this.s; if(!s) return [];
    const valid=new Set(DATA.QUESTS.map(q=>q.id));
    if(!s.quests||!Array.isArray(s.quests.list)||s.quests.list.length!==DATA.DAILY_QUEST_COUNT||!s.quests.list.every(id=>valid.has(id))){
      s.quests=s.quests||{day:s.day,done:{},prev:[],rerolls:0};
      s.quests.list=rollDailyQuests(s.quests.prev||[], Object.keys(s.quests.done||{}));
      this.save();
    }
    return s.quests.list;
  }
  todayQuests(){ return this.todayQuestIds().map(id=>DATA.QUESTS.find(q=>q.id===id)).filter(Boolean); }
  questRerollsLeft(){ return Math.max(0, DATA.DAILY_REROLLS - ((this.s&&this.s.quests&&this.s.quests.rerolls)||0)); }
  rerollQuest(id){
    const s=this.s, ids=this.todayQuestIds(), idx=ids.indexOf(id);
    if(idx<0) return {ok:false,msg:'Quest không nằm trong danh sách hôm nay'};
    if(s.quests.done[id]) return {ok:false,msg:'Quest đã hoàn thành rồi'};
    if(this.questRerollsLeft()<=0) return {ok:false,msg:`Bạn đã dùng hết ${DATA.DAILY_REROLLS} lượt đổi Quest hôm nay — mai sẽ tự động đổi mới!`};
    const cur=DATA.QUESTS.find(q=>q.id===id), used=new Set(ids), avoid=new Set(s.quests.prev||[]);
    const pool=DATA.QUESTS.filter(q=>!used.has(q.id) && (cur&&cur.cat==='care'?true:q.cat!=='care'));
    const fresh=pool.filter(q=>!avoid.has(q.id));
    const next=U.pick(fresh.length?fresh:pool);
    if(!next) return {ok:false,msg:'Không còn Quest nào khác để đổi'};
    s.quests.list[idx]=next.id;
    s.quests.rerolls=(s.quests.rerolls||0)+1;
    this.save(); this.emit('quest',{rerolled:id,next:next.id}); this.emit('change');
    return {ok:true,next,left:this.questRerollsLeft()};
  }
  questGem(id){ const q=DATA.QUESTS.find(x=>x.id===id); return Math.round(((q&&q.gem)||20)*(this.hasBuff()?1.2:1)); }
  questCount(){ const ids=new Set(this.todayQuestIds()); return Object.keys((this.s&&this.s.quests&&this.s.quests.done)||{}).filter(id=>ids.has(id)).length; }
  completeQuest(id,photo,auto){ const s=this.s, d=s.quests.done;
    if(!this.todayQuestIds().includes(id)) return {ok:false};
    if(d[id]){ if(photo && !d[id].photo){ d[id].photo=photo; this.save(); this.emit('quest',{id}); } return {ok:false}; }
    d[id]={photo:photo||null,auto:!!auto,t:Date.now()};
    const g=this.questGem(id); s.questsTotal++; this.boost(6,6); this.addGems(g,'Quest');
    let bonus=false;
    if(this.hasAnyLimitLock()){
      s.screen.extra=(s.screen.extra||0)+5;
      if(s.screen.locked && this.screenRemaining()>0) s.screen.locked=false;
      this.addGems(10,'Thưởng mở khóa bằng Quest');
      bonus=true;
      if(!this.hasAnyLimitLock()) this.emit('screenLock',false);
    }
    this.save(); this.syncPolicy(); this.emit('quest',{id,g,bonus}); this.emit('change');
    return {ok:true,g,bonus}; }

  activeWin(list){ const h=this.hour(); return list.find(w=>h>=w.from&&h<w.to)||null; }
  _endSinceWake(toH){ const w=this.wakeH(); return ((toH-w)+24)%24 || 24; }
  winState(list,doneMap){ const h=this.hour(), s=this.s, since=this.hoursSinceWake();
    return list.map(w=>{ const k=s.day+'|'+w.id; let st='later';
      if(doneMap[k]) st='done';
      else if(h>=w.from&&h<w.to) st='now';
      else if(since>=this._endSinceWake(w.to)) st='miss';
      return {...w,st}; }); }
  checkMissed(){ const s=this.s, h=this.hour(), since=this.hoursSinceWake();
    const createdSince=((s.created.hour-this.wakeH())+24)%24;
    for(const w of DATA.GARDEN_WIN){ const k=s.day+'|'+w.id;
      const endSince=this._endSinceWake(w.to);
      if(!(h>=w.from&&h<w.to) && since>=endSince && !s.garden.watered[k] && !s.garden.missed[k]){
        if(s.day===s.created.day && endSince<=createdSince){ s.garden.missed[k]=2; continue; }
        s.garden.missed[k]=1; s.garden.health=U.clamp(s.garden.health-15); this.emit('wilt'); this.emit('change'); } } }

  careMult(){ return 1+Math.min(DATA.CARE.streakMax,this.s.care.streak)*DATA.CARE.streakPct/100; }
  isGolden(w){ return (this.hour()-w.from)*60<=DATA.CARE.golden; }
  careStatus(){ const s=this.s, d=s.day; const wDone=DATA.GARDEN_WIN.filter(w=>s.garden.watered[d+'|'+w.id]).length, fDone=DATA.MEAL_WIN.filter(w=>s.pets.fed[d+'|'+w.id]).length;
    return {wDone,wTot:DATA.GARDEN_WIN.length,fDone,fTot:DATA.MEAL_WIN.length,streak:s.care.streak,mult:this.careMult(),comboDone:s.care.last===d}; }
  careReward(base,w){ const parts=[['Cơ bản',base]]; let g=base; const m=this.careMult();
    if(m>1){ const x=Math.round(base*(m-1)); parts.push([`Chuỗi chăm sóc ×${m.toFixed(1)}`,x]); g+=x; }
    if(this.isGolden(w)){ parts.push(['Giờ vàng',DATA.CARE.goldenGem]); g+=DATA.CARE.goldenGem; }
    return {g,parts}; }
  checkCombo(){ const s=this.s, c=this.careStatus(); if(c.comboDone||c.wDone<c.wTot||c.fDone<c.fTot) return 0;
    s.care.streak=(s.care.last===U.addDays(s.day,-1)?s.care.streak:0)+1; s.care.last=s.day; this.addGems(DATA.CARE.combo,'Combo chăm sóc'); this.boost(5,8); return DATA.CARE.combo; }

  lvOf(xp,table){ let i=0; table.forEach((t,j)=>{ if(xp>=t.xp) i=j; }); return i; }
  gardenStage(){ return this.lvOf(this.s.garden.xp,DATA.GARDEN_STAGES); }
  water(){ const s=this.s, w=this.activeWin(DATA.GARDEN_WIN);
    if(!w) return {ok:false,msg:'Chưa tới khung giờ tưới. Tưới đúng giờ mới được thưởng nhé!'};
    const k=s.day+'|'+w.id; if(s.garden.watered[k]) return {ok:false,msg:'Khung giờ này đã tưới rồi, hoa đang no nước!'};
    const before=this.gardenStage(), r=this.careReward(15,w); s.garden.watered[k]=1; s.garden.xp+=25; s.garden.health=U.clamp(s.garden.health+30); this.boost(2,5);
    this.addGems(r.g,'Tưới cây'); this.completeQuest('plant',null,true); const combo=this.checkCombo(); const stage=this.gardenStage(); this.emit('change');
    return {ok:true,gem:r.g,parts:r.parts,combo,stageUp:stage>before,stage}; }

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

  buyAcc(id){ const a=DATA.ACCS[id]; if(this.s.acc.owned.includes(id)) return true; if(!this.spend(a.price)) return false;
    this.s.acc.owned.push(id); this.s.acc.on.push(id); this.save(); this.emit('acc'); return true; }
  toggleAcc(id){ const on=this.s.acc.on; const i=on.indexOf(id); if(i>=0) on.splice(i,1); else on.push(id); this.save(); this.emit('acc'); }

  /* --- Mở rộng nhà (nhiều phòng), Ngoại thất nhà & Theme giao diện miễn phí --- */
  _syncRoomMirror(){ const D=this.s&&this.s.decor; if(!D||!D.rooms) return; const r=D.rooms[D.activeRoom]||D.rooms.bedroom; D.wall=r.wall; D.floor=r.floor; D.placed=r.placed; }
  curRoom(){ const D=this.s.decor; return D.rooms[D.activeRoom]||D.rooms.bedroom; }
  switchRoom(id){ const D=this.s.decor; if(!D.rooms[id]) return false; D.activeRoom=id; this._syncRoomMirror(); this.save(); this.emit('decor'); return true; }
  unlockRoom(id){ const cfg=DATA.ROOMS[id], D=this.s.decor; if(!cfg) return {ok:false,msg:'Phòng không tồn tại'};
    if(D.rooms[id]){ this.switchRoom(id); return {ok:true}; }
    if(!this.spend(cfg.price)) return {ok:false,msg:`Cần ${cfg.price} Gem để mở rộng ${cfg.name}`};
    D.rooms[id]={wall:cfg.wall,floor:cfg.floor,placed:[]}; D.activeRoom=id; this._syncRoomMirror(); this.save(); this.emit('decor'); this.emit('change');
    return {ok:true,room:cfg}; }
  buyHouse(id){ const h=DATA.HOUSES[id], D=this.s.decor; if(!h) return {ok:false,msg:'Mẫu nhà không tồn tại'};
    if(D.housesOwned.includes(id)){ D.house=id; this.save(); this.emit('house',id); this.emit('decor'); this.emit('change'); return {ok:true,equipped:true}; }
    if(!this.spend(h.price)) return {ok:false,msg:`Cần ${h.price} Gem để mua ${h.name}`};
    D.housesOwned.push(id); D.house=id; this.boost(4,10); this.save(); this.emit('house',id); this.emit('decor'); this.emit('change');
    return {ok:true,bought:true}; }
  setTheme(id){ if(id==='darkforest') id='forest';
    if(!DATA.THEMES.some(t=>t.id===id)) return;
    if(this.s){ this.s.theme=id; this.save(); }
    try{ localStorage.setItem('lc_theme',id); }catch(e){}
    this.emit('theme',{theme:id,scheme:this.s?this.s.scheme:'light'}); this.emit('change'); }
  setScheme(sc){ const v=sc==='dark'?'dark':'light';
    if(this.s){ this.s.scheme=v; this.save(); }
    try{ localStorage.setItem('lc_scheme',v); }catch(e){}
    this.emit('theme',{theme:this.s?this.s.theme:'classic',scheme:v}); this.emit('change'); }

  buyDecor(id){ if(!this.spend(DATA.DECOR[id].price)) return false; this.s.decor.boxes.push({uid:U.uid(),id}); this.save(); this.emit('decor'); return true; }
  fp(id,rot){ const d=DATA.DECOR[id]; return rot?{w:d.d,d:d.w}:{w:d.w,d:d.d}; }
  canPlace(id,gx,gy,rot,ignore){ const f=this.fp(id,rot), flat=!!DATA.DECOR[id].flat, R=this.curRoom();
    if(gx<0||gy<0||gx+f.w>6||gy+f.d>6) return false;
    return !R.placed.some(p=>{ if(p.uid===ignore) return false; if(!!DATA.DECOR[p.id].flat!==flat) return false;
      const g=this.fp(p.id,p.rot); return gx<p.gx+g.w && gx+f.w>p.gx && gy<p.gy+g.d && gy+f.d>p.gy; }); }
  place(uid,id,gx,gy,rot){ const D=this.s.decor, R=this.curRoom(); if(!this.canPlace(id,gx,gy,rot,uid)) return false;
    D.boxes=D.boxes.filter(b=>b.uid!==uid); const ex=R.placed.find(p=>p.uid===uid);
    if(ex) Object.assign(ex,{gx,gy,rot}); else R.placed.push({uid,id,gx,gy,rot}); this._syncRoomMirror(); this.save(); this.emit('decor'); return true; }
  storeItem(uid){ const D=this.s.decor, R=this.curRoom(); const p=R.placed.find(x=>x.uid===uid); if(!p) return; R.placed=R.placed.filter(x=>x!==p); D.boxes.push({uid,id:p.id}); this._syncRoomMirror(); this.save(); this.emit('decor'); }
  paint(kind,color){ const R=this.curRoom(); if(R[kind]===color) return true; if(!this.spend(DATA.PAINT_COST)) return false; R[kind]=color; this._syncRoomMirror(); this.save(); this.emit('decor'); return true; }
  comfort(){ const D=this.s.decor; let total=0;
    for(const [rid,r] of Object.entries(D.rooms||{})){
      total+=(r.placed||[]).reduce((a,p)=>a+((DATA.DECOR[p.id]&&DATA.DECOR[p.id].comfort)||5),0);
      if(DATA.ROOMS[rid]&&r.wall!==DATA.ROOMS[rid].wall) total+=3;
    }
    const hc=DATA.HOUSES[D.house]; if(hc) total+=hc.comfort||0;
    return total; }
  incomeRate(){ return Math.max(1,Math.round(this.comfort()/5)); }
  income(){ const h=Math.min(8,(Date.now()-this.s.decor.lastCollect)/3600e3); return Math.floor(h*this.incomeRate()); }
  collect(){ const g=this.income(); if(g<=0) return 0; this.s.decor.lastCollect=Date.now(); this.addGems(g,'Thu nhập phòng'); return g; }

  finishShopping(sum){ const s=this.s; s.shop.history.push({month:s.shop.month,profile:sum.profile,spent:sum.spent,fomo:sum.fomoCount,gem:sum.gem}); s.shop.month++;
    this.boost(0,sum.reserveOk?8:-4); this.addGems(sum.gem,'Shopping Tỉnh Thức'); this.emit('change'); }
  finishMonster(score,gem){ const m=this.s.monster; m.plays++; m.best=Math.max(m.best,score); this.boost(0,gem>20?6:0); this.addGems(gem,'Quái vật FOMO'); this.emit('change'); }
}

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
