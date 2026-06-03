// 離線驗證候選範本:用 index.html 的核心引擎跑蒙地卡羅 + 歷史重抽,輸出每組指標。
// 用法: node tests/run_presets.js
const fs = require('fs');
const path = require('path');

// ---- 1. 抽出 index.html 的 <script> 核心,注入可控 mock DOM ----
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
let code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
code = code.substring(0, code.indexOf('buildWeights();')); // 切掉 init(含 DOM 啟動)
code = code.replace(/const \$=id=>document\.getElementById\(id\);/, '// $ injected');
code = code.replace(/"use strict";/, '');

const GV = { qldfin: '4', voldrag: '1.5', carry: '3' }; // mock 表單預設(getFin/getVolDrag 會讀到)
const mock = `
const GV = ${JSON.stringify(GV)};
const $ = (id) => ({ get value(){return id in GV?GV[id]:'0';}, set value(v){GV[id]=v;},
  textContent:'', innerHTML:'', style:{}, classList:{add(){},remove(){},toggle(){}},
  querySelector:()=>({innerHTML:'',getContext:()=>fakeCtx}), querySelectorAll:()=>[],
  addEventListener(){}, getContext:()=>fakeCtx });
const fakeCtx = new Proxy({}, { get:()=>()=>{} });
const document = { getElementById:$, querySelector:()=>null, querySelectorAll:()=>[],
  createElement:()=>({innerHTML:'',style:{},appendChild(){},querySelector:()=>({})}), addEventListener(){} };
const window = { addEventListener(){}, devicePixelRatio:1, scrollTo(){} };
const localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
const sessionStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
const location = { reload(){} }; const navigator = { language:'zh-TW' };
`;
const exportsLine = '\nmodule.exports = { simulate, milestones, percentile, impliedCAGR, assetDefs, netExposure, blendedMuNom, ORDER, fracGE };\n';
const tmp = path.join(__dirname, '_presetcore.js');
fs.writeFileSync(tmp, mock + code + exportsLine);
const core = require('./_presetcore.js');
const { simulate, milestones, percentile, impliedCAGR, assetDefs, netExposure, blendedMuNom, ORDER, fracGE } = core;

// ---- 2. 代表性使用者(累積期) ----
const P = { age0:35, retire:65, net0:50, mon:1, exp:35, pension:0, infl:0.02, swr:0.035 };
P.maxAge = P.retire; // 只跑累積期→回撤=純市場崩盤深度(不含退休提領掏空)
P.annualContrib = P.mon*12;
P.withdraw = Math.max(0, P.exp - P.pension);
P.fireNum = Math.max(0, (P.exp-P.pension))/P.swr; // 1000 萬
P.yrs = P.retire - P.age0;
const PATHS = 3000;
const VOLDRAG = 0.015, QLDFIN = 0.04;

// ---- 3. 候選網格(權重 %)+ 每組策略開關;用實測回撤反推級距 ----
const L = {mech:'rebal',glide:0,glideStart:45,dca:0};          // 無槓桿:純再平衡
const M = {mech:'both', glide:1,glideStart:45,dca:12};         // 槓桿:再平衡+加碼+降槓+分批
const H = {mech:'both', glide:1,glideStart:45,dca:24};
const PRESETS = [
  // 🇹🇼 台股族(核心0050、槓桿正二)
  {id:'TWa',fam:'TW',w:{TW50:30,CASH:60,BOND:10},...L},
  {id:'TWb',fam:'TW',w:{TW50:45,CASH:45,BOND:10},...L},
  {id:'TWc',fam:'TW',w:{TW50:35,L2:20,CASH:45},...M},
  {id:'TWd',fam:'TW',w:{TW50:35,L2:30,CASH:35},...M},
  {id:'TWe',fam:'TW',w:{TW50:30,L2:40,CASH:30},...M},
  {id:'TWf',fam:'TW',w:{TW50:25,L2:50,CASH:25},...H},
  {id:'TWg',fam:'TW',w:{TW50:30,CASH:40,BOND:30},...L}, // 守成候選
  // 🌐 美股族(核心VT/VTI、槓桿QLD)
  {id:'USa',fam:'US',w:{VT:35,CASH:55,BOND:10},...L},
  {id:'USb',fam:'US',w:{VT:50,CASH:40,BOND:10},...L},
  {id:'USc',fam:'US',w:{VTI:35,QLD:20,CASH:45},...M},
  {id:'USd',fam:'US',w:{VTI:35,QLD:30,CASH:35},...M},
  {id:'USe',fam:'US',w:{VTI:30,QLD:40,CASH:30},...M},
  {id:'USf',fam:'US',w:{VTI:25,QLD:50,CASH:25},...H},
  {id:'USg',fam:'US',w:{VT:35,CASH:35,BOND:30},...L}, // 守成候選
];

