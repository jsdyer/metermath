import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluate,selectMeters,places} from '../web/model.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('./gallery-2026-11-16.json',import.meta.url)));
const visit={dow:5,start:1050,end:1140,vehicle:'Any Vehicle',lat:places[0][1],lon:places[0][2],radius:500};
const r=rows.find(r=>r.mobile_payment_number===60223);
test('Gallery visit splits at 6 p.m.',()=>{
 const options=selectMeters(rows,visit);
 assert.equal(options.find(o=>o.r.mobile_payment_number===60223).cost,7.25);
 assert.equal(options.find(o=>o.r.mobile_payment_number===67682).cost,3);
 assert.equal(evaluate(r,visit).state,'priced');
});
test('Vehicle, known time limit and overnight prohibition exclusions',()=>{
 assert.equal(evaluate({...r,vehicle_type:'Motorcycle'},visit).state,'excluded');
 assert.equal(evaluate(r,{...visit,start:540,end:750}).state,'excluded');
 const p={...r,prohibition_1_days:'Mon-Fri',prohibition_1_time:'6:00pm to 2:00am',prohibition_1_zone:'NO STOPPING'};
 assert.equal(evaluate(p,{...visit,dow:6,start:30,end:110}).state,'excluded');
 assert.equal(evaluate(p,{...visit,dow:6,start:121,end:150}).state,'priced');
});
test('Unknown limits, rush, event area and flat rates require signs',()=>{
 for(const extra of [{time_limit_9am_6pm:null},{pm_rush_hours:'3:00pm to 6:00pm'},{flat_rate:'$10.00 flat rate option'},{lat:places[7][1],lon:places[7][2]}])
  assert.equal(evaluate({...r,...extra},visit).state,'conditional');
});
test('Metered hours, payment method and weekends',()=>{
 assert.equal(evaluate(r,{...visit,start:1310,end:1510}).cost,.67);
 assert.equal(evaluate(r,{...visit,vehicle:'Motorcycle'}).cost,3.63);
 assert.equal(evaluate({...r,time_limit_weekend_9am_6pm:'30 Min'},{...visit,dow:0,start:540,end:600}).state,'excluded');
});
