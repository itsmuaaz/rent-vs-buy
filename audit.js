const AuditLogic = {};

const fmt = {
    money: (v) => `£${Number(v).toLocaleString(undefined, {maximumFractionDigits:0})}`,
    pct: (v) => `${Number(v).toFixed(2)}%`,
    bold: (t) => `<span class="font-bold text-slate-900">${t}</span>`
};

AuditLogic.dictionary = [
    {
        id: 'sdlt',
        category: 'Taxes',
        title: 'Stamp Duty Land Tax (SDLT)',
        formula: 'Σ (Band_Width × Rate) + 3% Surcharge (if additional property)',
        description: 'Upfront tax paid when buying a property. Rates depend on purchase price and buyer status (First Time Buyer vs Mover vs Investor).',
        explain: (state) => {
            const P = state.home;
            const price = P.price;
            if (price <= 0) return 'Price is zero.';
            
            const isFTB = state.personal.isFTB;
            const isAdditional = false; // "Buy Home" assumes main residence replacement usually, but let's check input context? 
            // Actually calculator assumes Main Residence for "Buy Home" strategy.
            
            // Re-calculate to prove it
            let tax = Engine.calculateStampDuty(price, 'personal', isFTB);
            
            let html = `<div>Property Price: ${fmt.bold(fmt.money(price))}</div>`;
            
            if (isFTB) {
                if (price > 625000) {
                     html += `<div class="text-red-600 mt-2">⚠️ First Time Buyer Relief Invalid</div>
                              <div class="text-sm">Price exceeds the £625k strict cap. Standard rates apply.</div>`;
                } else if (price > 425000) {
                    html += `<div class="text-green-700 mt-2">✅ First Time Buyer Relief Applied</div>
                             <div class="text-sm">0% on first £425k. 5% on remainder.</div>`;
                } else {
                    html += `<div class="text-green-700 mt-2">✅ First Time Buyer Relief Applied</div>
                             <div class="text-sm">0% tax (Price is under £425k threshold).</div>`;
                }
            } else {
                html += `<div class="mt-2 text-sm text-slate-500">Standard Home Mover rates apply (April 2025 Rules).</div>`;
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
        description: 'Standard repayment mortgage. Your monthly payment covers the interest accrued that month plus a portion of the principal balance.',
        explain: (state) => {
            const H = state.home;
            const deposit = H.price * (H.depositPct / 100);
            const principal = H.price - deposit;
            const rate = H.rate;
            const term = H.term;
            
            const monthly = Engine.calculateMortgage(principal, rate, term);
            
            return `
                <div class="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div class="text-slate-500">Loan Amount:</div><div class="text-right font-medium">${fmt.money(principal)}</div>
                    <div class="text-slate-500">Interest Rate:</div><div class="text-right font-medium">${rate}%</div>
                    <div class="text-slate-500">Term:</div><div class="text-right font-medium">${term} Years</div>
                </div>
                <div class="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                    <div class="text-xs text-slate-500 uppercase tracking-wide">Monthly Payment</div>
                    <div class="text-xl font-bold text-slate-800">${fmt.money(monthly)}</div>
                </div>
                <div class="mt-2 text-xs text-slate-400 text-center">
                    *Excludes insurance, protection, or product fees.
                </div>
            `;
        }
    },
    {
        id: 'cgt',
        category: 'Taxes',
        title: 'Capital Gains Tax (CGT)',
        formula: 'Taxable Gain × Rate (18% Basic / 24% Higher)',
        description: 'Tax on profit from selling a BTL property or shares (GIA). You get an annual tax-free allowance (£3,000).',
        explain: (state) => {
            const band = state.personal.taxBand;
            const rates = Engine.getTaxRates(band);
            const ratePct = (rates.cgt * 100).toFixed(0) + '%';
            
            return `
                <div class="mb-2">
                    Your Tax Band: ${fmt.bold(band.charAt(0).toUpperCase() + band.slice(1))}
                </div>
                <ul class="list-disc list-inside text-sm space-y-1 text-slate-600">
                    <li>Annual Allowance: ${fmt.bold('£3,000')} (Tax Free)</li>
                    <li>Property Rate: ${fmt.bold(ratePct)} (on excess)</li>
                    <li>Shares Rate: ${fmt.bold('20%')} (if higher band) / ${fmt.bold('10%')} (basic)</li>
                </ul>
                <div class="mt-3 text-xs bg-yellow-50 text-yellow-800 p-2 rounded">
                    <strong>Note:</strong> In this simulator, we apply the <strong>${ratePct}</strong> Property Rate to BTL gains, and standard rates to GIA stock gains.
                </div>
            `;
        }
    },
    {
        id: 's24',
        category: 'Taxes',
        title: 'Section 24 (BTL)',
        formula: 'Tax on Revenue - 20% Finance Credit',
        description: 'Landlords cannot deduct mortgage interest from revenue. Instead, they get a basic rate (20%) tax credit. This hits higher-rate taxpayers hardest.',
        explain: (state) => {
            const band = state.personal.taxBand;
            if (band === 'basic') {
                 return `<div class="text-green-700">As a Basic Rate taxpayer, Section 24 mathematically has <strong>no negative impact</strong> on you compared to the old system. You effectively get full relief (20%).</div>`;
            }
            return `
                <div class="text-sm space-y-2">
                    <p>As a <strong>${band}</strong> rate taxpayer, you pay <strong>40%+</strong> tax on the <em>entire</em> rental income.</p>
                    <p>You then only get a <strong>20% credit</strong> back for mortgage interest.</p>
                    <div class="p-2 bg-red-50 border border-red-100 rounded text-red-800 text-xs">
                        <strong>Result:</strong> Your effective tax rate on real profit is much higher than 40%, and can exceed 100% if margins are thin.
                    </div>
                </div>
            `;
        }
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuditLogic;
} else {
    window.AuditLogic = AuditLogic;
}