function toW(wp){ const w={}; ORDER.forEach(k=>w[k]=(wp[k]||0)/100); return w; }
function run(preset, engine, carryDrag){
  const w = toW(preset.w);
  const defs = assetDefs(carryDrag, VOLDRAG);
  const opts = { age0:P.age0, maxAge:P.maxAge, retire:P.retire, annualContrib:P.annualContrib,
    infl:P.infl, paths:PATHS, net0:P.net0, blendedReal:blendedMuNom(w,defs)-P.infl,
    dcaMonths:preset.dca, dcaTranches:preset.dca>0?preset.dca:1, glide:preset.glide, glideStart:preset.glideStart,
    mech:preset.mech, withdraw:P.withdraw, flexWithdraw:true, engine,
    volDrag:VOLDRAG, carryDrag, qldFin:QLDFIN };
  const sim = simulate(w, defs, opts);
  const ms = milestones(sim, opts, P.fireNum);
  const medRetire = percentile(sim.VatRetire, 0.5);
  const ddMed = percentile(sim.maxDDarr, 0.5);
  const cagr = P.yrs>0 ? impliedCAGR(P.net0, P.annualContrib, P.yrs, medRetire) : null;
  return {
    netExp: netExposure(w),
    coast: ms.coastAge, fire: ms.fireAge,
    pFire: fracGE(sim.VatRetire, P.fireNum),
    survive: sim.survive.reduce((a,b)=>a+b,0)/sim.survive.length,
    med: medRetire, p10: percentile(sim.VatRetire,0.10),
    ddMed, ddP90: percentile(sim.maxDDarr,0.9),
    cagr, calmar: (cagr!=null&&ddMed>1e-6)?cagr/ddMed:null,
  };
}

// ---- 4. 輸出 ----
const pct = v => v==null?'  —  ':(v*100).toFixed(0).padStart(3)+'%';
const num = v => v==null?'  — ':Math.round(v).toString().padStart(5);
const cal = v => v==null?' — ':v.toFixed(2);
const age = v => v==null?'未達':(v+'歲');
function header(title){
  console.log('\n'+title);
  console.log('範本  淨曝險 Coast Full  達標 │ 退休中位 P10   回撤中位 回撤P90 │ 年化 Calmar');
}
function line(p, r){
  console.log(
    p.id.padEnd(4)+' '+pct(r.netExp)+'  '+age(r.coast).padStart(4)+' '+age(r.fire).padStart(4)+
    '  '+pct(r.pFire)+' │ '+num(r.med)+' '+num(r.p10)+'  '+
    pct(r.ddMed)+'   '+pct(r.ddP90)+'  │ '+pct(r.cagr)+' '+cal(r.calmar));
}

console.log(`使用者:35→65歲, 現有 ${P.net0}萬, 月投 ${P.mon}萬, 年支出 ${P.exp}萬, FIRE目標 ${Math.round(P.fireNum)}萬 | paths=${PATHS} | 逆價差+3% QLD融資+4%`);
['param','hist'].forEach(engine=>{
  const eName = engine==='param'?'參數化抽樣':'歷史重抽';
  header(`【${eName}】🇹🇼 台股族`);
  PRESETS.filter(p=>p.fam==='TW').forEach(p=>line(p, run(p, engine, 0.03)));
  header(`【${eName}】🌐 美股/全球族`);
  PRESETS.filter(p=>p.fam==='US').forEach(p=>line(p, run(p, engine, 0.03)));
});
fs.unlinkSync(tmp);
