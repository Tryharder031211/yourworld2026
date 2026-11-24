/* assets/scenes.js — Tranh doodle của Sảnh (6 mẫu nhà đa theme, đồng hồ, Vườn cây có biển, chuồng pet, đường nối liền, biển SHOP) & Khu Shopping. */
'use strict';

const HOME_SIGN=`<path d="M20 170 V146" stroke-width="3.5"/><g transform="rotate(-6 20 138)"><rect x="-8" y="127" width="56" height="22" rx="5" fill="${C.bg}"/><text x="20" y="143.5" font-size="15" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">Home</text></g>`;

const SCENE={
  bg(){ let tufts='',dots='';
    for(let i=0;i<46;i++){ const x=U.ri(0,390), y=U.ri(140,600); tufts+=`<path d="M${x} ${y}l-3-6M${x} ${y}l0-7M${x} ${y}l3-6" stroke="#6f8748" stroke-width="1.6"/>`; }
    for(let i=0;i<26;i++){ const x=U.ri(0,390), y=U.ri(140,600); dots+=`<circle cx="${x}" cy="${y}" r="2.2" fill="${U.pick([C.bg,C.rbl,C.yl])}" stroke="${C.dg}" stroke-width="1"/>`; }
    /* Nối liền 100% từ cửa nhà (112,254) → ngã ba (124,288) → đường chính xuống dưới (100,660),
       nhánh lên đồi SHOP (334,66), và nhánh rẽ nhẹ ra Vườn cây & khu Pets (không đứt quãng) */
    const P1='M112 254 C114 274 122 282 124 288 C110 318 82 346 78 408 C74 470 92 532 100 660';
    const P2='M124 288 C206 300 264 264 294 196 C308 160 320 132 330 104 C336 90 334 80 334 66';
    const P3='M79 412 C136 422 228 422 330 412';
    return `<svg width="390" height="600" viewBox="0 0 390 600" style="position:absolute;left:0;top:0;overflow:visible" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="-800" y="-600" width="1990" height="820" fill="#F7F4D5"/>
      <g stroke="${C.dg}" stroke-width="2" fill="#fff"><path d="M30 40c0-8 12-10 16-4 3-7 15-6 15 2 6 0 7 9 0 9H32c-5 0-6-6-2-7z"/><path d="M180 22c0-7 10-9 14-3 3-6 13-5 13 2 5 0 6 8 0 8h-25c-4 0-5-5-2-7z"/></g>
      <path d="M-800 156 C-200 140 120 128 232 104 C282 88 300 34 346 34 C392 34 460 58 1190 74 V1300 H-800Z" fill="#6f8748" stroke="${C.dg}" stroke-width="2.5"/>
      <path d="M-800 138 C-100 124 220 134 292 122 C332 116 420 122 1190 116 V1300 H-800Z" fill="#839958" stroke="${C.dg}" stroke-width="2.5"/>
      <ellipse cx="200" cy="250" rx="70" ry="22" fill="#8fa565"/><ellipse cx="60" cy="470" rx="50" ry="18" fill="#8fa565"/><ellipse cx="300" cy="540" rx="80" ry="22" fill="#8fa565"/>
      ${tufts}${dots}
      <!-- Lớp viền đường vẽ trước -->
      <g stroke="${C.dg}" stroke-width="31"><path d="${P1}"/><path d="${P2}"/></g>
      <g stroke="${C.dg}" stroke-width="20"><path d="${P3}"/></g>
      <!-- Lớp nền đường cát vẽ đè lên để toàn bộ ngã ba liền mạch 100% -->
      <g stroke="#e6d9a8" stroke-width="25"><path d="${P1}"/><path d="${P2}"/></g>
      <g stroke="#e6d9a8" stroke-width="15"><path d="${P3}"/></g>
      <g fill="#d9c98f" stroke="${C.dg}" stroke-width="1.5">
        <ellipse cx="122" cy="288" rx="8" ry="4.5"/><ellipse cx="96" cy="340" rx="7" ry="4"/><ellipse cx="80" cy="422" rx="8" ry="4"/><ellipse cx="88" cy="510" rx="7" ry="4"/>
        <ellipse cx="216" cy="282" rx="7" ry="4"/><ellipse cx="288" cy="204" rx="6" ry="3.5"/><ellipse cx="268" cy="413" rx="6" ry="3.5"/>
      </g>
    </svg>`; },

  /* ---------- 6 mẫu ngoại hình nhà (to/nhỏ nhiều theme, giữ bảng màu chuẩn) ---------- */
  HOUSES:{
    mushroom:`<svg width="180" height="175" viewBox="0 0 180 175" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="92" cy="168" rx="84" ry="8" fill="${C.dg}" opacity=".18" stroke="none"/>
      <path d="M36 166 L41 88 Q90 80 139 88 L144 166 Z" fill="${C.bg}"/>
      <path d="M46 142h10M120 134h12M50 104h8M128 154h8M56 156h8" stroke-width="1.6" opacity=".55"/>
      <path d="M72 166 V128 Q90 106 108 128 V166 Z" fill="${C.rb}"/><path d="M84 114 V166 M96 114 V166" stroke-width="1.4" opacity=".5"/>
      <circle cx="102" cy="148" r="2.4" fill="${C.dg}"/><path d="M64 167h52" stroke-width="3.5"/>
      <circle cx="54" cy="122" r="11" fill="${C.mnl}"/><circle class="win-glow" cx="54" cy="122" r="10" fill="${C.yl}" stroke="none"/><path d="M54 111v22M43 122h22" stroke-width="1.8"/>
      <circle cx="126" cy="114" r="9" fill="${C.mnl}"/><circle class="win-glow" cx="126" cy="114" r="8" fill="${C.yl}" stroke="none"/><path d="M126 105v18M117 114h18" stroke-width="1.8"/>
      <path d="M8 92 C30 104 150 104 172 92 C150 113 30 113 8 92Z" fill="#0b4552"/>
      <path d="M8 92 C4 42 56 8 92 8 C130 8 178 40 172 92 C150 104 30 104 8 92Z" fill="${C.mn}"/>
      <g fill="${C.bg}" stroke-width="2"><ellipse cx="46" cy="52" rx="11" ry="9"/><ellipse cx="92" cy="30" rx="13" ry="10"/><ellipse cx="137" cy="54" rx="10" ry="8"/><ellipse cx="70" cy="80" rx="7" ry="5.5"/><ellipse cx="118" cy="83" rx="6" ry="5"/><ellipse cx="25" cy="80" rx="5" ry="4.5"/><ellipse cx="157" cy="80" rx="5" ry="4"/></g>
      <path d="M28 52 Q42 26 68 17" stroke="${C.bg}" stroke-width="3" opacity=".45"/>${HOME_SIGN}</svg>`,

    cottage:`<svg width="184" height="175" viewBox="0 0 184 175" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="92" cy="168" rx="84" ry="8" fill="${C.dg}" opacity=".18" stroke="none"/>
      <rect x="122" y="24" width="20" height="44" rx="3" fill="${C.wood}"/><rect x="118" y="20" width="28" height="8" rx="3" fill="${C.rb}"/>
      <path d="M132 16c-4-7 6-10 2-15M139 14c-2-5 5-7 3-11" stroke="${C.dg}" stroke-width="1.8" opacity=".45"/>
      <rect x="34" y="88" width="116" height="78" rx="4" fill="${C.bg}"/>
      <path d="M34 108h116M34 128h116M34 148h116" stroke="${C.wood}" stroke-width="1.4" opacity=".45"/>
      <path d="M16 94 L92 26 L168 94 Z" fill="${C.rb}"/>
      <path d="M38 74 Q92 84 146 74 M56 58 Q92 66 128 58" stroke="#a5584c" stroke-width="2" opacity=".5"/>
      <path d="M16 94 L92 26 L168 94" stroke-width="3.5"/>
      <circle cx="92" cy="64" r="10" fill="${C.mnl}"/><circle class="win-glow" cx="92" cy="64" r="9" fill="${C.yl}" stroke="none"/><path d="M92 54v20M82 64h20" stroke-width="1.8"/>
      <path d="M74 166 V122 Q92 110 110 122 V166 Z" fill="${C.wood}"/><circle cx="103" cy="146" r="2.4" fill="${C.dg}"/>
      <rect x="44" y="114" width="22" height="22" rx="4" fill="${C.mnl}"/><rect class="win-glow" x="46" y="116" width="18" height="18" rx="2" fill="${C.yl}" stroke="none"/><path d="M55 114v22M44 125h22" stroke-width="1.6"/>
      <rect x="42" y="136" width="26" height="7" rx="2" fill="${C.rb}"/><circle cx="48" cy="135" r="3" fill="${C.mg}"/><circle cx="55" cy="134" r="3" fill="${C.yl}"/><circle cx="62" cy="135" r="3" fill="${C.mg}"/>
      <rect x="118" y="114" width="22" height="22" rx="4" fill="${C.mnl}"/><rect class="win-glow" x="120" y="116" width="18" height="18" rx="2" fill="${C.yl}" stroke="none"/><path d="M129 114v22M118 125h22" stroke-width="1.6"/>
      ${HOME_SIGN}</svg>`,

    greenhouse:`<svg width="188" height="175" viewBox="0 0 188 175" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="94" cy="168" rx="86" ry="8" fill="${C.dg}" opacity=".18" stroke="none"/>
      <path d="M30 166 V92 C30 34 158 34 158 92 V166 Z" fill="#d9ecee"/>
      <path class="win-glow" d="M34 164 V92 C34 40 154 40 154 92 V164 Z" fill="${C.yl}" opacity=".45" stroke="none"/>
      <path d="M52 164 C52 130 62 108 68 102 C68 120 74 140 74 164Z" fill="${C.mg}" opacity=".75"/>
      <path d="M122 164 C122 124 134 98 142 92 C146 116 144 142 142 164Z" fill="#6f8748" opacity=".75"/>
      <circle cx="60" cy="118" r="7" fill="${C.rbl}"/><circle cx="136" cy="108" r="8" fill="${C.yl}"/>
      <path d="M30 92 H158 M38 64 H150 M62 46 V166 M94 40 V166 M126 46 V166" stroke="${C.mn}" stroke-width="2"/>
      <rect x="26" y="144" width="136" height="22" rx="3" fill="${C.bg}"/>
      <path d="M74 166 V114 Q94 98 114 114 V166 Z" fill="${C.mg}"/><rect x="82" y="120" width="24" height="24" rx="4" fill="${C.bg}"/><circle cx="107" cy="148" r="2.2" fill="${C.dg}"/>
      <path d="M30 166 V92 C30 34 158 34 158 92 V166 Z" stroke="${C.dg}" stroke-width="3"/>
      <path d="M84 34 c4-10 16-10 20 0" fill="${C.mg}"/>${HOME_SIGN}</svg>`,

    japanese:`<svg width="192" height="175" viewBox="0 0 192 175" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="96" cy="168" rx="88" ry="8" fill="${C.dg}" opacity=".18" stroke="none"/>
      <rect x="34" y="88" width="124" height="78" fill="${C.bg}"/>
      <rect x="26" y="158" width="140" height="9" rx="2" fill="${C.wood}"/>
      <path d="M10 92 Q40 82 64 46 H128 Q152 82 182 92 Q144 96 96 96 Q48 96 10 92 Z" fill="${C.mn}"/>
      <path d="M56 46 H136 L142 36 H50 Z" fill="#0b4552"/>
      <path d="M38 82 Q96 86 154 82 M50 66 Q96 70 142 66" stroke="${C.mnl}" stroke-width="1.6" opacity=".55"/>
      <rect x="70" y="106" width="52" height="52" fill="#fff"/><rect class="win-glow" x="72" y="108" width="48" height="48" fill="${C.yl}" stroke="none"/>
      <path d="M96 106v52M70 123h52M70 140h52M83 106v52M109 106v52" stroke="${C.wood}" stroke-width="1.6"/>
      <rect x="70" y="106" width="52" height="52"/>
      <circle cx="50" cy="126" r="11" fill="${C.mnl}"/><circle class="win-glow" cx="50" cy="126" r="9.5" fill="${C.yl}" stroke="none"/><path d="M44 126h12M50 120v12" stroke-width="1.5"/>
      <path d="M142 96v10"/><ellipse cx="142" cy="115" rx="7" ry="10" fill="${C.rb}"/><path d="M137 112h10M137 118h10" stroke-width="1.3"/>
      <path d="M168 164 V104 M174 164 V116" stroke="${C.mg}" stroke-width="3.2"/><path d="M168 122l-8-4M174 134l8-4" stroke="${C.mg}" stroke-width="2"/>${HOME_SIGN}</svg>`,

    treehouse:`<svg width="198" height="196" viewBox="0 0 198 196" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="99" cy="189" rx="88" ry="8" fill="${C.dg}" opacity=".18" stroke="none"/>
      <path d="M62 188 C70 156 72 132 70 108 H128 C126 134 128 158 138 188 Z" fill="${C.wood}"/>
      <path d="M84 128v44M104 140v38M116 126v30" stroke="#8b6b4a" stroke-width="1.8" opacity=".5"/>
      <path d="M24 84 C6 68 14 34 42 32 C48 10 86 2 104 14 C124 2 160 12 162 36 C188 40 192 74 170 86 C158 98 40 98 24 84 Z" fill="#6f8748"/>
      <path d="M36 44 Q64 20 96 22" stroke="${C.mgl}" stroke-width="3" opacity=".5"/>
      <rect x="46" y="54" width="106" height="62" rx="4" fill="${C.bg}"/>
      <path d="M36 58 L99 24 L162 58 Z" fill="${C.mn}"/>
      <rect x="34" y="114" width="130" height="9" rx="3" fill="${C.wood}"/>
      <path d="M40 102 V114 M60 102 V114 M138 102 V114 M158 102 V114 M36 102 H66 M132 102 H162" stroke="${C.dg}" stroke-width="2.4"/>
      <path d="M86 114 V82 Q99 72 112 82 V114 Z" fill="${C.rb}"/><circle cx="107" cy="98" r="2" fill="${C.dg}"/>
      <circle cx="66" cy="84" r="10" fill="${C.mnl}"/><circle class="win-glow" cx="66" cy="84" r="9" fill="${C.yl}" stroke="none"/><path d="M66 74v20M56 84h20" stroke-width="1.5"/>
      <circle cx="132" cy="84" r="10" fill="${C.mnl}"/><circle class="win-glow" cx="132" cy="84" r="9" fill="${C.yl}" stroke="none"/><path d="M132 74v20M122 84h20" stroke-width="1.5"/>
      <!-- Thang dây -->
      <path d="M90 123 V186 M108 123 V186 M90 135 H108 M90 148 H108 M90 161 H108 M90 174 H108" stroke="${C.dg}" stroke-width="2.2"/>
      <path d="M22 190 V166" stroke-width="3.5"/><g transform="rotate(-6 22 158)"><rect x="-6" y="147" width="56" height="22" rx="5" fill="${C.bg}"/><text x="22" y="163.5" font-size="15" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">Home</text></g></svg>`,

    villa:`<svg width="204" height="196" viewBox="0 0 204 196" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="102" cy="189" rx="94" ry="8" fill="${C.dg}" opacity=".18" stroke="none"/>
      <!-- Tầng 1 & Tầng 2 -->
      <rect x="26" y="106" width="152" height="80" rx="4" fill="${C.bg}"/>
      <rect x="40" y="54" width="124" height="54" rx="4" fill="#fbf8e4"/>
      <path d="M18 110 H186 L176 98 H28 Z" fill="${C.rb}"/>
      <path d="M28 58 L102 12 L176 58 Z" fill="${C.mn}"/>
      <path d="M84 36 Q102 24 120 36 V54 H84 Z" fill="${C.bg}"/>
      <circle cx="102" cy="40" r="8" fill="${C.mnl}"/><circle class="win-glow" cx="102" cy="40" r="7" fill="${C.yl}" stroke="none"/>
      <!-- Ban công tầng 2 -->
      <rect x="52" y="68" width="24" height="28" rx="3" fill="${C.mnl}"/><rect class="win-glow" x="54" y="70" width="20" height="24" fill="${C.yl}" stroke="none"/><path d="M64 68v28M52 82h24" stroke-width="1.6"/>
      <rect x="128" y="68" width="24" height="28" rx="3" fill="${C.mnl}"/><rect class="win-glow" x="130" y="70" width="20" height="24" fill="${C.yl}" stroke="none"/><path d="M140 68v28M128 82h24" stroke-width="1.6"/>
      <rect x="86" y="66" width="32" height="32" rx="3" fill="${C.rbl}"/><path d="M102 66v32" stroke-width="1.8"/>
      <path d="M80 96 H124 M84 86 V96 M94 86 V96 M104 86 V96 M114 86 V96 M120 86 V96 M80 86 H124" stroke="${C.dg}" stroke-width="2"/>
      <!-- Cửa đôi tầng 1 & cửa sổ lớn -->
      <path d="M82 186 V136 Q102 122 122 136 V186 Z" fill="${C.rb}"/><path d="M102 129 V186" stroke-width="2"/><circle cx="96" cy="160" r="2" fill="${C.dg}"/><circle cx="108" cy="160" r="2" fill="${C.dg}"/>
      <rect x="38" y="130" width="30" height="30" rx="4" fill="${C.mnl}"/><rect class="win-glow" x="40" y="132" width="26" height="26" fill="${C.yl}" stroke="none"/><path d="M53 130v30M38 145h30" stroke-width="1.8"/>
      <rect x="136" y="130" width="30" height="30" rx="4" fill="${C.mnl}"/><rect class="win-glow" x="138" y="132" width="26" height="26" fill="${C.yl}" stroke="none"/><path d="M151 130v30M136 145h30" stroke-width="1.8"/>
      <circle cx="74" cy="140" r="4" fill="${C.yl}"/><circle cx="130" cy="140" r="4" fill="${C.yl}"/>
      <path d="M22 190 V166" stroke-width="3.5"/><g transform="rotate(-6 22 158)"><rect x="-6" y="147" width="56" height="22" rx="5" fill="${C.bg}"/><text x="22" y="163.5" font-size="15" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">Home</text></g></svg>`
  },
  houseOf(id){ return this.HOUSES[id]||this.HOUSES.mushroom; },
  get house(){ return this.HOUSES.mushroom; },

  clock:`<svg width="44" height="50" viewBox="0 0 44 50" fill="none" stroke="${C.dg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="22" cy="48" rx="15" ry="3" fill="${C.dg}" opacity=".2" stroke="none"/><path d="M12 42l-4 6M32 42l4 6" stroke-width="3"/>
    <path d="M5 13a8 8 0 0 1 12-7z" fill="${C.rb}"/><path d="M39 13a8 8 0 0 0-12-7z" fill="${C.rb}"/><path d="M22 7V4M18 3.5h8" stroke-width="2.4"/>
    <circle cx="22" cy="27" r="17" fill="${C.rb}"/><circle cx="22" cy="27" r="12.5" fill="${C.bg}"/>
    <path d="M22 16v2M22 36v2M11 27h2M31 27h2" stroke-width="1.6"/>
    <path id="clkH" d="M22 27v-7" stroke-width="2.8"/><path id="clkM" d="M22 27v-10" stroke-width="1.8"/><circle cx="22" cy="27" r="1.7" fill="${C.dg}"/>
  </svg>`,

  /* Vườn hoa 5 giai đoạn + biển "Vườn cây" dễ thương */
  garden(stage=4){ const cols=[C.rbl,'#fff',C.mnl,C.yl,C.rb,'#fff',C.rbl]; let f='';
    const leafA=`<path d="M0-9c-6-1-8-5-8-8 4 0 7 3 8 8z" fill="${C.mgl}" stroke-width="1.5"/>`, leafB=`<path d="M0-13c6-1 8-5 8-8-4 0-7 3-8 8z" fill="${C.mgl}" stroke-width="1.5"/>`;
    for(let i=0;i<7;i++){ const x=24+i*18.7; let g='';
      if(stage<=0) g=`<ellipse cx="0" cy="-1" rx="6" ry="3" fill="#6b4f35" stroke-width="1.4"/><circle cx="0" cy="-3.4" r="1.7" fill="${C.yl}" stroke-width="1"/>`;
      else if(stage===1) g=`<path d="M0 0V-8" stroke-width="2"/><path d="M0-7c-4 0-6-2-6-5 3 0 5 2 6 5zM0-7c4 0 6-2 6-5-3 0-5 2-6 5z" fill="${C.mgl}" stroke-width="1.3"/>`;
      else if(stage===2) g=`<path d="M0 0V-16" stroke-width="2.1"/>${leafA}<path d="M0-11c6-1 8-5 8-8-4 0-7 3-8 8z" fill="${C.mgl}" stroke-width="1.5"/><path d="M0-16c-3-1-4-4-3-6 2 1 3 3 3 6z" fill="${C.mg}" stroke-width="1.2"/>`;
      else if(stage===3) g=`<path d="M0 0V-22" stroke-width="2.2"/>${leafA}${leafB}<g transform="translate(0,-25)"><g class="head"><ellipse rx="3.8" ry="5.4" fill="${cols[i]}"/><path d="M-3.8 1.2c1 3.4 6.6 3.4 7.6 0" fill="${C.mg}" stroke-width="1.3"/></g></g>`;
      else { const pet=[0,72,144,216,288].map(a=>`<circle cx="${(Math.cos(a*Math.PI/180)*4.6).toFixed(1)}" cy="${(Math.sin(a*Math.PI/180)*4.6).toFixed(1)}" r="4.4" fill="${cols[i]}"/>`).join('');
        g=`<path d="M0 0V-26" stroke-width="2.2"/>${leafA}${leafB}<g transform="translate(0,-30)"><g class="head">${pet}<circle r="3.2" fill="${C.yl}"/></g></g>`; }
      f+=`<g transform="translate(${x},55)"><g class="fl">${g}</g></g>`; }
    if(stage>=4) f+=`<g transform="translate(80,40)"><g class="fl"><path d="M0 15V-34" stroke-width="2.6"/><path d="M0-6c-9-1-12-7-12-11 6 0 10 4 12 11zM0-14c9-1 12-7 12-11-6 0-10 4-12 11z" fill="${C.mg}" stroke-width="1.6"/><g transform="translate(0,-40)"><g class="head">${Array.from({length:10},(_,k)=>`<ellipse cx="0" cy="-8.5" rx="3" ry="6" fill="${C.yl}" transform="rotate(${k*36})" stroke-width="1.3"/>`).join('')}<circle r="6" fill="#a87a4e" stroke-width="1.5"/></g></g></g></g>`;
    return `<svg width="160" height="80" viewBox="0 0 160 80" fill="none" stroke="${C.dg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="overflow:visible">
      <ellipse cx="80" cy="74" rx="78" ry="6" fill="${C.dg}" opacity=".16" stroke="none"/>
      <rect x="4" y="30" width="152" height="42" rx="12" fill="${C.wood}"/><rect x="12" y="36" width="136" height="29" rx="8" fill="${C.soil}"/>
      <path d="M24 60h4M52 64h5M92 62h4M122 60h5" stroke="#6b4f35" stroke-width="2"/>${f}
      <!-- Biển gỗ Vườn cây -->
      <path d="M80 78 V64" stroke-width="3"/>
      <g transform="rotate(-2 80 68)"><rect x="44" y="61" width="72" height="19" rx="5" fill="${C.bg}"/><text x="80" y="74.5" font-size="11.5" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">Vườn cây</text></g>
    </svg>`; },

  penBack:`<svg width="118" height="170" viewBox="0 0 118 170" fill="none" stroke="${C.dg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="22" width="110" height="146" rx="10" fill="#9db274" stroke-dasharray="5 4"/>
    <path d="M30 80l-2-5M30 80v-6M30 80l2-5M80 120l-2-5M80 120v-6M80 120l2-5M60 60l-2-5M60 60v-6M60 60l2-5" stroke="#6f8748" stroke-width="1.6"/>
    <path d="M10 46V24L26 10L42 24V46Z" fill="${C.rb}"/><path d="M5 26L26 5L47 26L43 29L26 13L9 29Z" fill="${C.mn}"/><path d="M20 46V35a6 6 0 0 1 12 0V46Z" fill="${C.dg}"/>
    <path d="M50 13H114M50 23H114" stroke-width="6"/><path d="M50 13H114M50 23H114" stroke="${C.wood}" stroke-width="3"/>
    ${[52,68,84,100].map(x=>`<rect x="${x}" y="6" width="6" height="24" rx="2" fill="${C.wood}"/>`).join('')}
    <rect x="62" y="-2" width="44" height="17" rx="4" fill="${C.bg}"/><text x="84" y="11" font-size="11" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">PETS</text>
    <path d="M4 26V166M114 26V166" stroke-width="7"/><path d="M4 26V166M114 26V166" stroke="${C.wood}" stroke-width="3.5"/>
  </svg>`,
  penFront:`<svg width="126" height="26" viewBox="0 0 126 26" fill="none" stroke="${C.dg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 10H46M6 18H46M80 10H120M80 18H120" stroke-width="6"/><path d="M6 10H46M6 18H46M80 10H120M80 18H120" stroke="${C.wood}" stroke-width="3"/>
    ${[3,23,43,78,98,117].map(x=>`<rect x="${x}" y="2" width="6" height="22" rx="2" fill="${C.wood}"/>`).join('')}</svg>`,
  bowl:`<svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="${C.dg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <g class="food"><path d="M9 11c1-4 4-5 6-4 1-3 5-3 7-1 2-2 6-1 8 5" fill="#e0b27a"/></g>
    <path d="M4 11h32c0 7-6 11-16 11S4 18 4 11z" fill="${C.rb}"/><circle cx="20" cy="16" r="2" fill="${C.bg}" stroke-width="1.2"/></svg>`,
  shop:`<svg width="92" height="82" viewBox="0 0 92 82" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="overflow:visible">
    <ellipse class="pglow" cx="46" cy="74" rx="32" ry="8" fill="#1d6f80" stroke="none" opacity=".6" transform="scale(1.15) translate(-6 -10)"/>
    <ellipse cx="46" cy="74" rx="30" ry="7" fill="${C.mn}" stroke="${C.mg}" stroke-width="3.5"/>
    <rect x="20" y="62" width="4" height="4" fill="${C.bg}" stroke-width="1.2"/><rect x="66" y="58" width="4" height="4" fill="${C.bg}" stroke-width="1.2"/><rect x="52" y="52" width="3" height="3" fill="${C.bg}" stroke-width="1"/>
    <path d="M44 74V32M50 74V32" stroke-width="2"/><rect x="44" y="32" width="6" height="42" fill="${C.wood}"/>
    <path d="M6 8H72L86 23L72 38H6Z" fill="${C.rb}"/><text x="42" y="30" font-size="19" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">SHOP</text>
  </svg>`,
  tree:(c='#6f8748')=>`<svg width="64" height="84" viewBox="0 0 64 84" fill="none" stroke="${C.dg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="32" cy="80" rx="20" ry="4" fill="${C.dg}" opacity=".18" stroke="none"/><path d="M27 80V52h10v28" fill="${C.wood}"/>
    <path d="M12 50c-9-4-9-18 2-21 0-12 14-18 22-11 10-4 20 4 17 14 9 3 8 18-3 19-4 5-14 6-19 1-6 4-16 3-19-2z" fill="${c}"/>
    <path d="M18 30c2-6 8-9 13-8" stroke="${C.bg}" opacity=".5" stroke-width="2.6"/><circle cx="40" cy="40" r="2.6" fill="${C.rb}" stroke-width="1.2"/><circle cx="22" cy="44" r="2.6" fill="${C.rb}" stroke-width="1.2"/></svg>`,
  bush:`<svg width="46" height="28" viewBox="0 0 46 28" fill="none" stroke="${C.dg}" stroke-width="2.2"><path d="M4 26c-4-8 4-14 10-10 2-8 14-10 18-2 8-4 14 4 10 12z" fill="#6f8748"/><circle cx="16" cy="18" r="2" fill="${C.bg}" stroke-width="1"/><circle cx="30" cy="16" r="2" fill="${C.rbl}" stroke-width="1"/></svg>`
};

