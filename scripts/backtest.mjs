// Backtest kasar: candle 15m (penilaian di 15m, SL didahulukan), dikira sama untuk semua koin. BUKAN bukti; hanya uji awal logika.
import fs from 'node:fs';import {regime,detect,mkRow} from '../core.mjs';import {gradeTrade} from '../trade-sim.mjs';import {kl,closed,universe} from './net.mjs';
const cfg=JSON.parse(fs.readFileSync('config.json','utf8')),PAGES=+(process.env.PAGES||3),N=+(process.env.SYMS||15),now=Date.now();
async function hist(sym){let all=[],end=now;for(let p=0;p<PAGES;p++){const b=closed(await kl(sym+'USDT','15m',{limit:1000,end}),now);if(!b.length)break;all=b.concat(all);end=b[0].t-1}return all}
function agg1h(b){const g={};for(const q of b)(g[Math.floor(q.t/36e5)]??=[]).push(q);return Object.values(g).filter(a=>a.length===4).map(a=>({t:a[0].t,o:a[0].o,h:Math.max(...a.map(q=>q.h)),l:Math.min(...a.map(q=>q.l)),c:a[3].c,v:a.reduce((s,q)=>s+q.v,0),ct:a[3].ct}))}
const btc=await hist('BTC'),h1=agg1h(btc),cb={...cfg,fillBars:Math.ceil(cfg.fillBars/3),holdBars:Math.ceil(cfg.holdBars/3)},R=[];
for(const a of await universe(N)){const b=a==='BTC'?btc:await hist(a);let ptr=0,lastT=-1e18;
 for(let i=60;i<b.length-1;i++){const L=b[i];while(ptr<h1.length&&h1[ptr].ct<=L.ct)ptr++;if(ptr<55)continue;
  const reg=regime(h1.slice(Math.max(0,ptr-100),ptr),cfg);if(!['RANGE','TREN_NAIK','TREN_TURUN'].includes(reg.st))continue;
  const ss=detect(b.slice(i-149<0?0:i-149,i+1),reg,cfg);if(!ss.length||L.t-lastT<cfg.dedupBars*9e5)continue;
  const s=ss[0],g=gradeTrade(s,b.slice(i+1,i+1+cb.fillBars+cb.holdBars+2),cb);if(g.hasil==='menunggu')continue;lastT=L.t;
  if(['TP','SL','kedaluwarsa'].includes(g.hasil))R.push({a,t:L.t,arah:s.arah,setup:s.setup,R:g.R,risk:s.riskPct/100,h:g.hasil})}}
R.sort((x,y)=>x.t-y.t);
const net=(x,c)=>x.R-(c/100)/x.risk,mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null,f=x=>x==null?'-':x.toFixed(3);
const sum=(rows,c=cfg.costPct)=>{const n=rows.map(x=>net(x,c)),gp=n.filter(x=>x>0).reduce((s,x)=>s+x,0),gl=-n.filter(x=>x<0).reduce((s,x)=>s+x,0);return`n=${rows.length} win=${rows.length?(rows.filter(x=>x.h==='TP').length/rows.length*100).toFixed(0):'-'}% R/trade=${f(mean(n))} PF=${gl?(gp/gl).toFixed(2):'-'}`};
const half=Math.floor(R.length/2),days=R.length?(R.at(-1).t-R[0].t)/864e5:0;
const out=`# Backtest (${new Date(now).toISOString().slice(0,10)}), rentang sekitar ${days.toFixed(0)} hari, ${N} koin\nCATATAN: penilaian di candle 15m, satu rezim pasar, tanpa slippage tambahan. Hanya uji awal.\n- Semua: ${sum(R)}\n- LONG: ${sum(R.filter(x=>x.arah==='LONG'))}\n- SHORT: ${sum(R.filter(x=>x.arah==='SHORT'))}\n- sweep: ${sum(R.filter(x=>x.setup==='sweep'))}\n- pullback: ${sum(R.filter(x=>x.setup==='pullback'))}\n- Separuh awal: ${sum(R.slice(0,half))}\n- Separuh akhir: ${sum(R.slice(half))}\n- Biaya 0,1%: ${sum(R,.1)} | 0,2%: ${sum(R,.2)} | 0,3%: ${sum(R,.3)} | 0,5%: ${sum(R,.5)}\n`;
fs.mkdirSync('data',{recursive:true});fs.writeFileSync(process.env.BT_OUT||'data/backtest.md',out);console.log(out);
