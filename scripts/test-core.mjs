import assert from 'node:assert/strict';import fs from 'node:fs';
import {regime,detect,allowNew,mkRow,dirOK,ema} from '../core.mjs';import {gradeTrade} from '../trade-sim.mjs';
const cfg=JSON.parse(fs.readFileSync('config.json','utf8'));let ok=0;const T=(n,f)=>{f();ok++;console.log('OK  '+n)};
const bar=(i,o,h,l,c,v=100,iv=9e5)=>({t:i*iv,o,h,l,c,v,ct:i*iv+iv-1});
function flat(n){const b=[];for(let i=0;i<n;i++){const w=i%2?.1:-.1;b.push(bar(i,100+w,100.3,99.7,100-w))}return b}
function sweepLong(){const b=flat(80);b[50]=bar(50,100,104,99.8,100.2);                        // ruang ke atas
 const n=b.length;b[n-2]=bar(n-2,99.9,100,98.9,99.2,150);b[n-1]=bar(n-1,99.3,100.2,99.2,100.1,300);return b}  // sweep lalu reclaim
const RG={st:'RANGE',spread:.1,range24:3,atrp:.4};
T('sweep LONG terdeteksi, geometri SL<entry<TP, R:R sesuai',()=>{const s=detect(sweepLong(),RG,cfg).find(x=>x.setup==='sweep'&&x.arah==='LONG');assert.ok(s);assert.ok(s.sl<s.entry&&s.entry<s.tp);assert.ok(Math.abs((s.tp-s.entry)/(s.entry-s.sl)-cfg.rr)<.02);assert.ok(s.riskPct>=cfg.costPct/cfg.maxCostR)});
T('gerbang biaya menolak stop terlalu dekat',()=>{const b=sweepLong();b[78]=bar(78,99.9,100,99.65,99.7,150);b[79]=bar(79,99.7,100.1,99.69,100.0,300);assert.equal(detect(b,RG,cfg).filter(x=>x.setup==='sweep').length,0)});
T('volume lemah menolak sinyal',()=>{const b=sweepLong();b[79].v=100;assert.equal(detect(b,RG,cfg).filter(x=>x.setup==='sweep').length,0)});
T('tidak melawan tren BTC: LONG ditolak saat TREN_TURUN',()=>{assert.equal(detect(sweepLong(),{...RG,st:'TREN_TURUN'},cfg).filter(x=>x.arah==='LONG'&&x.setup==='sweep').length,0)});
T('rezim LIAR dan TIDAK_JELAS tidak menghasilkan sinyal',()=>{for(const st of['LIAR','TIDAK_JELAS'])assert.equal(detect(sweepLong(),{...RG,st},cfg).length,0)});
T('allowShort=false menyaring SHORT',()=>{const b=sweepLong().map(q=>({...q,o:200-q.o,c:200-q.c,h:200-q.l,l:200-q.h}));const s=detect(b,RG,{...cfg,allowShort:false});assert.ok(s.every(x=>x.arah==='LONG'))});
T('regime: naik, turun, range',()=>{const up=Array.from({length:70},(_,i)=>bar(i,100+i*.2,100.2+i*.2,99.9+i*.2,100.1+i*.2,100,36e5));assert.equal(regime(up,cfg).st,'TREN_NAIK');const dn=up.map(q=>({...q,o:300-q.o,c:300-q.c,h:300-q.l,l:300-q.h}));assert.equal(regime(dn,cfg).st,'TREN_TURUN');assert.equal(regime(flat(70).map(q=>({...q,ct:q.t+36e5-1})),cfg).st,'RANGE')});
T('dirOK',()=>{assert.ok(dirOK('RANGE','LONG')&&dirOK('TREN_NAIK','LONG')&&!dirOK('TREN_NAIK','SHORT')&&!dirOK('LIAR','LONG'))});
const sg={arah:'LONG',entry:100,sl:99,tp:101.8},g=(bars)=>gradeTrade(sg,bars,{...cfg,fillBars:3,holdBars:5});
T('grade: tidak terisi',()=>assert.equal(g([bar(0,101,102,100.5,101),bar(1,101,102,100.5,101),bar(2,101,102,100.5,101),bar(3,101,102,100.5,101)]).hasil,'tidak terisi'));
T('grade: TP setelah terisi',()=>{const r=g([bar(0,100.5,100.6,99.9,100.2),bar(1,100.2,102,100.1,101.9)]);assert.equal(r.hasil,'TP');assert.ok(Math.abs(r.R-1.8)<1e-9)});
T('grade: SL dan TP di candle sama = SL (konservatif)',()=>{const r=g([bar(0,100.5,100.6,99.9,100.2),bar(1,100.2,102,98.9,101)]);assert.equal(r.hasil,'SL');assert.equal(r.R,-1)});
T('grade: TP di candle isi tidak dihitung, SL di candle isi dihitung',()=>{assert.equal(g([bar(0,101,102,98.5,100.5)]).hasil,'SL');assert.equal(g([bar(0,101,103,99.9,102)]).hasil,'menunggu')});
T('grade: kedaluwarsa memberi R sebagian',()=>{const bars=[bar(0,100.5,100.6,99.9,100.2)];for(let i=1;i<=6;i++)bars.push(bar(i,100.2,100.5,100,100.4));const r=g(bars);assert.equal(r.hasil,'kedaluwarsa');assert.ok(r.R>0&&r.R<1)});
T('grade: tx = waktu candle saat hasil final terjadi',()=>{const r=g([bar(0,100.5,100.6,99.9,100.2),bar(1,100.2,102,100.1,101.9)]);assert.equal(r.tx,bar(1,0,0,0,0).t);assert.equal(g([bar(0,101,103,99.9,102)]).tx,null)});
T('allowNew: batas harian, stop setelah SL, posisi terbuka',()=>{const now=Date.parse('2026-11-10T12:00:00Z'),d='2026-11-10 ';const J=[{waktu:d+'01:00',hasil:'TP'},{waktu:d+'02:00',hasil:'TP'}];assert.ok(allowNew(J,now,cfg).ok);assert.ok(!allowNew([...J,{waktu:d+'03:00',hasil:'TP'}],now,cfg).ok);assert.ok(!allowNew([{waktu:d+'01:00',hasil:'SL'},{waktu:d+'02:00',hasil:'SL'}],now,cfg).ok);assert.ok(!allowNew([{waktu:'2026-11-09 01:00',hasil:'menunggu'},{waktu:'2026-11-09 02:00',hasil:'menunggu'},{waktu:'2026-11-09 03:00',hasil:'menunggu'}],now,cfg).ok)});
T('mkRow: format jurnal kompatibel monitor',()=>{const s=detect(sweepLong(),RG,cfg)[0],L=sweepLong().at(-1),r=mkRow(s,'ETH',L,RG,cfg);assert.match(r.waktu,/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);assert.equal(r.agen,'Scalp');assert.equal(r.hasil,'menunggu');for(const k of['id','aset','arah','entry','sl','tp','R','t0'])assert.ok(k in r)});
T('deterministik: input sama, keluaran sama',()=>assert.deepEqual(detect(sweepLong(),RG,cfg),detect(sweepLong(),RG,cfg)));
console.log(`\n${ok} uji lulus`);
