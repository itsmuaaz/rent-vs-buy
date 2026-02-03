const AuditLogic = {};

const fmt = {
    money: (v) => `£${Number(v).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits:0})}`,
    moneyPrecise: (v) => `£${Number(v).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}`,
    pct: (v) => `${Number(v).toFixed(2)}%`,
    bold: (t) => `<span class="font-bold text-slate-900">${t}</span>`,
    code: (t) => `<code class="bg-gray-100 px-1 py-0.5 rounded text-indigo-700 text-xs font-mono border border-gray-200">${t}</code>`
};

AuditLogic.dictionary = [
    // --- CATEGORY: STRATEGIES (THE "BLACK BOX" REVEALED) ---
    {
        id: 'strat_rent',
        category: 'Strategies',
        title: 'Strategy A: Rent & Invest Logic',
        formula: 'Investable Surplus = Total Budget - Rent',
        description: 'How we calculate wealth for a Renter. We assume you have a fixed monthly budget (based on what buying would cost, or set manually) and invest 100% of the difference.',
        explain: (state) => {
            const P = state.personal;
            const rent = P.rent.current;
            const savings = P.monthlySavings;
            const totalBudget = rent + savings;
            
            // Simulation Logic
            const surplus = totalBudget - rent;
            
            return (
                `<div class="space-y-3">
                    <div>
                        <div class="text-xs font-bold text-slate-500 uppercase">Month 1 Cash Flow</div>
                        <ul class="mt-1 space-y-1 text-sm">
                            <li>Total Budget: ${fmt.money(totalBudget)} <span class="text-xs text-gray-400">(Rent + Savings)</span></li>
                            <li>Less Rent: <span class="text-red-600">-${fmt.money(rent)}</span></li>
                            <li class="pt-1 border-t border-gray-200 font-bold text-green-700">
                                = Investable Surplus: ${fmt.money(surplus)}
                            </li>
                        </ul>
                    </div>
                    
                    <div class="p-3 bg-blue-50 rounded border border-blue-100 text-sm">
                        <div class="font-bold text-blue-800 mb-1">Where does this £${Number(surplus).toLocaleString()} go?</div>
                        <p>It is added to your <strong>Stock Portfolio</strong>.</p>
                        <p class="mt-1 text-xs">
                            Rules: First £1,666/mo fills your <strong>ISA</strong> (Tax Free). 
                            Any excess goes to a <strong>GIA</strong> (General Investment Account), subject to Tax.
                        </p>
                    </div>

                    <div class="text-xs text-gray-500">
                        *Rent increases annually by ${fmt.bold(P.rent.inflation + '%')}, gradually reducing your surplus over time.
                    </div>
                </div>
            `
            );
        }
    },
    {
        id: 'strat_buy',
        category: 'Strategies',
        title: 'Strategy B: Buy Home Logic',
        formula: 'Wealth = Home Equity + Stock Portfolio',
        description: 'Buying builds wealth through two engines: paying down debt (forced savings) and asset appreciation (growth).',
        explain: (state) => {
            const H = state.home;
            if (!H.active) return "Home Buying is disabled in your current settings.";
            
            const debt = H.price * (1 - H.depositPct/100);
            const monthlyRate = H.rate / 100 / 12;
            const interest = debt * monthlyRate;
            
            // Calculate repayment
            const r = monthlyRate;
            const n = H.term * 12;
            const mortgagePayment = (debt * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
            const principal = mortgagePayment - interest;
            
            const maint = (H.price * H.repairRate/100 / 12) + (H.serviceCharge / 12);
            const totalCost = mortgagePayment + maint;
            
            const P = state.personal;
            const totalBudget = P.rent.current + P.monthlySavings;
            const surplus = totalBudget - totalCost;

            return (
                `<div class="space-y-4">
                    <div>
                        <div class="text-xs font-bold text-slate-500 uppercase">Month 1 Mortgage Breakdown</div>
                        <div class="grid grid-cols-2 gap-2 text-sm mt-1">
                            <div>Total Payment:</div><div class="font-bold">${fmt.moneyPrecise(mortgagePayment)}</div>
                            <div class="text-red-600 pl-2">↳ Interest (Cost):</div><div class="text-red-600">-${fmt.moneyPrecise(interest)}</div>
                            <div class="text-green-600 pl-2">↳ Principal (Equity):</div><div class="text-green-600">+${fmt.moneyPrecise(principal)}</div>
                        </div>
                        <div class="mt-2 text-xs bg-green-50 text-green-800 p-2 rounded">
                            Only the <strong>Principal</strong> increases your Net Worth. The Interest is "Dead Money" (like Rent).
                        </div>
                    </div>

                    <div>
                        <div class="text-xs font-bold text-slate-500 uppercase">Month 1 Cash Flow</div>
                        <ul class="mt-1 space-y-1 text-sm">
                            <li>Total Budget: ${fmt.money(totalBudget)}</li>
                            <li>Less Mortgage: -${fmt.money(mortgagePayment)}</li>
                            <li>Less Maintenance/Fees: -${fmt.money(maint)}</li>
                            <li class="pt-1 border-t border-gray-200 font-bold ${surplus >= 0 ? 'text-green-700' : 'text-red-600'}">
                                = Surplus to Invest: ${fmt.money(surplus)}
                            </li>
                        </ul>
                    </div>
                </div>
            `
            );
        }
    },
    {
        id: 'strat_btl',
        category: 'Strategies',
        title: 'Strategy D/E: Buy-to-Let Logic',
        formula: 'Profit = Rent - Mortgage - Maint - Tax',
        description: 'Investment property mathematics. The key difference is taxation: Limited Companies pay Corporation Tax, while Personal owners face Section 24 restrictions.',
        explain: (state) => {
            const B = state.btl;
            if (!B.active) return "Buy-to-Let is disabled in your current settings.";
            
            const P = state.personal;
            const rates = Engine.getTaxRates(P.taxBand);
            
            // Logic Branching: Company vs Personal
            // We explain the one that is active (or prefer Company if both active for brevity, or list both?)
            // Let's assume we audit the "Active" one. If both active, show Company (Strat D) as it's often the comparison point.
            // Or better: Show a tab? No, keep it simple. Show "Limited Company" if selected, else "Personal".
            
            const isCompany = B.wrappers.company;
            const mode = isCompany ? 'Limited Company' : 'Personal Name';
            const rate = isCompany ? B.rateCompany : B.ratePersonal;
            
            const debt = B.price * (1 - B.depositPct/100);
            const monthlyRate = rate / 100 / 12;
            
            // Mortgage Calculation (Interest Only support)
            const isInterestOnly = B.mortgageType === 'interestOnly';
            const r = monthlyRate;
            const n = B.term * 12;
            const interest = debt * monthlyRate;
            
            let mortgagePayment;
            if (isInterestOnly) {
                mortgagePayment = interest;
            } else {
                mortgagePayment = (debt * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
            }
            
            const rentIncome = (B.price * B.rentYield/100) / 12;
            const maint = (B.price * B.repairRate/100 / 12) + (B.serviceCharge / 12);
            
            // Tax Calculation
            let tax = 0;
            let taxExplainer = '';
            
            if (isCompany) {
                // Corp Tax
                // Profit = Rent - Interest - Maint (Interest IS deductible)
                // Note: For Corp Tax, we deduct INTEREST, not capital repayment.
                // If Repayment mortgage, profit is still Rent - Interest - Maint.
                const profit = rentIncome - interest - maint;
                tax = Math.max(0, profit * rates.corp);
                taxExplainer = `
                    <div class="text-xs bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                        <strong>Corporation Tax (${rates.corp*100}%):</strong><br>
                        Rent (${fmt.money(rentIncome)}) - Interest (${fmt.money(interest)}) - Maint (${fmt.money(maint)}) = Profit (${fmt.money(profit)})<br>
                        Tax = ${fmt.money(tax)}
                    </div>`;
            } else {
                // Section 24 (Personal)
                // Profit = Rent - Maint (Interest NOT deductible)
                const taxableProfit = rentIncome - maint;
                const taxLiability = taxableProfit * rates.income;
                const relief = interest * 0.20;
                tax = Math.max(0, taxLiability - relief);
                
                taxExplainer = `
                    <div class="text-xs bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                        <strong>Section 24 Calculation:</strong><br>
                        1. Tax on Revenue: (${fmt.money(rentIncome)} - ${fmt.money(maint)}) × ${rates.income*100}% = ${fmt.money(taxLiability)}<br>
                        2. Finance Credit: Interest (${fmt.money(interest)}) × 20% = ${fmt.money(relief)}<br>
                        3. Net Tax = ${fmt.money(tax)}
                    </div>`;
            }
            
            const cashFlow = rentIncome - mortgagePayment - maint - tax;

            return (
                `<div class="space-y-4">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs font-bold text-white bg-purple-600 px-2 py-1 rounded uppercase tracking-wide">${mode}</span>
                        <span class="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded border border-purple-200">${isInterestOnly ? 'Interest Only' : 'Repayment'}</span>
                    </div>

                    <div>
                        <div class="text-xs font-bold text-slate-500 uppercase">Month 1 P&L</div>
                        <ul class="mt-1 space-y-1 text-sm">
                            <li class="font-bold text-green-700">Gross Rent: +${fmt.moneyPrecise(rentIncome)}</li>
                            <li>Mortgage: -${fmt.moneyPrecise(mortgagePayment)} <span class="text-xs text-gray-400">(${isInterestOnly ? 'Int Only' : 'Inc. Capital'})</span></li>
                            <li>Maintenance: -${fmt.moneyPrecise(maint)}</li>
                            <li>Tax: <span class="text-red-600">-${fmt.moneyPrecise(tax)}</span></li>
                            <li class="pt-1 border-t border-gray-200 font-bold ${cashFlow >= 0 ? 'text-blue-700' : 'text-red-600'}">
                                = Net Cash Flow: ${fmt.moneyPrecise(cashFlow)}
                            </li>
                        </ul>
                    </div>
                    
                    ${taxExplainer}
                </div>`
            );
        }
    },
    
    // --- CATEGORY: CALCULATIONS ---
    {
        id: 'investment',
        category: 'Math',
        title: 'Investment Growth (Compound)',
        formula: 'Balance_Next = (Balance_Current + Contribution) × (1 + Monthly_Rate)',
        description: 'How your Stocks & Shares portfolio grows every month.',
        explain: (state) => {
            const growth = state.personal.stockGrowth;
            const monthlyRate = growth / 100 / 12;
            const exampleStart = 10000;
            const exampleEnd = exampleStart * (1 + monthlyRate);
            
            return (
                `<div class="space-y-2">
                    <p class="text-sm">We convert your Annual Growth Rate (${fmt.bold(growth + '%')}) into a Monthly Multiplier.</p>
                    
                    <div class="bg-slate-100 p-3 rounded font-mono text-sm border border-slate-200">
                        Multiplier = 1 + (${growth}% / 12)<br>
                        Multiplier = ${1 + monthlyRate}
                    </div>
                    
                    <div class="text-sm">
                        <strong>Example:</strong> If you start the month with ${fmt.money(exampleStart)}:
                        <br>
                        Result = ${fmt.money(exampleStart)} × ${ (1+monthlyRate).toFixed(6) }
                        <br>
                        New Balance = <strong>${fmt.moneyPrecise(exampleEnd)}</strong>
                    </div>
                    
                    <div class="text-xs text-gray-500 mt-2">
                        *This compounds 12 times a year. Effectively ${( (Math.pow(1+monthlyRate, 12) - 1) * 100 ).toFixed(2)}% APY.
                    </div>
                </div>
            `
            );
        }
    },
    {
        id: 'inflation',
        category: 'Math',
        title: 'Inflation Adjustment (Real Terms)',
        formula: 'Real_Value = Nominal_Value / (1 + Inflation_Rate)^Years',
        description: 'If "Real Terms" is enabled, we discount future money to show what it is worth in today\'s purchasing power.',
        explain: (state) => {
            const enabled = state.settings.inflationAdjusted;
            const rate = state.personal.rent.inflation; // We use rent inflation as proxy for CPI usually, or is it distinct? engine uses rent inflation currently.
            
            if (!enabled) {
                return `<div class="text-gray-500 italic">Inflation adjustment is currently <strong>DISABLED</strong>. All charts show "Nominal" (Future) money.</div>`;
            }
            
            return (
                `<div class="space-y-2">
                    <p class="text-sm">We divide all future values by a cumulative inflation factor (${rate}% per year).</p>
                    
                    <div class="grid grid-cols-3 gap-2 text-center text-sm mt-3">
                        <div class="bg-gray-50 p-2 rounded">
                            <div class="text-xs text-gray-500">Year 10 Value</div>
                            <div class="font-bold">£100k</div>
                        </div>
                        <div class="flex items-center justify-center text-gray-400">becomes</div>
                        <div class="bg-indigo-50 p-2 rounded border border-indigo-100">
                            <div class="text-xs text-indigo-500">Today's Money</div>
                            <div class="font-bold text-indigo-700">£${Math.round(100000 / Math.pow(1 + rate/100, 10)).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            `
            );
        }
    },

    // --- CATEGORY: TAXES ---
    {
        id: 'sdlt',
        category: 'Taxes',
        title: 'Stamp Duty Land Tax (SDLT)',
        formula: 'Σ (Band_Width × Rate) + 3% Surcharge (if additional)',
        description: 'Upfront tax paid when buying a property. Rates depend on purchase price and buyer status.',
        explain: (state) => {
            const P = state.home;
            const price = P.price;
            if (price <= 0) return 'Price is zero.';
            
            const isFTB = state.personal.isFTB;
            // Re-calculate to prove it
            let tax = Engine.calculateStampDuty(price, 'personal', isFTB);
            
            let html = `<div>Property Price: ${fmt.bold(fmt.money(price))}</div>`;
            
            if (isFTB) {
                if (price > 500000) {
                     html += `<div class="text-red-600 mt-2 font-bold text-sm">⚠️ First Time Buyer Relief Disqualified</div>
                              <div class="text-xs text-red-800">Price exceeds the £500k strict cap. You pay Standard Rates (0% on first £125k).</div>`;
                } else if (price > 300000) {
                    html += `<div class="text-green-700 mt-2 font-bold text-sm">✅ First Time Buyer Relief Applied</div>
                             <div class="text-xs text-green-800">0% on first £300k. 5% on remainder (up to £500k).</div>`;
                } else {
                    html += `<div class="text-green-700 mt-2 font-bold text-sm">✅ First Time Buyer Relief Applied</div>
                             <div class="text-xs text-green-800">0% tax (Price is under £300k threshold).</div>`;
                }
            } else {
                html += `<div class="mt-2 text-xs text-slate-500">Standard Home Mover rates apply (0% on first £125k).</div>`;
            }
            
            html += `<div class="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                        <span>Total Payable:</span>
                        <span class="text-lg font-bold text-indigo-700">${fmt.money(tax)}</span>
                     </div>`;
            return html;
        }
    },
    {
        id: 'mortgage',
        category: 'Loans',
        title: 'Mortgage Amortization',
        formula: 'M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]',
        description: 'Standard repayment mortgage. Payment covers interest + principal.',
        explain: (state) => {
            const H = state.home;
            const deposit = H.price * (H.depositPct / 100);
            const principal = H.price - deposit;
            const rate = H.rate;
            const term = H.term;
            
            const monthly = Engine.calculateMortgage(principal, rate, term);
            
            return (
                `
                <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div class="text-slate-500">Loan Amount:</div><div class="text-right font-medium">${fmt.money(principal)}</div>
                    <div class="text-slate-500">Interest Rate:</div><div class="text-right font-medium">${rate}%</div>
                    <div class="text-slate-500">Term:</div><div class="text-right font-medium">${term} Years</div>
                </div>
                <div class="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                    <div class="text-xs text-slate-500 uppercase tracking-wide">Monthly Payment</div>
                    <div class="text-xl font-bold text-slate-800">${fmt.moneyPrecise(monthly)}</div>
                </div>
            `
            );
        }
    },
    {
        id: 'cgt',
        category: 'Taxes',
        title: 'Capital Gains Tax (CGT)',
        formula: 'Taxable Gain × Rate (18% Basic / 24% Higher)',
        description: 'Tax on profit from selling assets (BTL Property or Shares).',
        explain: (state) => {
            const band = state.personal.taxBand;
            const rates = Engine.getTaxRates(band);
            const ratePct = (rates.cgt * 100).toFixed(0) + '%';
            
            return (
                `<div class="mb-2 text-sm">
                    Your Tax Band: ${fmt.bold(band.charAt(0).toUpperCase() + band.slice(1))}
                </div>
                <ul class="list-disc list-inside text-sm space-y-1 text-slate-600">
                    <li>Annual Allowance: ${fmt.bold('£3,000')} (Tax Free)</li>
                    <li>Property Rate: ${fmt.bold(ratePct)} (on excess)</li>
                    <li>Shares Rate: ${fmt.bold('20%')} (if higher band) / ${fmt.bold('10%')} (basic)</li>
                </ul>
            `
            );
        }
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuditLogic;
} else {
    window.AuditLogic = AuditLogic;
}