const Engine = {};

Engine.getTaxRates = function(band) {
    switch(band) {
        case 'basic': return { income: 0.20, cgt: 0.10, div: 0.0875, corp: 0.19 };
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
    // Destructure Input Model
    const P = V.personal;
    const H = V.home;
    const B = V.btl;
    const S = V.settings;

    const isStockCrash = S.stockCrash || false;
    const isPropCrash = S.propCrash || false;
    const rates = Engine.getTaxRates(P.taxBand);
    const years = 40;
    
    // Rent Baseline
    const totalMonthlyBudget = P.monthlySavings + P.rent.current;
    const rentInf = P.rent.inflation / 100;
    const stockGrowth = P.stockGrowth / 100;

    // Helper: Asset cost logic
    const getAcquisitionCost = (price, stampType, isFTB, buyingCost, reno) => {
        const stamp = Engine.calculateStampDuty(price, stampType, isFTB);
        return { stamp, total: stamp + buyingCost + reno };
    };

    // Helper: Exit logic
    const getExitVal = (isa, gia, giaBasis, houseV, debt, type, cashCo=0, sellCostPct=0.015, propBasis=0) => {
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
        } else if (type !== 'none') {
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

    const initStrat = (name) => ({ 
        name, 
        netWorth: [], netWorthLiquid: [], deadMoney: [], liquidHistory: [], 
        breakdown: { interest: [], maintenance: [], tax: [], rent: [], fees: [] }
    });

    // --- Strategy A: Rent & Invest ---
    let sA = initStrat("Rent");
    let isaA = P.isaBalance, giaA = P.liquidAssets - P.isaBalance, basisA = giaA, deadA = 0;
    let cRentA = 0;

    // --- Strategy B: Buy Home ---
    let sB = initStrat("Buy Home");
    let possibleB = false, isaB = P.isaBalance, giaB = P.liquidAssets - P.isaBalance, basisB = giaB, deadB = 0;
    let debtB = 0, houseB = 0, cIntB = 0, cMaintB = 0, cFeesB = 0, pB = 0, propBasisB = 0;
    if (H.active) {
        const deposit = H.price * (H.depositPct / 100);
        const acq = getAcquisitionCost(H.price, 'personal', true, H.buyingCost, H.renoCost); // Assume FTB logic applies to Home if set? Need isFTB flag in P or H? 
        // NOTE: FTB flag is usually global. Let's assume P.isFTB exists or pass it in P.
        // Correction: The new model put FTB implicit? No, it should be in P. 
        // Let's check the plan. Plan didn't explicitly list isFTB in Personal. 
        // I will assume it's in P for now: P.isFTB
        const isFTB = P.isFTB !== undefined ? P.isFTB : false;
        const acqReal = getAcquisitionCost(H.price, 'personal', isFTB, H.buyingCost, H.renoCost);
        
        if (P.liquidAssets >= (deposit + acqReal.total)) {
            possibleB = true;
            let cost = deposit + acqReal.total;
            if (giaB >= cost) giaB -= cost; else { cost -= giaB; giaB = 0; isaB -= cost; }
            basisB = giaB;
            debtB = H.price - deposit;
            houseB = H.renoCost > 0 ? (H.postWorkValue || H.price + H.renoCost) : H.price; // Use explicit post value if exists
            propBasisB = H.price + H.buyingCost + H.renoCost;
            pB = Engine.calculateMortgage(debtB, H.rate, H.term);
            cFeesB += (acqReal.stamp + H.buyingCost);
            deadB += (acqReal.stamp + H.buyingCost);
        }
    }

    // --- Strategy C: Buy + Lodger ---
    let sC = initStrat("Buy Home + Lodger");
    let possibleC = possibleB && H.lodger.active; 
    let isaC = isaB, giaC = giaB, basisC = basisB, debtC = debtB, houseC = houseB, deadC = deadB;
    let cIntC = 0, cMaintC = 0, cFeesC = cFeesB;

    // --- Strategy D: Company BTL ---
    let sD = initStrat("BTL (Ltd Co)");
    let possibleD = false, isaD = P.isaBalance, giaD = P.liquidAssets - P.isaBalance, basisD = giaD, deadD = 0;
    let debtD = 0, houseD = 0, coCashD = 0, cIntD = 0, cMaintD = 0, cRentD = 0, cTaxD = 0, cFeesD = 0, pD = 0, propBasisD = 0;
    if (B.active && B.wrappers.company) {
        const deposit = B.price * (B.depositPct / 100);
        const acq = getAcquisitionCost(B.price, 'company', false, B.buyingCost || 2000, 0); // No reno for BTL in this simple model? Or add B.reno? Let's assume 0 for now or add to B object later.
        if (P.liquidAssets >= (deposit + acq.total)) {
            possibleD = true;
            let cost = deposit + acq.total;
            if (giaD >= cost) giaD -= cost; else { cost -= giaD; giaD = 0; isaD -= cost; }
            basisD = giaD;
            debtD = B.price - deposit;
            houseD = B.price;
            propBasisD = B.price + (B.buyingCost||2000);
            pD = Engine.calculateMortgage(debtD, B.rateCompany, B.term);
            cFeesD += (acq.stamp + (B.buyingCost||2000));
            deadD += (acq.stamp + (B.buyingCost||2000));
        }
    }

    // --- Strategy E: Personal BTL ---
    let sE = initStrat("BTL (Personal)");
    let possibleE = false, isaE = P.isaBalance, giaE = P.liquidAssets - P.isaBalance, basisE = giaE, deadE = 0;
    let debtE = 0, houseE = 0, cIntE = 0, cMaintE = 0, cRentE = 0, cTaxE = 0, cFeesE = 0, pE = 0, propBasisE = 0;
    if (B.active && B.wrappers.personal) {
        const deposit = B.price * (B.depositPct / 100);
        const acq = getAcquisitionCost(B.price, 'additional', false, B.buyingCost || 2000, 0);
        if (P.liquidAssets >= (deposit + acq.total)) {
            possibleE = true;
            let cost = deposit + acq.total;
            if (giaE >= cost) giaE -= cost; else { cost -= giaE; giaE = 0; isaE -= cost; }
            basisE = giaE;
            debtE = B.price - deposit;
            houseE = B.price;
            propBasisE = B.price + (B.buyingCost||2000);
            pE = Engine.calculateMortgage(debtE, B.ratePersonal, B.term);
            cFeesE += (acq.stamp + (B.buyingCost||2000));
            deadE += (acq.stamp + (B.buyingCost||2000));
        }
    }

    // --- Strategy F: Home + Co. BTL ---
    let sF = initStrat("Home + BTL");
    let possibleF = false, isaF = P.isaBalance, giaF = P.liquidAssets - P.isaBalance, basisF = giaF, deadF = 0;
    let dF1 = 0, hF1 = 0, dF2 = 0, hF2 = 0, coCashF = 0, cIntF = 0, cMaintF = 0, cTaxF = 0, cFeesF = 0, pF1 = 0, pF2 = 0, pbF2 = 0;
    
    if (H.active && B.active && B.wrappers.company) {
        // Calculate costs for BOTH
        const isFTB = P.isFTB !== undefined ? P.isFTB : false;
        const acqH = getAcquisitionCost(H.price, 'personal', isFTB, H.buyingCost, H.renoCost);
        const depH = H.price * (H.depositPct / 100);
        
        const acqB = getAcquisitionCost(B.price, 'company', false, B.buyingCost || 2000, 0);
        const depB = B.price * (B.depositPct / 100);
        
        const totalCost = depH + acqH.total + depB + acqB.total;
        
        if (P.liquidAssets >= totalCost) {
            possibleF = true;
            let cost = totalCost;
            if (giaF >= cost) giaF -= cost; else { cost -= giaF; giaF = 0; isaF -= cost; }
            basisF = giaF;
            
            dF1 = H.price - depH;
            hF1 = H.renoCost > 0 ? (H.postWorkValue || H.price + H.renoCost) : H.price;
            pF1 = Engine.calculateMortgage(dF1, H.rate, H.term);
            
            dF2 = B.price - depB;
            hF2 = B.price;
            pbF2 = B.price + (B.buyingCost||2000);
            pF2 = Engine.calculateMortgage(dF2, B.rateCompany, B.term);
            
            cFeesF += (acqH.stamp + H.buyingCost + acqB.stamp + (B.buyingCost||2000));
            deadF += (acqH.stamp + H.buyingCost + acqB.stamp + (B.buyingCost||2000));
        }
    }


    const propGrowth = (P.propertyGrowth !== undefined ? P.propertyGrowth : 3.0) / 100;

    // --- Simulation Loop ---
    for (let y = 1; y <= years; y++) {
        let stockM = (1 + stockGrowth / 12), propG = 1 + propGrowth;
        if (y === 1) { if (isStockCrash) stockM = Math.pow(0.7, 1/12); if (isPropCrash) propG = propG * 0.85; }
        let rentY = P.rent.current * Math.pow(1 + rentInf, y - 1);
        
        // Annual Service Charge Inflation
        // We use rentInf as a proxy for generic inflation for SC
        let scH = H.active ? (H.serviceCharge * Math.pow(1 + rentInf, y - 1)) : 0;
        let scB = B.active ? (B.serviceCharge * Math.pow(1 + rentInf, y - 1)) : 0;

        for (let m = 1; m <= 12; m++) {
            const invest = (sur, isa, gia, basis) => {
                if (sur > 0) { let toISA = Math.min(sur, 20000/12); let toGIA = Math.max(0, sur - toISA); return [ (isa + toISA)*stockM, (gia + toGIA)*stockM, basis + toGIA ]; }
                else { let n = -sur; if (gia >= n) return [ isa*stockM, (gia-n)*stockM, basis-n ]; else return [ Math.max(0, isa-(n-gia))*stockM, 0, 0 ]; }
            };
            
            // Strat A: Rent
            [isaA, giaA, basisA] = invest(totalMonthlyBudget - rentY, isaA, giaA, basisA);
            cRentA += rentY; deadA += rentY;
            
            // Strat B: Buy Home
            if (possibleB) {
                let i = debtB * (H.rate / 1200);
                cIntB += i; debtB -= (pB - i);
                let maint = (houseB * (H.repairRate / 100) / 12) + (scH / 12);
                cMaintB += maint; deadB += (i + maint);
                [isaB, giaB, basisB] = invest(totalMonthlyBudget - (pB + maint), isaB, giaB, basisB);
            }
            
            // Strat C: Buy + Lodger
            if (possibleC) {
                let i = debtC * (H.rate / 1200);
                cIntC += i; debtC -= (pB - i);
                let maint = (houseC * (H.repairRate / 100) / 12) + (scH / 12);
                cMaintC += maint;
                let l = (y <= H.lodger.years) ? H.lodger.income : 0;
                // Lodger Tax Relief (Rent a Room Scheme: £7500 tax free)
                let netL = l - Math.max(0, (l * 12 > 7500 ? (l - 7500 / 12) * rates.income : 0));
                deadC += (i + maint - netL);
                [isaC, giaC, basisC] = invest(totalMonthlyBudget - (pB + maint - netL), isaC, giaC, basisC);
            }

            // Strat D: Co BTL
            if (possibleD) {
                let i = debtD * (B.rateCompany / 1200);
                cIntD += i; debtD -= (pD - i);
                let maint = (houseD * (B.repairRate / 100) / 12) + (scB / 12);
                cMaintD += maint; cRentD += rentY; // You still pay rent
                
                let btlIncome = houseD * (B.rentYield / 100) / 12;
                let profit = btlIncome - (i + maint);
                let tax = Math.max(0, profit * rates.corp); // Corporation tax on profit
                
                cTaxD += tax; coCashD += (profit - tax);
                deadD += (rentY + i + maint + tax - btlIncome);
                [isaD, giaD, basisD] = invest(totalMonthlyBudget - rentY, isaD, giaD, basisD);
            }

            // Strat E: Personal BTL
            if (possibleE) {
                let i = debtE * (B.ratePersonal / 1200);
                cIntE += i; debtE -= (pE - i);
                let maint = (houseE * (B.repairRate / 100) / 12) + (scB / 12);
                cMaintE += maint; cRentE += rentY;
                
                let btlIncome = houseE * (B.rentYield / 100) / 12;
                let profit = btlIncome - maint; // Interest not deductible yet
                // Section 24: Tax on profit, then subtract 20% of interest
                let taxLiability = profit * rates.income;
                let relief = i * 0.20;
                let tax = Math.max(0, taxLiability - relief);
                
                cTaxE += tax;
                deadE += (rentY + i + maint + tax - btlIncome);
                let cashFlow = btlIncome - i - maint - tax;
                [isaE, giaE, basisE] = invest(totalMonthlyBudget - rentY + cashFlow, isaE, giaE, basisE);
            }

            // Strat F: Home + Co BTL
            if (possibleF) {
                // Home Loop
                let i1 = dF1 * (H.rate / 1200); dF1 -= (pF1 - i1);
                let m1 = (hF1 * (H.repairRate / 100) / 12) + (scH / 12);
                
                // BTL Loop
                let i2 = dF2 * (B.rateCompany / 1200); dF2 -= (pF2 - i2);
                let m2 = (hF2 * (B.repairRate / 100) / 12) + (scB / 12);
                
                cIntF += (i1 + i2); cMaintF += (m1 + m2);
                
                // BTL Profit
                let btlIncome = hF2 * (B.rentYield / 100) / 12;
                let profit = btlIncome - (i2 + m2);
                let tax = Math.max(0, profit * rates.corp);
                cTaxF += tax; coCashF += (profit - tax);
                
                deadF += (i1 + m1 + i2 + m2 + tax - btlIncome);
                [isaF, giaF, basisF] = invest(totalMonthlyBudget - (pF1 + m1), isaF, giaF, basisF);
            }
        }
        
        // Annual Appreciation
        if (possibleB) houseB *= propG;
        if (possibleC) houseC *= propG;
        if (possibleD) houseD *= propG;
        if (possibleE) houseE *= propG;
        if (possibleF) { hF1 *= propG; hF2 *= propG; }
        
        // Record History
        const rec = (s, possible, isa, gia, basis, h, d, type, co, dead, br) => {
            if (!possible) {
                 s.netWorth.push(0); s.netWorthLiquid.push(0); s.liquidHistory.push(0); s.deadMoney.push(0);
                 return;
            }
            const res = getExitVal(isa, gia, basis, h, d, type, co, (type==='home'?H.sellingCostPct:B.sellingCostPct || 0.015)/100, (type==='home'?propBasisB:(type==='company'?propBasisD:propBasisE)));
            s.netWorth.push(res.gross); s.netWorthLiquid.push(res.liquid); s.liquidHistory.push(getLiqHist(isa, gia, co));
            s.deadMoney.push(dead);
            s.breakdown.interest.push(br.int); s.breakdown.maintenance.push(br.maint); 
            s.breakdown.rent.push(br.rent); s.breakdown.tax.push(br.tax); s.breakdown.fees.push(br.fees);
        };
        
        // A
        const resA = getExitVal(isaA, giaA, basisA, 0, 0, 'none');
        sA.netWorth.push(resA.gross); sA.netWorthLiquid.push(resA.liquid); sA.liquidHistory.push(getLiqHist(isaA, giaA)); sA.deadMoney.push(deadA);
        sA.breakdown.rent.push(cRentA); sA.breakdown.interest.push(0); sA.breakdown.maintenance.push(0); sA.breakdown.tax.push(0); sA.breakdown.fees.push(0);

        // Others
        rec(sB, possibleB, isaB, giaB, basisB, houseB, debtB, 'home', 0, deadB, {int:cIntB, maint:cMaintB, rent:0, tax:0, fees:cFeesB});
        rec(sC, possibleC, isaC, giaC, basisC, houseC, debtC, 'home', 0, deadC, {int:cIntC, maint:cMaintC, rent:0, tax:0, fees:cFeesC});
        rec(sD, possibleD, isaD, giaD, basisD, houseD, debtD, 'company', coCashD, deadD, {int:cIntD, maint:cMaintD, rent:cRentD, tax:cTaxD, fees:cFeesD});
        rec(sE, possibleE, isaE, giaE, basisE, houseE, debtE, 'btl', 0, deadE, {int:cIntE, maint:cMaintE, rent:cRentE, tax:cTaxE, fees:cFeesE});
        
        // F Special Case (Complex Exit)
        if (possibleF) {
            const stockGross = isaF + giaF;
            const stockGain = Math.max(0, giaF - basisF);
            const stockLiquid = isaF + (giaF - stockGain * rates.cgt);
            
            // Asset 1: Home
            const hSellFee = hF1 * (H.sellingCostPct/100);
            const hGross = Math.max(0, hF1 - dF1);
            const hLiquid = Math.max(0, hF1 - hSellFee - dF1);
            
            // Asset 2: Co BTL
            const bSellFee = hF2 * (B.sellingCostPct || 0.015); // Default BTL sell cost? Not in schema yet, assume 1.5%
            const bGross = Math.max(0, hF2 - dF2) + coCashF;
            let bProceeds = Math.max(0, hF2 - bSellFee - dF2);
            const bGain = (hF2 - bSellFee) - pbF2; // Use F's basis
            if (bGain > 0) bProceeds -= (bGain * rates.corp);
            const bLiquid = Math.max(0, (bProceeds + coCashF) * (1 - rates.div));
            
            sF.netWorth.push(stockGross + hGross + bGross);
            sF.netWorthLiquid.push(stockLiquid + hLiquid + bLiquid);
            sF.liquidHistory.push(getLiqHist(isaF, giaF, coCashF));
            sF.deadMoney.push(deadF);
            sF.breakdown.interest.push(cIntF); sF.breakdown.maintenance.push(cMaintF); sF.breakdown.rent.push(0); sF.breakdown.tax.push(cTaxF); sF.breakdown.fees.push(cFeesF);
        } else {
             sF.netWorth.push(0); sF.netWorthLiquid.push(0); sF.liquidHistory.push(0); sF.deadMoney.push(0);
             sF.breakdown.interest.push(0); sF.breakdown.maintenance.push(0); sF.breakdown.rent.push(0); sF.breakdown.tax.push(0); sF.breakdown.fees.push(0);
        }
    }

    // Compat aliases
    [sA, sB, sC, sD, sE, sF].forEach(s => s.totalInterest = s.breakdown.interest);

    return { stratA:sA, stratB:sB, stratC:sC, stratD:sD, stratE:sE, stratF:sF, possibleB, possibleD, possibleE, possibleF };
};

Engine.calculateSensitivityMatrix = function(V, targetYear = 10) {
    const years = targetYear; // Evaluation horizon
    const baseGrowth = V.personal.propertyGrowth || 3.0;
    const baseRate = V.home.rate || 4.5;
    
    // Generate ranges (+/- 2% in 1% steps)
    const growthRange = [baseGrowth - 2, baseGrowth - 1, baseGrowth, baseGrowth + 1, baseGrowth + 2];
    const rateRange = [baseRate + 2, baseRate + 1, baseRate, baseRate - 1, baseRate - 2]; // Reversed so higher rates are bottom
    
    const matrix = [];
    for (const r of rateRange) {
        const row = [];
        for (const g of growthRange) {
            // Deep clone state
            const clone = JSON.parse(JSON.stringify(V));
            clone.personal.propertyGrowth = g;
            clone.home.rate = r;
            
            const results = Engine.simulateStrategies(clone);
            const rentNW = results.stratA.netWorthLiquid[years - 1];
            const buyNW = results.stratB.netWorthLiquid[years - 1];
            
            const diff = buyNW - rentNW;
            row.push({
                val: diff,
                winner: diff > 0 ? 'Buy' : 'Rent',
                isCenter: (g === baseGrowth && r === baseRate)
            });
        }
        matrix.push(row);
    }
    
    return {
        xLabels: growthRange.map(v => v.toFixed(1) + '%'),
        yLabels: rateRange.map(v => v.toFixed(1) + '%'),
        rows: matrix
    };
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
} else {
    window.Engine = Engine;
}