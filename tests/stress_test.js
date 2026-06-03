/**
 * Coast FIRE 規劃器 - 獨立邏輯壓力測試
 * 使用方式：
 * 1. node tests/extract_logic.js (先提取最新邏輯)
 * 2. node tests/stress_test.js (執行測試)
 */

const { simulate, milestones, assetDefs, percentile } = require('./temp_test_core.js');

const ORDER = ['VT', 'VTI', 'VOO', 'TW50', 'QQQ', 'L2', 'QLD', 'CASH', 'BOND', 'GOLD'];

function runTest(name, inputs) {
    console.log(`\n=== Scenario: ${name} ===`);

    const volDrag = 0.015; 
    const carryDrag = inputs.carryDrag || 0.03;
    const defs = assetDefs(carryDrag, volDrag); 
    
    const w = {};
    ORDER.forEach(k => w[k] = inputs.weights[k] || 0);
    
    const opts = {
        age0: inputs.age,
        maxAge: 90,
        retire: inputs.retire,
        annualContrib: inputs.mon * 12,
        infl: inputs.infl,
        paths: inputs.paths || 2000, 
        net0: inputs.net,
        blendedReal: 0, 
        dcaMonths: 0,
        dcaTranches: 1,
        glide: 0,
        withdraw: inputs.exp - inputs.pension,
        flexWithdraw: false,
        engine: 'param'
    };

    // Calculate blended real return
    let m = 0, tot = 0;
    ORDER.forEach(k => {
        m += w[k] * defs[k].muNom;
        tot += w[k];
    });
    opts.blendedReal = (m / tot) - inputs.infl;

    const sim = simulate(w, defs, opts);
    const fireNum = (inputs.exp - inputs.pension) / inputs.swr;
    const ms = milestones(sim, opts, fireNum);

    const medAtRetire = percentile(sim.VatRetire, 0.5);
    
    // Independent Math Verification
    const years = inputs.retire - inputs.age;
    const r = opts.blendedReal;
    const C = inputs.mon * 12;
    const V0 = inputs.net;
    let expectedV;
    if (Math.abs(r) < 1e-9) {
        expectedV = V0 + C * years;
    } else {
        expectedV = V0 * Math.pow(1+r, years) + C * (Math.pow(1+r, years) - 1) / r;
    }

    console.log(`[Input] Real Return: ${(r*100).toFixed(2)}% | Net: ${V0}萬 | Monthly: ${inputs.mon}萬`);
    console.log(`[Result] FIRE Target: ${fireNum.toFixed(2)}萬`);
    console.log(`[Result] Median at Retire: ${medAtRetire.toFixed(2)}萬`);
    console.log(`[Result] Coast FIRE Age: ${ms.coastAge || '未達成'}`);
    
    const diff = Math.abs(expectedV - medAtRetire) / expectedV;
    if (diff < 0.15) {
        console.log('✅ Pass: Sim result aligns with manual math.');
    } else {
        console.log('❌ Fail: High deviation detected!');
    }
}

// ---------------------------------------------------------
// 執行各項測試
// ---------------------------------------------------------

// 1. 標準 100% VOO 案例
runTest('Standard 100% VOO', {
    age: 30, retire: 65, net: 100, mon: 2, exp: 40, pension: 0, infl: 0.02, swr: 0.04, weights: { VOO: 1 }
});

// 2. 使用者回報 2 歲案例 (Mon=0)
runTest('User Case (Age 2, Mon=0)', {
    age: 2, retire: 65, net: 30, mon: 0, exp: 35, pension: 0, infl: 0.02, swr: 0.035, weights: { VOO: 1 }
});

// 3. 高槓桿 (100% L2) 與波動損耗
runTest('High Leverage (100% L2)', {
    age: 30, retire: 65, net: 100, mon: 2, exp: 40, pension: 0, infl: 0.02, swr: 0.04, weights: { L2: 1 }
});

// 4. 高通膨環境
runTest('High Inflation (15%)', {
    age: 30, retire: 65, net: 1000, mon: 10, exp: 40, pension: 0, infl: 0.15, swr: 0.04, weights: { VOO: 1 }
});
