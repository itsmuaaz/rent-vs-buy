const Engine = {};

Engine.getTaxRates = function(band) {
    switch(band) {
        case 'basic': return { income: 0.20, cgt: 0.10, div: 0.0875 };
        case 'higher': return { income: 0.40, cgt: 0.20, div: 0.3375 };
        case 'additional': return { income: 0.45, cgt: 0.20, div: 0.3935 };
        default: return { income: 0.45, cgt: 0.20, div: 0.3935 };
    }
};

Engine.calculateStampDuty = function(price, type, isFTB) {
    if (type === 'personal' && isFTB && price <= 625000) return (price <= 425000) ? 0 : (price - 425000) * 0.05;
    const bands = [{limit: 250000, rate: 0.00}, {limit: 925000, rate: 0.05}, {limit: 1500000, rate: 0.10}, {limit: Infinity, rate: 0.12}];
    let tax = 0, rem = price, prev = 0;
    for (const b of bands) {
        let r = b.rate; if (type === 'company' || type === 'additional') r += 0.05;
        let taxable = Math.min(rem, b.limit - prev);
        if (taxable > 0) { tax += taxable * r; rem -= taxable; }
        prev = b.limit; if (rem <= 0) break;
    }
    return tax;
};

Engine.calculateMortgage = function(principal, rate, years) {
    const r = rate / 1200; const n = years * 12;
    if (r === 0) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

Engine.simulateStrategies = function(V) {
    const isStockCrash = V.isStockCrash || false;
    const isPropCrash = V.isPropCrash || false;
    const rates = Engine.getTaxRates(V.taxBand), years = 40, depositAmount = V.price * V.depositPct, legal = 2000, totalMonthlyBudget = V.monthlySavings + V.rent;
    
    const getNW = (isa, gia, basis, houseV, debt, cashCo=0) => {
        const gain = Math.max(0, gia - basis);
        return isa + (gia - gain * rates.cgt) + (houseV - debt) + cashCo * (1 - rates.div);
    };
    const getLiq = (isa, gia, basis, cashCo=0) => {
        const gain = Math.max(0, gia - basis);
        return isa + (gia - gain * rates.cgt) + cashCo * (1 - rates.div);
    };

    const initStrat = (name) => ({ name, netWorth: [], deadMoney: [], liquidHistory: [] });
    let sA = initStrat("Rent & Invest"), isaA = V.isa, giaA = V.liquid - V.isa, basisA = giaA, deadA = 0;
    
    let sB = initStrat("Buy & Live In"), possibleB = (depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno) <= V.liquid;
    let isaB = V.isa, giaB = V.liquid - V.isa, basisB, debtB, houseB, deadB_c = 0;
    if (possibleB) {
        let cost = depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno;
        if (giaB >= cost) giaB -= cost; else { cost -= giaB; giaB = 0; isaB -= cost; }
        basisB = giaB; debtB = V.price - depositAmount; houseB = V.reno > 0 ? V.postValue : V.price;
    }
    let sC = initStrat("Buy + Lodger"), possibleC = possibleB, isaC = isaB, giaC = giaB, basisC = basisB, debtC = debtB, houseC = houseB, deadC_c = 0;
    
    let sD = initStrat("Co. BTL + Rent"), possibleD = (depositAmount + Engine.calculateStampDuty(V.price, 'company', false) + legal + V.reno) <= V.liquid;
    let isaD = V.isa, giaD = V.liquid - V.isa, basisD, debtD, houseD, coCashD = 0, deadD_c = 0;
    if (possibleD) {
        let cost = depositAmount + Engine.calculateStampDuty(V.price, 'company', false) + legal + V.reno;
        if (giaD >= cost) giaD -= cost; else { cost -= giaD; giaD = 0; isaD -= cost; }
        basisD = giaD; debtD = V.price - depositAmount; houseD = V.reno > 0 ? V.postValue : V.price;
    }
    let sE = initStrat("Personal BTL"), possibleE = (depositAmount + Engine.calculateStampDuty(V.price, 'additional', false) + legal + V.reno) <= V.liquid;
    let isaE = V.isa, giaE = V.liquid - V.isa, basisE, debtE, houseE, deadE_c = 0;
    if (possibleE) {
        let cost = depositAmount + Engine.calculateStampDuty(V.price, 'additional', false) + legal + V.reno;
        if (giaE >= cost) giaE -= cost; else { cost -= giaE; giaE = 0; isaE -= cost; }
        basisE = giaE; debtE = V.price - depositAmount; houseE = V.reno > 0 ? V.postValue : V.price;
    }
    let sF = initStrat("Home + Co. BTL"), possibleF = possibleB && (V.liquid - (depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno)) >= (depositAmount + Engine.calculateStampDuty(V.price, 'company', false) + legal);
    let isaF = V.isa, giaF = V.liquid - V.isa, basisF, dF1, hF1, dF2, hF2, coCashF = 0, deadF_c = 0;
    if (possibleF) {
        let c1 = depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno;
        let c2 = Engine.calculateStampDuty(V.price, 'company', false) + depositAmount + legal; // Corrected order slightly for readability but math is same
        let cost = c1 + c2;
        if (giaF >= cost) giaF -= cost; else { cost -= giaF; giaF = 0; isaF -= cost; }
        basisF = giaF; dF1 = V.price - depositAmount; hF1 = V.reno > 0 ? V.postValue : V.price; dF2 = V.price - depositAmount; hF2 = V.price;
    }

    const pB = Engine.calculateMortgage(debtB||0, V.rateP, V.term), pD = Engine.calculateMortgage(debtD||0, V.rateC, V.term), pE = Engine.calculateMortgage(debtE||0, V.rateC, V.term), pF1 = Engine.calculateMortgage(dF1||0, V.rateP, V.term), pF2 = Engine.calculateMortgage(dF2||0, V.rateC, V.term);

    for (let y = 1; y <= years; y++) {
        let stockM = (1 + V.stockGrowth / 12), propG = 1.03;
        if (y === 1) { if (isStockCrash) stockM = Math.pow(0.7, 1/12); if (isPropCrash) propG = 0.85; }
        let rentY = V.rent * Math.pow(1 + V.rentInf, y - 1);
        for (let m = 1; m <= 12; m++) {
            const invest = (sur, isa, gia, basis) => {
                if (sur > 0) { let toISA = Math.min(sur, 20000/12); let toGIA = Math.max(0, sur - toISA); return [ (isa + toISA)*stockM, (gia + toGIA)*stockM, basis + toGIA ]; }
                else { let n = -sur; if (gia >= n) return [ isa*stockM, (gia-n)*stockM, basis-n ]; else return [ Math.max(0, isa-(n-gia))*stockM, 0, 0 ]; }
            };
            [isaA, giaA, basisA] = invest(totalMonthlyBudget - rentY, isaA, giaA, basisA);
            if (possibleB) { let i = debtB*(V.rateP/1200); debtB -= (pB-i); deadB_c += (i + houseB*0.01/12); [isaB, giaB, basisB] = invest(totalMonthlyBudget - (pB + houseB*0.01/12), isaB, giaB, basisB); }
            if (possibleC) { let i = debtC*(V.rateP/1200); debtC -= (pB-i); let l = (y<=V.lodgerYears)?V.lodgerInc:0; let netL = l - Math.max(0, (l*12>7500?(l-7500/12)*rates.income:0)); deadC_c += (i + houseC*0.01/12 - netL); [isaC, giaC, basisC] = invest(totalMonthlyBudget - (pB + houseC*0.01/12 - netL), isaC, giaC, basisC); }
            if (possibleD) { let i = debtD*(V.rateC/1200); debtD -= (pD-i); let btlR = houseD*0.05/12, prof = btlR-(i+houseD*0.01/12), tax = Math.max(0, prof*0.25); coCashD += (prof-tax); deadD_c += (rentY + i + houseD*0.01/12 + tax - btlR); [isaD, giaD, basisD] = invest(totalMonthlyBudget - rentY, isaD, giaD, basisD); }
            if (possibleE) { let i = debtE*(V.rateC/1200); debtE -= (pE-i); let btlR = houseE*0.05/12, prof = btlR-houseE*0.01/12, tax = Math.max(0, prof*rates.income-i*0.2); coCashD += 0; deadE_c += (rentY + i + houseE*0.01/12 + tax - btlR); [isaE, giaE, basisE] = invest(totalMonthlyBudget - rentY + (btlR-i-houseE*0.01/12-tax), isaE, giaE, basisE); }
            if (possibleF) { let i1 = dF1*(V.rateP/1200); dF1 -= (pF1-i1); let i2 = dF2*(V.rateC/1200); dF2 -= (pF2-i2); let btlR = hF2*0.05/12, btlP = btlR-(i2+hF2*0.01/12), btlT = Math.max(0, btlP*0.25); coCashF += (btlP-btlT); deadF_c += (i1 + hF1*0.01/12 + i2 + hF2*0.01/12 + btlT - btlR); [isaF, giaF, basisF] = invest(totalMonthlyBudget - (pF1+hF1*0.01/12), isaF, giaF, basisF); }
        }
        deadA += (rentY * 12); if (possibleB) houseB *= propG; if (possibleC) houseC *= propG; if (possibleD) houseD *= propG; if (possibleE) houseE *= propG; if (possibleF) { hF1 *= propG; hF2 *= propG; }
        sA.netWorth.push(getNW(isaA, giaA, basisA, 0, 0)); sA.liquidHistory.push(getLiq(isaA, giaA, basisA)); sA.deadMoney.push(deadA);
        if (possibleB) { sB.netWorth.push(getNW(isaB, giaB, basisB, houseB, debtB)); sB.liquidHistory.push(getLiq(isaB, giaB, basisB)); sB.deadMoney.push(deadB_c + (y===1?(depositAmount+Engine.calculateStampDuty(V.price,'personal',V.isFTB)+legal):0)); } else { sB.netWorth.push(0); sB.liquidHistory.push(0); sB.deadMoney.push(0); }
        if (possibleC) { sC.netWorth.push(getNW(isaC, giaC, basisC, houseC, debtC)); sC.liquidHistory.push(getLiq(isaC, giaC, basisC)); sC.deadMoney.push(deadC_c + (y===1?(depositAmount+Engine.calculateStampDuty(V.price,'personal',V.isFTB)+legal):0)); } else { sC.netWorth.push(0); sC.liquidHistory.push(0); sC.deadMoney.push(0); }
        if (possibleD) { sD.netWorth.push(getNW(isaD, giaD, basisD, houseD, debtD, coCashD)); sD.liquidHistory.push(getLiq(isaD, giaD, basisD, coCashD)); sD.deadMoney.push(deadD_c + (y===1?(depositAmount+Engine.calculateStampDuty(V.price,'company',false)+legal):0)); } else { sD.netWorth.push(0); sD.liquidHistory.push(0); sD.deadMoney.push(0); }
        if (possibleE) { sE.netWorth.push(getNW(isaE, giaE, basisE, houseE, debtE)); sE.liquidHistory.push(getLiq(isaE, giaE, basisE)); sE.deadMoney.push(deadE_c + (y===1?(depositAmount+Engine.calculateStampDuty(V.price,'additional',false)+legal):0)); } else { sE.netWorth.push(0); sE.liquidHistory.push(0); sE.deadMoney.push(0); }
        if (possibleF) { sF.netWorth.push(getNW(isaF, giaF, basisF, hF1+hF2, dF1+dF2, coCashF)); sF.liquidHistory.push(getLiq(isaF, giaF, basisF, coCashF)); sF.deadMoney.push(deadF_c + (y===1?(2*depositAmount+Engine.calculateStampDuty(V.price,'personal',V.isFTB)+Engine.calculateStampDuty(V.price,'company',false)+2*legal):0)); } else { sF.netWorth.push(0); sF.liquidHistory.push(0); sF.deadMoney.push(0); }
    }
    const be = {B:null, C:null, D:null, E:null, F:null};
    for (let i=0; i<years; i++) {
        let r = sA.netWorth[i];
        if (possibleB && !be.B && sB.netWorth[i] > r) be.B = i+1; if (possibleC && !be.C && sC.netWorth[i] > r) be.C = i+1;
        if (possibleD && !be.D && sD.netWorth[i] > r) be.D = i+1; if (possibleE && !be.E && sE.netWorth[i] > r) be.E = i+1;
        if (possibleF && !be.F && sF.netWorth[i] > r) be.F = i+1;
    }
    return { stratA:sA, stratB:sB, stratC:sC, stratD:sD, stratE:sE, stratF:sF, possibleB, possibleD, possibleE, possibleF, be };
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
} else {
    window.Engine = Engine;
}