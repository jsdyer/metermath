export const places = [
  ['Vancouver Art Gallery',49.282955,-123.119849], ['English Bay bathhouse',49.286154,-123.142805],
  ['Victory Square',49.282585,-123.110117], ['Kitsilano Beach lifeguard station',49.274472,-123.153703],
  ['Trout Lake, Victoria Drive',49.255292,-123.065528], ['Queen Elizabeth Park lookout',49.242212,-123.112939],
  ['David Lam Park, west side',49.272383,-123.125415], ['BC Place',49.27678,-123.11204], ['Rogers Arena',49.27784,-123.10876]
];
export function metres(lat,lon,y,x){
  const r=Math.PI/180,a=Math.sin((y-lat)*r/2)**2+Math.cos(lat*r)*Math.cos(y*r)*Math.sin((x-lon)*r/2)**2;
  return 12742017.6*Math.asin(Math.sqrt(Math.min(1,a)));
}
const dayMap={'7 Days a Week':[0,1,2,3,4,5,6],'Mon-Sat':[1,2,3,4,5,6],'Mon-Fri':[1,2,3,4,5],'Sat-Sun':[0,6],Tuesdays:[2],Wednesdays:[3],Thursdays:[4]};
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const parseClock=s=>{
  if(s==='noon')return 720;
  if(s==='midnight')return 0;
  const match=/^(\d{1,2}):(\d{2})(am|pm)$/.exec(s);
  if(!match)return NaN;
  return ((Number(match[1])%12)+(match[3]==='pm'?12:0))*60+Number(match[2]);
};
function overlaps(a,b,c,d){return a<d && b>c;}
function restriction(dow,start,end,daysText,time){
  if(!time || !dayMap[daysText])return null;
  const bounds=time.toLowerCase().split(' to ').map(parseClock);
  if(time==='Anytime')bounds.splice(0,bounds.length,0,1440);
  if(bounds.length!==2 || bounds.some(Number.isNaN))return null;
  if(bounds[1]<=bounds[0])bounds[1]+=1440;
  for(const n of [-1,0,1])if(dayMap[daysText].includes((dow+n+7)%7) && overlaps(start,end,n*1440+bounds[0],n*1440+bounds[1]))return true;
  return false;
}
function limitMinutes(value){
  if(value==='No Time Limit')return Infinity;
  const m=/^(\d+) (Hr|Min)$/.exec(value || '');
  return m ? Number(m[1])*(m[2]==='Hr'?60:1) : null;
}
export function clock(n){const t=n%1440;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
export function evaluate(r,visit){
  const {dow,start,end,vehicle}=visit;
  const blocked=[],verify=[],parts=[];
  if(r.vehicle_type!=='Any Vehicle' && r.vehicle_type!==vehicle)blocked.push(r.vehicle_type+' spaces only.');
  for(const idx of [1,2]){
    const prefix='prohibition_'+idx+'_';const zone=r[prefix+'zone'],time=r[prefix+'time'],day=r[prefix+'days'];
    if(!zone && !time && !day)continue;
    const hit=restriction(dow,start,end,day,time);
    const detail=[zone || 'Posted restriction',day,time].filter(Boolean).join(' · ');
    if(hit)blocked.push(detail); else if(hit===null)verify.push(detail);
  }
  for(const key of ['am_rush_hours','pm_rush_hours']){
    const time=r[key]; if(!time)continue;
    if(restriction(dow,start,end,'7 Days a Week',time)!==false)verify.push('Rush hours '+time+'. Confirm applicable days and curb signs.');
  }
  if(r.prohibition_override==='Yes' || r.time_limit_override==='Yes')verify.push('City record flags a posted override.');
  if(r.flat_rate)verify.push(r.flat_rate+'; conditions are posted at the meter. Hourly estimate shown.');
  if([places[7],places[8]].some(([,lat,lon])=>metres(r.lat,r.lon,lat,lon)<650))verify.push('Near BC Place or Rogers Arena. Confirm posted event rates and stopping restrictions.');
  const motorDiscount=vehicle==='Motorcycle' && r.vehicle_type==='Any Vehicle';
  if(vehicle==='Motorcycle' && r.vehicle_type==='Motorcycle')verify.push('Dedicated motorcycle bay. Confirm the charge in PayByPhone before paying.');
  let cost=0, known=true;
  for(let n=0;n<2;n++){
    const weekday=(dow+n)%7, weekend=weekday===0 || weekday===6, limits=[];
    const dailyPaid=Math.max(0,Math.min(end,n*1440+1320)-Math.max(start,n*1440+540));
    for(const [from,to,suffix] of [[0,540,null],[540,1080,'9am_6pm'],[1080,1320,'6pm_10pm'],[1320,1440,null]]){
      const a=Math.max(start,n*1440+from), b=Math.min(end,n*1440+to);
      if(b<=a)continue;
      const raw=suffix?r['rate_'+suffix]: '$0.00';
      const valid=typeof raw==='string' && /^\$\d+(\.\d+)?$/.test(raw);
      let rate=valid?Number(raw.slice(1)):null;
      if(rate!==null && motorDiscount)rate/=2;
      const label=suffix ? r['time_limit_'+(weekend?'weekend_':'')+suffix] : null;
      parts.push({from:a,to:b,day:days[weekday],rate,limit:label,suffix});
      if(rate===null){known=false;verify.push('Hourly rate missing.');}else cost+=(b-a)*rate/60;
      if(suffix){
        const limit=limitMinutes(label);
        if(limit===null)verify.push('Duration limit missing for '+clock(a)+'–'+clock(b)+'.');
        else if((b-a)>limit)blocked.push('Stay exceeds the '+label+' limit in the '+clock(n*1440+from)+'–'+clock(n*1440+to)+' period.');
        else limits.push(limit);
      }
    }
    if(limits.length && dailyPaid>Math.min(...limits) && !blocked.some(s=>s.startsWith('Stay exceeds'))){
      if(new Set(limits).size===1)blocked.push('Continuous metered stay exceeds the '+Math.min(...limits)+' minute limit.');
      else verify.push('Stay crosses a limit change and exceeds the shorter posted limit. Confirm the continuous-stay limit.');
    }
  }
  return {parts,cost:known?Math.round((cost+Number.EPSILON)*100)/100:null,blocked:[...new Set(blocked)],verify:[...new Set(verify)],state:blocked.length?'excluded':verify.length?'conditional':'priced'};
}
export function selectMeters(records,visit){
  const candidates=records.map(r=>({r,distance:metres(visit.lat,visit.lon,r.lat,r.lon)})).filter(x=>x.distance<=visit.radius);
  const byZone=new Map();
  for(const x of candidates.sort((a,b)=>a.distance-b.distance)){
    const quote=evaluate(x.r,visit);
    const key=JSON.stringify([x.r.mobile_payment_number,x.r.vehicle_type,quote]);
    if(!byZone.has(key))byZone.set(key,{...x,...quote});
  }
  return [...byZone.values()];
}
