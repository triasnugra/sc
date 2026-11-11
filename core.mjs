// Mesin scalp: fungsi murni (tanpa jaringan, tanpa file). Hanya memakai candle yang SUDAH TUTUP.
export const ema=(a,n)=>{const k=2/(n+1);let e=a[0];return a.map(v=>e=v*k+e*(1-k))};
export const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
export function atr(b,n=14){const tr=b.map((q,i)=>Math.max(q.h-q.l,i?Math.abs(q.h-b[i-1].c):0,i?Math.abs(q.l-b[i-1].c):0)),s=tr.slice(-n);return s.reduce((x,y)=>x+y,0)/s.length}
export const r6=x=>Number(x.toPrecision(6));

// Rezim pasar dari BTC 1 jam (konteks @eliz883: tunggu volume dan arah jelas; altcoin di-scalp saat BTC range)
export function regime(h1,cfg){
 const c=h1.map(q=>q.c),n=c.length,px=c[n-1],e20=ema(c,20)[n-1],e50=ema(c,50)[n-1],spread=Math.abs(e20-e50)/px*100;
 const w=h1.slice(-24),range24=(Math.max(...w.map(q=>q.h))-Math.min(...w.map(q=>q.l)))/px*100,atrp=atr(h1)/px*100;
 let st='TIDAK_JELAS';
 if(atrp>cfg.btcAtrMaxPct)st='LIAR';
 else if(px>e20&&e20>e50&&spread>=cfg.trendSpreadPct)st='TREN_NAIK';
 else if(px<e20&&e20<e50&&spread>=cfg.trendSpreadPct)st='TREN_TURUN';
 else if(range24<=cfg.rangeMaxPct)st='RANGE';
 return{st,spread,range24,atrp}}
export const dirOK=(st,side)=>st==='RANGE'||(st==='TREN_NAIK'&&side==='LONG')||(st==='TREN_TURUN'&&side==='SHORT');

function pack(side,setup,entry,sl,b,vm,cfg,why){
 const risk=Math.abs(entry-sl),riskPct=risk/entry*100;if(!(risk>0))return null;
 if(riskPct>cfg.maxRiskPct)return null;                       // stop terlalu lebar untuk scalping
 if(cfg.costPct/riskPct>cfg.maxCostR)return null;             // gerbang biaya: biaya maksimal maxCostR dari 1R
 const s=side==='LONG'?1:-1,far=s==1?Math.max(...b.slice(-40).map(q=>q.h)):Math.min(...b.slice(-40).map(q=>q.l));
 if(s*(far-entry)<cfg.minRoomR*risk)return null;              // harus ada ruang gerak sampai level terdekat
 return{arah:side,setup,entry:r6(entry),sl:r6(sl),tp:r6(entry+s*cfg.rr*risk),riskPct:+riskPct.toFixed(3),skor:b[b.length-1].v/vm,alasan:why}}

// Deteksi pada candle 15m tertutup. Entry = limit di close candle konfirmasi (tanpa mengejar harga).
export function detect(b,reg,cfg){
 const n=b.length;if(n<60||!['RANGE','TREN_NAIK','TREN_TURUN'].includes(reg.st))return[];
 const L=b[n-1],A=atr(b),vm=med(b.slice(-21,-1).map(q=>q.v)),out=[],win=b.slice(-24,-3);
 const lo=Math.min(...win.map(q=>q.l)),hi=Math.max(...win.map(q=>q.h)),swL=Math.min(b[n-2].l,L.l),swH=Math.max(b[n-2].h,L.h);
 const c=b.map(q=>q.c),e20=ema(c,20)[n-1],e50=ema(c,50)[n-1];
 const add=x=>{if(x&&(cfg.allowShort||x.arah==='LONG'))out.push(x)};
 // A) Sweep dan reclaim: harga menyapu swing lalu ditutup kembali, dengan lonjakan volume (konfirmasi)
 if(dirOK(reg.st,'LONG')&&swL<lo&&L.c>lo&&L.c>L.o&&L.v>=cfg.volMult*vm)add(pack('LONG','sweep',L.c,swL-.1*A,b,vm,cfg,`sweep swing low lalu reclaim, volume ${(L.v/vm).toFixed(1)}x, BTC ${reg.st}`));
 if(dirOK(reg.st,'SHORT')&&swH>hi&&L.c<hi&&L.c<L.o&&L.v>=cfg.volMult*vm)add(pack('SHORT','sweep',L.c,swH+.1*A,b,vm,cfg,`sweep swing high lalu reject, volume ${(L.v/vm).toFixed(1)}x, BTC ${reg.st}`));
 // B) Pullback tren ke EMA20, hanya searah tren BTC
 if(reg.st==='TREN_NAIK'&&e20>e50&&L.c>e50&&L.l<=e20*1.001&&L.c>e20&&L.c>L.o&&L.v>=cfg.pullVolMult*vm)add(pack('LONG','pullback',L.c,Math.min(...b.slice(-3).map(q=>q.l))-.1*A,b,vm,cfg,'pullback ke EMA20 searah tren BTC naik'));
 if(reg.st==='TREN_TURUN'&&e20<e50&&L.c<e50&&L.h>=e20*.999&&L.c<e20&&L.c<L.o&&L.v>=cfg.pullVolMult*vm)add(pack('SHORT','pullback',L.c,Math.max(...b.slice(-3).map(q=>q.h))+.1*A,b,vm,cfg,'pullback ke EMA20 searah tren BTC turun'));
 return out.sort((x,y)=>y.skor-x.skor)}

// Proteksi modal: batas harian, berhenti setelah SL berturut, batas posisi terbuka
export function allowNew(J,nowMs,cfg){
 const d=new Date(nowMs).toISOString().slice(0,10),td=J.filter(r=>r.waktu.startsWith(d));
 if(td.length>=cfg.dailyCap)return{ok:false,why:'batas harian tercapai'};
 if(td.filter(r=>r.hasil==='SL').length>=cfg.stopAfterSL)return{ok:false,why:`${cfg.stopAfterSL} SL hari ini: berhenti`};
 if(J.filter(r=>r.hasil==='menunggu').length>=cfg.maxOpen)return{ok:false,why:'posisi terbuka penuh'};
 return{ok:true,sisa:cfg.dailyCap-td.length}}

export function mkRow(s,aset,L,reg,cfg){const t0=L.ct+1;
 return{id:`${aset}|${s.arah}|${L.t}`,agen:cfg.agen,aset,arah:s.arah,entry:s.entry,sl:s.sl,tp:s.tp,hasil:'menunggu',R:'',
  waktu:new Date(t0).toISOString().slice(0,16).replace('T',' ')+' UTC',t0,setup:s.setup,regime:reg.st,skor:+s.skor.toFixed(2),alasan:s.alasan}}