const toImg=s=>{ const i=new Image(); i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s); return i; };
const HUB_SVG=`<svg width="390" height="330" viewBox="0 0 390 330" fill="none" stroke="${C.dg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:0;top:0;overflow:visible">
  <rect x="-700" y="-300" width="1790" height="480" fill="${C.bg}" stroke="none"/>
  <g fill="#fff" stroke-width="2"><path d="M30 40c0-8 12-10 16-4 3-7 15-6 15 2 6 0 7 9 0 9H32c-5 0-6-6-2-7z"/><path d="M320 28c0-7 10-9 14-3 3-6 13-5 13 2 5 0 6 8 0 8h-25c-4 0-5-5-2-7z"/></g>
  <path d="M-700 176 H1090 V700 H-700Z" fill="${C.mg}"/>
  <path d="M120 330 L160 200 H230 L270 330Z" fill="#e6d9a8"/>
  <rect x="62" y="70" width="266" height="132" fill="${C.bg}"/>
  <rect x="78" y="34" width="234" height="34" rx="8" fill="${C.mn}"/><text x="195" y="57" font-size="17" font-weight="800" text-anchor="middle" fill="${C.bg}" stroke="none" font-family="Baloo 2,sans-serif">SIÊU THỊ TỈNH THỨC</text>
  <path d="M56 98 H334 V112 H56Z" fill="${C.rb}"/>
  ${Array.from({length:14},(_,i)=>`<path d="M${56+i*20} 112 q10 12 20 0" fill="${i%2?C.bg:C.rb}"/>`).join('')}
  <rect x="160" y="140" width="70" height="62" fill="${C.mnl}"/><path d="M195 140V202" />
  <rect x="78" y="134" width="62" height="44" rx="4" fill="#fff"/><rect x="250" y="134" width="62" height="44" rx="4" fill="#fff"/>
  <g class="sale-blink"><rect x="84" y="140" width="50" height="22" rx="4" fill="${C.rb}"/><text x="109" y="156" font-size="12" font-weight="800" text-anchor="middle" fill="${C.dg}" stroke="none" font-family="Baloo 2,sans-serif">-50%!</text></g>
  <text x="281" y="152" font-size="10" font-weight="800" text-anchor="middle" fill="${C.mn}" stroke="none" font-family="Baloo 2,sans-serif">FLASH</text><text x="281" y="168" font-size="10" font-weight="800" text-anchor="middle" fill="${C.mn}" stroke="none" font-family="Baloo 2,sans-serif">SALE 0đ</text>
  <ellipse class="pglow" cx="195" cy="284" rx="46" ry="14" fill="#1d6f80" stroke="none" opacity=".55"/>
  <ellipse cx="195" cy="284" rx="40" ry="11" fill="${C.mn}" stroke="${C.mg}" stroke-width="3.5"/>
  <rect x="160" y="270" width="5" height="5" fill="${C.bg}" stroke-width="1.2"/><rect x="226" y="276" width="5" height="5" fill="${C.bg}" stroke-width="1.2"/>
</svg>`;

Object.assign(SCENE,{
  can:`<svg width="66" height="50" viewBox="0 0 66 50" fill="none" stroke="${C.dg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18h26v22a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill="${C.mnl}"/><path d="M40 26l15-12 3 3-14 15" fill="${C.mnl}"/><path d="M55 12l5-3 2 6-4 1z" fill="${C.mn}"/><path d="M20 18v-4a7 7 0 0 1 14 0v4"/><path d="M14 26c-6 0-8 7-4 11"/><path d="M19 24v12" stroke="#fff" stroke-width="2"/></svg>`,
  foodBag:`<svg width="44" height="54" viewBox="0 0 44 54" fill="none" stroke="${C.dg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12h28l4 38H4z" fill="${C.rb}"/><path d="M8 12l5-8h18l5 8"/><ellipse cx="22" cy="32" rx="8" ry="6" fill="${C.bg}" stroke-width="1.8"/><circle cx="15" cy="24" r="2.4" fill="${C.bg}" stroke-width="1.4"/><circle cx="22" cy="21" r="2.4" fill="${C.bg}" stroke-width="1.4"/><circle cx="29" cy="24" r="2.4" fill="${C.bg}" stroke-width="1.4"/></svg>`
});
