const Engine = {};

Engine.getTaxRates = function(band) {
    switch(band) {
        case 'basic': return { income: 0.20, cgt: 0.10, div: 0.0875, corp: 0.19 }; // Corp tax small profits
        case 'higher': return { income: 0.40, cgt: 0.20, div: 0.3375, corp: 0.25 };
        case 'additional': return { income: 0.45, cgt: 0.20, div: 0.3935, corp: 0.25 };
        default: return { income: 0.45, cgt: 0.20, div: 0.3935, corp: 0.25 };
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
    const maintRate = (V.maintenanceRate !== undefined) ? V.maintenanceRate / 100 : 0.01;
    const buyingCost = (V.buyingCost !== undefined) ? V.buyingCost : 2000;
    const sellCostPct = (V.sellingCostPct !== undefined) ? V.sellingCostPct / 100 : 0.015;

    const rates = Engine.getTaxRates(V.taxBand), years = 40, depositAmount = V.price * V.depositPct, legal = buyingCost, totalMonthlyBudget = V.monthlySavings + V.rent;
    const propBasis = V.price + buyingCost + V.reno;

    const getExitVal = (isa, gia, giaBasis, houseV, debt, type, cashCo=0) => {
        const stockGross = isa + gia;
        const propGross = Math.max(0, houseV - debt);
        const coGross = cashCo;
        const gross = stockGross + propGross + coGross;

        const stockGain = Math.max(0, gia - giaBasis);
        const stockLiquid = isa + (gia - stockGain * rates.cgt);

        let propLiquid = 0;
        let coLiquid = 0;

        if (type === 'company') {
            const sellFee = houseV * sellCostPct;
            let proceeds = Math.max(0, houseV - sellFee - debt);
            const gain = (houseV - sellFee) - propBasis; 
            if (gain > 0) {
                const corpTax = gain * rates.corp;
                proceeds -= corpTax;
            }
            const totalCoCash = proceeds + cashCo;
            coLiquid = Math.max(0, totalCoCash * (1 - rates.div));
        } else {
            if (houseV > 0) {
                const sellFee = houseV * sellCostPct;
                let proceeds = Math.max(0, houseV - sellFee - debt);
                if (type === 'btl') {
                    const gain = (houseV - sellFee) - propBasis;
                    if (gain > 0) proceeds -= (gain * rates.cgt);
                }
                propLiquid = proceeds;
            }
        }

        const liquid = stockLiquid + propLiquid + coLiquid;
        return { gross, liquid };
    };
    
    const getLiqHist = (isa, gia, cashCo=0) => isa + gia + cashCo * (1 - rates.div);

    const initStrat = (name) => ({ name, netWorth: [], netWorthLiquid: [], deadMoney: [], liquidHistory: [], totalInterest: [] });
    
    let sA = initStrat("Rent & Invest"), isaA = V.isa, giaA = V.liquid - V.isa, basisA = giaA, deadA = 0;
    
    let sB = initStrat("Buy & Live In"), possibleB = (depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno) <= V.liquid;
    let isaB = V.isa, giaB = V.liquid - V.isa, basisB, debtB, houseB, deadB_c = 0, intB = 0;
    if (possibleB) {
        let cost = depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno;
        if (giaB >= cost) giaB -= cost; else { cost -= giaB; giaB = 0; isaB -= cost; }
        basisB = giaB; debtB = V.price - depositAmount; houseB = V.reno > 0 ? V.postValue : V.price;
    }

    let sC = initStrat("Buy + Lodger"), possibleC = possibleB, isaC = isaB, giaC = giaB, basisC = basisB, debtC = debtB, houseC = houseB, deadC_c = 0, intC = 0;
    
    let sD = initStrat("Co. BTL + Rent"), possibleD = (depositAmount + Engine.calculateStampDuty(V.price, 'company', false) + legal + V.reno) <= V.liquid;
    let isaD = V.isa, giaD = V.liquid - V.isa, basisD, debtD, houseD, coCashD = 0, deadD_c = 0, intD = 0;
    if (possibleD) {
        let cost = depositAmount + Engine.calculateStampDuty(V.price, 'company', false) + legal + V.reno;
        if (giaD >= cost) giaD -= cost; else { cost -= giaD; giaD = 0; isaD -= cost; }
        basisD = giaD; debtD = V.price - depositAmount; houseD = V.reno > 0 ? V.postValue : V.price;
    }

    let sE = initStrat("Personal BTL"), possibleE = (depositAmount + Engine.calculateStampDuty(V.price, 'additional', false) + legal + V.reno) <= V.liquid;
    let isaE = V.isa, giaE = V.liquid - V.isa, basisE, debtE, houseE, deadE_c = 0, intE = 0;
    if (possibleE) {
        let cost = depositAmount + Engine.calculateStampDuty(V.price, 'additional', false) + legal + V.reno;
        if (giaE >= cost) giaE -= cost; else { cost -= giaE; giaE = 0; isaE -= cost; }
        basisE = giaE; debtE = V.price - depositAmount; houseE = V.reno > 0 ? V.postValue : V.price;
    }

    let sF = initStrat("Home + Co. BTL"), possibleF = possibleB && (V.liquid - (depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno)) >= (depositAmount + Engine.calculateStampDuty(V.price, 'company', false) + legal);
    let isaF = V.isa, giaF = V.liquid - V.isa, basisF, dF1, hF1, dF2, hF2, coCashF = 0, deadF_c = 0, intF = 0;
    if (possibleF) {
        let c1 = depositAmount + Engine.calculateStampDuty(V.price, 'personal', V.isFTB) + legal + V.reno;
        let c2 = Engine.calculateStampDuty(V.price, 'company', false) + depositAmount + legal;
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
            
            if (possibleB) { 
                let i = debtB*(V.rateP/1200); 
                intB += i;
                debtB -= (pB-i); 
                let maint = houseB*maintRate/12; 
                deadB_c += (i + maint); 
                [isaB, giaB, basisB] = invest(totalMonthlyBudget - (pB + maint), isaB, giaB, basisB); 
            }
            if (possibleC) { 
                let i = debtC*(V.rateP/1200); 
                intC += i;
                debtC -= (pB-i); 
                let maint = houseC*maintRate/12; 
                let l = (y<=V.lodgerYears)?V.lodgerInc:0; 
                let netL = l - Math.max(0, (l*12>7500?(l-7500/12)*rates.income:0)); 
                deadC_c += (i + maint - netL); 
                [isaC, giaC, basisC] = invest(totalMonthlyBudget - (pB + maint - netL), isaC, giaC, basisC); 
            }
            if (possibleD) { 
                let i = debtD*(V.rateC/1200); 
                intD += i;
                debtD -= (pD-i); 
                let maint = houseD*maintRate/12; 
                let btlR = houseD*0.05/12, prof = btlR-(i+maint), tax = Math.max(0, prof*0.25); 
                coCashD += (prof-tax); 
                deadD_c += (rentY + i + maint + tax - btlR); 
                [isaD, giaD, basisD] = invest(totalMonthlyBudget - rentY, isaD, giaD, basisD); 
            }
            if (possibleE) { 
                let i = debtE*(V.rateC/1200); 
                intE += i;
                debtE -= (pE-i); 
                let maint = houseE*maintRate/12; 
                let btlR = houseE*0.05/12, prof = btlR-maint, tax = Math.max(0, prof*rates.income-i*0.2); 
                coCashD += 0; 
                deadE_c += (rentY + i + maint + tax - btlR); 
                [isaE, giaE, basisE] = invest(totalMonthlyBudget - rentY + (btlR-i-maint-tax), isaE, giaE, basisE); 
            }
            if (possibleF) { 
                let i1 = dF1*(V.rateP/1200); dF1 -= (pF1-i1); 
                let i2 = dF2*(V.rateC/1200); dF2 -= (pF2-i2); 
                intF += (i1 + i2);
                let m1 = hF1*maintRate/12, m2 = hF2*maintRate/12; 
                let btlR = hF2*0.05/12, btlP = btlR-(i2+m2), btlT = Math.max(0, btlP*0.25); 
                coCashF += (btlP-btlT); 
                deadF_c += (i1 + m1 + i2 + m2 + btlT - btlR); 
                [isaF, giaF, basisF] = invest(totalMonthlyBudget - (pF1+m1), isaF, giaF, basisF); 
            }
        }
        deadA += (rentY * 12); if (possibleB) houseB *= propG; if (possibleC) houseC *= propG; if (possibleD) houseD *= propG; if (possibleE) houseE *= propG; if (possibleF) { hF1 *= propG; hF2 *= propG; }
        
        // Push Results
        const resA = getExitVal(isaA, giaA, basisA, 0, 0, 'none');
        sA.netWorth.push(resA.gross); sA.netWorthLiquid.push(resA.liquid); sA.liquidHistory.push(getLiqHist(isaA, giaA)); sA.deadMoney.push(deadA); sA.totalInterest.push(0);

        const pushStrat = (s, possible, isa, gia, basis, h, d, type, co=0, dead, int) => {
            if (possible) {
                const res = getExitVal(isa, gia, basis, h, d, type, co);
                s.netWorth.push(res.gross); s.netWorthLiquid.push(res.liquid);
                s.liquidHistory.push(getLiqHist(isa, gia, co));
                s.deadMoney.push(dead + (y===1?depositAmount+Engine.calculateStampDuty(V.price,type==='company'?'company':(type==='btl'?'additional':'personal'),type==='home'?V.isFTB:false)+legal:0));
                s.totalInterest.push(int);
            } else { s.netWorth.push(0); s.netWorthLiquid.push(0); s.liquidHistory.push(0); s.deadMoney.push(0); s.totalInterest.push(0); }
        };
        
        pushStrat(sB, possibleB, isaB, giaB, basisB, houseB, debtB, 'home', 0, deadB_c, intB);
        pushStrat(sC, possibleC, isaC, giaC, basisC, houseC, debtC, 'home', 0, deadC_c, intC);
        pushStrat(sD, possibleD, isaD, giaD, basisD, houseD, debtD, 'company', coCashD, deadD_c, intD);
        pushStrat(sE, possibleE, isaE, giaE, basisE, houseE, debtE, 'btl', 0, deadE_c, intE);
        
        // Strat F
        if (possibleF) {
            const stockGross = isaF + giaF;
            const stockGain = Math.max(0, giaF - basisF);
            const stockLiquid = isaF + (giaF - stockGain * rates.cgt);
            const homeSellFee = hF1 * sellCostPct;
            const homeGross = Math.max(0, hF1 - dF1);
            const homeLiquid = Math.max(0, hF1 - homeSellFee - dF1); 
            const coSellFee = hF2 * sellCostPct;
            const coGross = Math.max(0, hF2 - dF2) + coCashF;
            let coProceeds = Math.max(0, hF2 - coSellFee - dF2);
            const coGain = (hF2 - coSellFee) - propBasis; 
            if (coGain > 0) coProceeds -= (coGain * rates.corp);
            const coLiquid = Math.max(0, (coProceeds + coCashF) * (1 - rates.div));
            
            sF.netWorth.push(stockGross + homeGross + coGross);
            sF.netWorthLiquid.push(stockLiquid + homeLiquid + coLiquid);
            sF.liquidHistory.push(getLiqHist(isaF, giaF, coCashF));
            sF.deadMoney.push(deadF_c + (y===1?(2*depositAmount+Engine.calculateStampDuty(V.price,'personal',V.isFTB)+Engine.calculateStampDuty(V.price,'company',false)+2*legal):0));
            sF.totalInterest.push(intF);
        } else { sF.netWorth.push(0); sF.netWorthLiquid.push(0); sF.liquidHistory.push(0); sF.deadMoney.push(0); sF.totalInterest.push(0); }
    }
    
    const be = {B:null, C:null, D:null, E:null, F:null};
    for (let i=0; i<years; i++) {
        let r = sA.netWorthLiquid[i]; 
        if (possibleB && !be.B && sB.netWorthLiquid[i] > r) be.B = i+1; 
        if (possibleC && !be.C && sC.netWorthLiquid[i] > r) be.C = i+1;
        if (possibleD && !be.D && sD.netWorthLiquid[i] > r) be.D = i+1; 
        if (possibleE && !be.E && sE.netWorthLiquid[i] > r) be.E = i+1;
        if (possibleF && !be.F && sF.netWorthLiquid[i] > r) be.F = i+1;
    }
    return { stratA:sA, stratB:sB, stratC:sC, stratD:sD, stratE:sE, stratF:sF, possibleB, possibleD, possibleE, possibleF, be };
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
} else {
    window.Engine = Engine;
}
