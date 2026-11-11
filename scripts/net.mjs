const H=['https://data-api.binance.vision','https://api.binance.com'];
export async function bj(p){let e;for(const h of H){try{const r=await fetch(h+'/api/v3/'+p,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch(x){e=x}}throw e}
export const kl=async(s,iv,q={})=>{const p=new URLSearchParams({symbol:s,interval:iv,limit:String(q.limit||200)});if(q.start)p.set('startTime',String(q.start));if(q.end)p.set('endTime',String(q.end));
 return(await bj('klines?'+p)).map(a=>({t:a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],v:+a[5],ct:a[6]}))};
export const closed=(b,now=Date.now())=>b.filter(q=>q.ct<now);
const STABLE=new Set(['USDC','FDUSD','TUSD','DAI','USDP','EUR','USD1','PYUSD','USDE','BUSD','USDS','USDT','XUSD','AEUR']);
export async function universe(n){return(await bj('ticker/24hr')).filter(x=>x.symbol.endsWith('USDT')&&!STABLE.has(x.symbol.slice(0,-4))&&!/(UP|DOWN|BULL|BEAR)USDT$/.test(x.symbol)).sort((a,b)=>b.quoteVolume-a.quoteVolume).slice(0,n).map(x=>x.symbol.slice(0,-4))}
