import {places,clock,selectMeters} from './model.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text,css)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(css)e.className=css;return e;};
const cash=n=>n==null?'Unknown':'$'+n.toFixed(2);
const stateName={priced:'Priced visit',conditional:'Check the signs',excluded:'Ruled out'};
let records, rows=[], max=12;
for(const [i,[name]] of places.entries())$('place').add(new Option(name,i));
$('place').add(new Option('Enter coordinates…','custom'));
$('place').onchange=()=>{$('custom').hidden=$('place').value!=='custom';};
const minutes=s=>{if(!/^\d{2}:\d{2}$/.test(s))throw Error('Enter arrival and departure times.');const [h,m]=s.split(':').map(Number);return h*60+m;};
function calculate(){
  if(!records)return;
  try{
    let lat,lon;
    if($('place').value==='custom'){
      const pair=$('coords').value.trim().split(/\s*,\s*/);
      if(pair.length!==2 || !pair.every(s=>/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)))throw Error('Enter coordinates as latitude, longitude.');
      [lat,lon]=pair.map(Number);
      if(Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Coordinates are outside the valid range.');
    }else [,lat,lon]=places[Number($('place').value)];
    const start=minutes($('start').value);let end=minutes($('end').value);
    if(end===start)throw Error('Choose different arrival and departure times.');
    if(end<start)end+=1440;
    const dow=new Date($('date').value+'T12:00:00Z').getUTCDay();
    if(!Number.isFinite(dow))throw Error('Choose a valid date.');
    const visit={lat,lon,start,end,dow,radius:Number($('radius').value),vehicle:$('vehicle').value};
    rows=selectMeters(records,visit); max=12;
    const good=rows.filter(r=>r.state==='priced'),min=good.length?Math.min(...good.map(r=>r.cost)):null;
    const summary=$('summary');summary.replaceChildren(node('span','Lowest priced visit','eyebrow'),node('strong',min===null?'No priced visit':cash(min)),node('p',(end-start)+' minutes · '+good.length+' priced options · '+rows.filter(r=>r.state==='conditional').length+' require a sign check · '+rows.filter(r=>r.state==='excluded').length+' ruled out.'));
    $('compare').replaceChildren();
    if($('place').value==='0'){
      const pair=[60223,67682].map(z=>rows.find(r=>r.r.mobile_payment_number===z && r.state==='priced'));
      if(pair.every(Boolean)){
        const [a,b]=pair,box=node('div',null,'receipt');box.append(node('span','Gallery comparison','eyebrow'),node('p','Zone 60223 · '+cash(a.cost)+'     /     Zone 67682 · '+cash(b.cost)),node('b',cash(Math.abs(a.cost-b.cost))+' difference for this visit'));$('compare').append(box);
      }
    }
    $('error').textContent='';render();
  }catch(e){$('error').textContent=e.message;$('summary').textContent='Update your visit to see estimates.';$('compare').replaceChildren();rows=[];render();}
}
function render(){
  const list=$('results');list.replaceChildren();
  const visible=rows.filter(x=>$('status').value==='all' || x.state===$('status').value);
  visible.sort($('sort').value==='cost'?(a,b)=>(a.cost??Infinity)-(b.cost??Infinity)||a.distance-b.distance:(a,b)=>a.distance-b.distance);
  if(!visible.length)list.append(node('p','No matching options. Try a different result group, destination or search distance.'));
  for(const x of visible.slice(0,max)){
    const r=x.r,card=node('details'),head=node('summary'),name=node('span');
    name.append(node('b','Zone '+r.mobile_payment_number),node('small',Math.round(x.distance)+' m · '+r.local_area+' · '+stateName[x.state]));head.append(name,node('strong',x.state==='excluded'?'Ruled out':cash(x.cost)));card.append(head);
    for(const msg of [...x.blocked,...x.verify])card.append(node('p',msg,'reason'));
    card.append(node('p',r.vehicle_type+' · '+r.meter_head+' · Meter '+r.meter_id));
    for(const p of x.parts){const rate=p.rate===null?'Rate unknown':cash(p.rate)+'/h';card.append(node('p',p.day+' '+clock(p.from)+'–'+clock(p.to)+' · '+(p.to-p.from)+' min × '+rate+(p.rate!==null?' = '+cash((p.to-p.from)*p.rate/60):'')+(p.suffix?' · Limit: '+(p.limit || 'unknown'):' · Outside metered hours')));}
    const link=node('a','Open the city source row');link.href='https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parking-meters/records?where='+encodeURIComponent('object_id="'+r.object_id+'"');card.append(link);list.append(card);
  }
  $('more').hidden=max>=visible.length;
}
$('visit').onsubmit=e=>{e.preventDefault();calculate();};$('more').onclick=()=>{max+=12;render();};
for(const k of ['status','sort'])$(k).onchange=()=>{max=12;render();};
try{
  const [data,meta]=await Promise.all(['data','status'].map(async f=>{const r=await fetch('./'+f+'.json');if(!r.ok)throw Error();return r.json();}));
  records=data.rows.map(row=>Object.fromEntries(data.fields.map((k,i)=>[k,row[i]])));
  $('dates').textContent='City dataset updated '+meta.latest+'; retrieved '+meta.retrieved+'. '+meta.count.toLocaleString()+' mappable in-service records across '+meta.zones.toLocaleString()+' payment zones, from '+meta.sourceCount.toLocaleString()+' city rows. Matching rules in the same zone are represented by the nearest point.';
  calculate();
}catch{$('summary').textContent='City data could not be loaded. Reload this page to retry.';}
