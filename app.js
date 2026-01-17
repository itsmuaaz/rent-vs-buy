document.addEventListener('alpine:init', () => {
    Alpine.data('calculator', () => {
        // --- Closure State (Non-Reactive) ---
        // Storing charts here prevents Alpine from Proxying them, 
        // avoiding "Maximum call stack size exceeded" errors.
        let nwChart = null;
        let dmChart = null;

        return {
            // View State
            activeTab: 'personal', // 'personal', 'home', 'btl'
            simYears: 10,
            inspectorYear: 5,
            valuationMode: 'liquid',
            copied: false,
            
            // Data State (Asset Model)
            i: {
                personal: {
                    liquidAssets: 50000, isaBalance: 20000, monthlySavings: 1000,
                    stockGrowth: 8, taxBand: 'additional',
                    rent: { current: 1500, inflation: 3 },
                    isFTB: true
                },
                home: {
                    active: true, price: 400000, depositPct: 25, term: 30, rate: 4.5,
                    repairRate: 1.0, serviceCharge: 0, buyingCost: 2000, sellingCostPct: 1.5,
                    renoCost: 60000, postWorkValue: 525000,
                    lodger: { active: true, income: 900, years: 2 }
                },
                btl: {
                    active: false, price: 200000, depositPct: 25, term: 30,
                    ratePersonal: 4.5, rateCompany: 5.5,
                    repairRate: 0.5, serviceCharge: 2000, rentYield: 5.0,
                    wrappers: { personal: true, company: true },
                    buyingCost: 2000, sellingCostPct: 1.5
                },
                settings: { valuationMode: 'liquid', stockCrash: false, propCrash: false }
            },
            
            results: null,
            // nwChart & dmChart removed from here to avoid reactivity
            
            init() {
                const saved = localStorage.getItem('rentVsBuyData_v3');
                if (saved) { try { const parsed = JSON.parse(saved); if(parsed.personal) this.i = parsed; } catch(e){} }
                
                this.$watch('i', () => { this.calculate(); this.save(); }, { deep: true });
                this.$watch('simYears', () => this.updateCharts());
                this.$watch('inspectorYear', () => this.updateCharts());
                this.$watch('valuationMode', () => { 
                    // No side-effect here on this.i, handled by payload copy
                    this.updateCharts(); 
                });
                
                this.$nextTick(() => { this.calculate(); });
            },
            
            get payload() {
                // Create a clean copy to avoid side-effects triggering watchers
                const copy = JSON.parse(JSON.stringify(this.i));
                copy.settings.valuationMode = this.valuationMode; 
                return copy;
            },
            
            get errors() {
                const errs = [];
                const P = this.i.personal;
                if (this.i.home.active) {
                    const H = this.i.home;
                    const stamp = Engine.calculateStampDuty(H.price, 'personal', P.isFTB);
                    const upfront = (H.price * H.depositPct/100) + stamp + H.buyingCost + H.renoCost;
                    if (upfront > P.liquidAssets) errs.push(`Insufficient funds for Home (Need £${Math.round(upfront/1000)}k)`);
                }
                return errs;
            },

            get homeStats() {
                const def = { stamp: 0, upfront: 0, mortgage: 0, debt: 0 };
                if (!this.i.home.active) return def;

                const H = this.i.home; const P = this.i.personal;
                const stamp = Engine.calculateStampDuty(H.price, 'personal', P.isFTB);
                const deposit = H.price * (H.depositPct / 100);
                const upfront = deposit + stamp + H.buyingCost + H.renoCost;
                const debt = H.price - deposit;
                const mortgage = Engine.calculateMortgage(debt, H.rate, H.term);
                return { stamp, upfront, mortgage, debt };
            },

            get btlStats() {
                const def = { stamp: 0, upfront: 0, mortgage: 0, rent: 0, debt: 0 };
                if (!this.i.btl.active) return def;

                const B = this.i.btl;
                const stamp = Engine.calculateStampDuty(B.price, 'company', false);
                const deposit = B.price * (B.depositPct / 100);
                const upfront = deposit + stamp + (B.buyingCost||2000);
                const debt = B.price - deposit;
                const rate = B.wrappers.company ? B.rateCompany : B.ratePersonal; 
                const mortgage = Engine.calculateMortgage(debt, rate, B.term);
                const rent = (B.price * (B.rentYield/100)) / 12;
                return { stamp, upfront, mortgage, rent };
            },

            getNW(s, idx) {
                if (!s) return -Infinity;
                const arr = (this.valuationMode === 'gross') ? s.netWorth : s.netWorthLiquid;
                return arr ? (arr[idx] || 0) : 0;
            },

            get breakEven() {
                if (!this.results || !this.i.home.active) return null;
                const r = this.results;
                const rentNW = r.stratA.netWorthLiquid;
                const buyNW = r.stratB.netWorthLiquid;
                
                for (let i = 0; i < this.simYears; i++) {
                    if (buyNW[i] > rentNW[i]) return i + 1;
                }
                return null;
            },

            get narrativeHTML() {
                if (!this.results) return '';
                const r = this.results;
                const idx = this.simYears - 1;
                
                const strats = [
                    {name: 'Renting', s: r.stratA, type: 'Rent', active: true},
                    {name: 'Buying a Home', s: r.stratB, type: 'Buy', active: this.i.home.active && r.possibleB},
                    {name: 'Buying & Lodger', s: r.stratC, type: 'Buy', active: this.i.home.active && this.i.home.lodger.active && r.possibleB},
                    {name: 'BTL (Company)', s: r.stratD, type: 'Inv', active: this.i.btl.active && this.i.btl.wrappers.company && r.possibleD},
                    {name: 'BTL (Personal)', s: r.stratE, type: 'Inv', active: this.i.btl.active && this.i.btl.wrappers.personal && r.possibleE},
                    {name: 'Home + BTL', s: r.stratF, type: 'Mix', active: this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company && r.possibleF}
                ].filter(x => x.active).map(x => ({...x, nw: this.getNW(x.s, idx)}));
                
                strats.sort((a,b) => b.nw - a.nw);
                const winner = strats[0];
                const runnerUp = strats.length > 1 ? strats[1] : null; 
                
                let baseline = null;
                if (winner.type === 'Rent') {
                    baseline = runnerUp; 
                } else {
                    baseline = strats.find(s => s.type === 'Rent'); 
                }

                const fmt = (v) => `<strong>£${Math.round(v).toLocaleString()}</strong>`;
                const fmtK = (v) => `<strong>£${Math.round(v/1000)}k</strong>`;
                
                let html = `<div class="space-y-4 text-sm text-slate-700">`;
                
                if (baseline) {
                    html += `<div class="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                After ${this.simYears} years, <strong>${winner.name}</strong> results in a Net Worth of ${fmt(winner.nw)}.
                                Compared to <strong>${baseline.name}</strong> (${fmt(baseline.nw)}), you are better off by ${fmt(winner.nw - baseline.nw)}.
                             </div>`;
                } else {
                     html += `<div class="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                After ${this.simYears} years, <strong>${winner.name}</strong> results in a Net Worth of ${fmt(winner.nw)}.
                             </div>`;
                }

                const wBreakdown = winner.s.breakdown;
                html += `<div><h4 class="font-bold text-slate-900 mb-1">Why ${winner.name} wins:</h4>
                         <ul class="list-disc list-inside space-y-1 ml-1">`;
                
                if (winner.type === 'Rent') {
                    html += `<li>You avoided property ownership costs (Interest, Maintenance, Stamp Duty).</li>`;
                    html += `<li>Your "Dead Money" costs were limited to Rent (${fmtK(wBreakdown.rent[idx])}).</li>`;
                    html += `<li>The surplus cash invested in the stock market compounded significantly.</li>`;
                } else {
                    html += `<li>Although you paid ${fmtK(wBreakdown.interest[idx])} in Mortgage Interest, you gained significant Equity.</li>`;
                    html += `<li>Your property grew in value, acting as a "forced savings" account.</li>`;
                    if (wBreakdown.rent[idx] > 0) html += `<li>You earned rental income (Lodger/BTL) which offset costs.</li>`;
                }
                html += `</ul></div>`;
                
                if (runnerUp && baseline && runnerUp.name !== baseline.name) {
                     const diff = winner.nw - runnerUp.nw;
                     html += `<div class="mt-3 pt-3 border-t border-gray-100">
                                <h4 class="font-bold text-slate-900 mb-1 text-xs uppercase tracking-wide text-gray-500">Versus Next Best Option</h4>
                                <p class="text-xs">
                                    Note: This strategy also beat <strong>${runnerUp.name}</strong> by ${fmt(diff)}.
                                    ${winner.name.includes('Lodger') ? 'The extra tax-free income from the lodger provided the edge over a standard purchase.' : ''}
                                    ${winner.name.includes('BTL') ? 'The leverage from the additional property amplified gains.' : ''}
                                </p>
                              </div>`;
                }

                html += `</div>`;
                return html;
            },

            get headlineHTML() {
                if (!this.results) return '<h2>Calculating...</h2>';
                const idx = this.simYears - 1;
                const r = this.results;
                const strats = [
                    {name: 'Rent', val: this.getNW(r.stratA, idx), interest: 0, code: 'A', type: 'Rent', show: true},
                    {name: 'Buy Home', val: r.possibleB ? this.getNW(r.stratB, idx) : -Infinity, interest: r.possibleB ? r.stratB.totalInterest[idx] : 0, code: 'B', type: 'Buy', show: this.i.home.active},
                    {name: 'Buy Home + Lodger', val: r.possibleB ? this.getNW(r.stratC, idx) : -Infinity, interest: r.possibleB ? r.stratC.totalInterest[idx] : 0, code: 'C', type: 'Buy', show: this.i.home.active && this.i.home.lodger.active},
                    {name: 'BTL (Ltd Co)', val: r.possibleD ? this.getNW(r.stratD, idx) : -Infinity, interest: r.possibleD ? r.stratD.totalInterest[idx] : 0, code: 'D', type: 'Buy', show: this.i.btl.active && this.i.btl.wrappers.company},
                    {name: 'BTL (Personal)', val: r.possibleE ? this.getNW(r.stratE, idx) : -Infinity, interest: r.possibleE ? r.stratE.totalInterest[idx] : 0, code: 'E', type: 'Buy', show: this.i.btl.active && this.i.btl.wrappers.personal},
                    {name: 'Home + BTL', val: r.possibleF ? this.getNW(r.stratF, idx) : -Infinity, interest: r.possibleF ? r.stratF.totalInterest[idx] : 0, code: 'F', type: 'Buy', show: this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
                ].filter(s => s.show); 
                
                if (strats.length === 0) return '';
                strats.sort((a,b) => b.val - a.val);
                const winner = strats[0];
                
                if (!strats.some(s => s.type === 'Buy' && s.val > -Infinity) && this.i.home.active) return `<h2 class="text-2xl font-bold">Renting is the only option</h2><p class="opacity-90">Insufficient liquid assets for purchase.</p>`;
                
                const rentVal = this.getNW(r.stratA, idx);
                let title, desc, subtext, badge = '';
                const be = this.breakEven;
                if (this.i.home.active && r.possibleB) {
                    if (be) {
                        badge = `<span class="inline-block bg-white/20 text-white text-xs font-bold px-2 py-1 rounded ml-2">Breaks even in Year ${be} ⚖️</span>`;
                    } else {
                        badge = `<span class="inline-block bg-white/20 text-white text-xs font-bold px-2 py-1 rounded ml-2">Rent Wins Forever 📉</span>`;
                    }
                }
                
                if (winner.type === 'Rent') {
                    const runnerUp = strats[1];
                    const diff = winner.val - (runnerUp ? runnerUp.val : 0);
                    title = `Renting is the Wealthier Choice 🏖️ ${badge}`;
                    desc = `Projected to be <strong>£${Math.round(diff/1000)}k wealthier</strong> than ${runnerUp ? runnerUp.name : 'buying'}.`;
                    subtext = `You avoided mortgage interest and buying costs. Investing the surplus returns more.`;
                } else {
                    const diff = winner.val - rentVal;
                    title = `${winner.name} Wins 🏡 ${badge}`;
                    desc = `Projected to make you <strong>£${Math.round(diff/1000)}k wealthier</strong> than Renting.`;
                    subtext = `Although you paid interest, the property equity growth and leverage outweighed it.`;
                }
                return `<div class="flex flex-col md:flex-row md:items-center gap-4"><div class="flex-1"><h2 class="text-2xl font-bold leading-tight">${title}</h2><p class="text-lg mt-1">${desc}</p><p class="text-sm mt-2 opacity-80 border-l-2 border-white/30 pl-3">${subtext}</p></div></div>`;
            },

            get inspectorData() {
                if (!this.results) return [];
                const y = this.inspectorYear - 1;
                const r = this.results;
                const list = [
                    {name: 'Rent', nw: this.getNW(r.stratA, y), liq: r.stratA.liquidHistory[y], int: r.stratA.totalInterest[y], code: 'A', visible: true},
                    {name: 'Buy Home', nw: this.getNW(r.stratB, y), liq: r.stratB.liquidHistory[y], int: r.stratB.totalInterest[y], code: 'B', visible: r.possibleB && this.i.home.active},
                    {name: 'Lodger', nw: this.getNW(r.stratC, y), liq: r.stratC.liquidHistory[y], int: r.stratC.totalInterest[y], code: 'C', visible: r.possibleB && this.i.home.active && this.i.home.lodger.active},
                    {name: 'BTL (Co)', nw: this.getNW(r.stratD, y), liq: r.stratD.liquidHistory[y], int: r.stratD.totalInterest[y], code: 'D', visible: r.possibleD && this.i.btl.active && this.i.btl.wrappers.company},
                    {name: 'BTL (Pers)', nw: this.getNW(r.stratE, y), liq: r.stratE.liquidHistory[y], int: r.stratE.totalInterest[y], code: 'E', visible: r.possibleE && this.i.btl.active && this.i.btl.wrappers.personal},
                    {name: 'Home+BTL', nw: this.getNW(r.stratF, y), liq: r.stratF.liquidHistory[y], int: r.stratF.totalInterest[y], code: 'F', visible: r.possibleF && this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
                ].filter(s => s.visible).map(s => ({...s, eq: s.nw - s.liq}));

                const max = Math.max(...list.map(s=>s.nw)), min = Math.min(...list.map(s=>s.nw));
                return list.map(s => {
                    let highlightClass = (s.nw === max) ? "border-green-500 bg-green-50 ring-1 ring-green-500" : (s.nw === min && list.length>1) ? "border-red-300 bg-red-50 opacity-90" : "border-gray-300 bg-gray-50";
                    let badge = (s.nw === max) ? 'BEST' : (s.nw === min && list.length>1) ? 'WORST' : '';
                    let badgeClass = (s.nw === max) ? 'text-green-700 bg-green-200' : 'text-red-700 bg-red-200';
                    return { ...s, highlightClass, badge, badgeClass };
                });
            },

            get tableData() {
                if (!this.results) return [];
                const r = this.results;
                const strategies = [
                    {name: 'Rent', s: r.stratA, show: true},
                    {name: 'Buy Home', s: r.stratB, show: r.possibleB && this.i.home.active},
                    {name: 'Buy Home + Lodger', s: r.stratC, show: r.possibleB && this.i.home.active && this.i.home.lodger.active},
                    {name: 'BTL (Ltd Co)', s: r.stratD, show: r.possibleD && this.i.btl.active && this.i.btl.wrappers.company},
                    {name: 'BTL (Personal)', s: r.stratE, show: r.possibleE && this.i.btl.active && this.i.btl.wrappers.personal},
                    {name: 'Home + BTL', s: r.stratF, show: r.possibleF && this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
                ].filter(i => i.show);

                const years = [2, 5, 10, 15, 25, 40];
                const yearStats = {};
                years.forEach(y => {
                    const vals = strategies.map(str => this.getNW(str.s, y-1));
                    yearStats[y] = { max: Math.max(...vals), min: Math.min(...vals), count: vals.length };
                });

                return strategies.map(str => {
                    const cells = years.map(y => {
                        const val = this.getNW(str.s, y-1);
                        const stats = yearStats[y];
                        let style = "text-gray-600";
                        if (val === stats.max) style = "font-bold text-green-700 bg-green-50 rounded-lg";
                        else if (val === stats.min && stats.count > 1) style = "text-red-600 bg-red-50 rounded-lg";
                        return { val: `£${Math.round(val/1000).toLocaleString()}k`, style };
                    });
                    return { name: str.name, cells };
                });
            },
            
            get insights() {
                const tips = [];
                if (!this.i.home.active) return tips;
                
                const yield = (this.i.personal.rent.current * 12 / this.i.home.price) * 100;
                if (yield < 3.5) tips.push({icon: '📉', title: 'Low Yield', text: `Rent is only ${yield.toFixed(1)}% of price. Renting is likely superior.`});
                else if (yield > 6) tips.push({icon: '📈', title: 'High Yield', text: `Rent is ${yield.toFixed(1)}% of price. Buying saves significant cost.`});
                
                if (this.i.personal.stockGrowth > 10) tips.push({icon: '🚀', title: 'Aggressive Stocks', text: '10%+ growth is historically optimistic.'});
                if (this.i.home.depositPct < 15) tips.push({icon: '⚖️', title: 'High Leverage', text: 'Low deposit amplifies both gains and negative equity risks.'});
                return tips;
            },

            calculate() {
                try {
                    this.results = Engine.simulateStrategies(this.payload);
                    this.updateCharts();
                } catch(e) { console.error("Calc Error", e); }
            },
            
            updateCharts() {
                if (!this.results) return;
                const r = this.results;
                const len = this.simYears;
                const labels = Array.from({length: len}, (_, i) => `Year ${i+1}`);
                
                const getData = (s) => (this.valuationMode === 'gross' ? s.netWorth : s.netWorthLiquid).slice(0, len);
                const mkDs = (lbl, s, color, hidden) => ({ label: lbl, data: getData(s), borderColor: color, borderWidth: 2, tension: 0.3, hidden });
                
                const nwDatasets = [
                    mkDs('Rent', r.stratA, '#94a3b8', false)
                ];
                
                if (this.i.home.active) {
                    nwDatasets.push(mkDs('Buy Home', r.stratB, '#3b82f6', !r.possibleB));
                    if (this.i.home.lodger.active) nwDatasets.push(mkDs('Buy Home + Lodger', r.stratC, '#10b981', !r.possibleB));
                }
                if (this.i.btl.active) {
                    if (this.i.btl.wrappers.company) nwDatasets.push(mkDs('BTL (Ltd Co)', r.stratD, '#8b5cf6', !r.possibleD));
                    if (this.i.btl.wrappers.personal) nwDatasets.push(mkDs('BTL (Personal)', r.stratE, '#f97316', !r.possibleE));
                }
                if (this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company) {
                    nwDatasets.push(mkDs('Home + BTL', r.stratF, '#eab308', !r.possibleF));
                }
                
                // Use closure variable nwChart
                if (nwChart) {
                    nwChart.data.labels = labels;
                    nwChart.data.datasets = nwDatasets;
                    if (nwChart.options.plugins.verticalLine) {
                        nwChart.options.plugins.verticalLine.year = this.inspectorYear;
                    }
                    nwChart.update('none');
                } else {
                    const verticalLinePlugin = {
                        id: 'verticalLine',
                        afterDraw: (chart) => {
                            if (chart.config.options.plugins.verticalLine && chart.config.options.plugins.verticalLine.year) {
                                const ctx = chart.ctx;
                                if (!ctx) return;
                                
                                const year = chart.config.options.plugins.verticalLine.year;
                                const xAxis = chart.scales.x; const yAxis = chart.scales.y;
                                
                                if (!xAxis || !yAxis) return;

                                const xPixel = xAxis.getPixelForValue(year - 1);
                                if (xPixel >= xAxis.left && xPixel <= xAxis.right) {
                                    ctx.save(); ctx.beginPath(); ctx.moveTo(xPixel, yAxis.top); ctx.lineTo(xPixel, yAxis.bottom);
                                    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(79, 70, 229, 0.4)'; ctx.setLineDash([5, 5]);
                                    ctx.stroke(); ctx.restore();
                                }
                            }
                        }
                    };
                    
                    nwChart = new Chart(document.getElementById('netWorthChart').getContext('2d'), {
                        type: 'line', data: { labels, datasets: nwDatasets },
                        plugins: [verticalLinePlugin],
                        options: { 
                            responsive: true, maintainAspectRatio: false, 
                            interaction: { mode: 'index', intersect: false }, 
                            scales: { y: { ticks: { callback: v => '£' + (v/1000).toFixed(0) + 'k' } } },
                            plugins: { verticalLine: { year: this.inspectorYear } }
                        }
                    });
                }

                // Dead Money Breakdown
                const idx = len - 1;
                const strategies = [
                    {l:'Rent', s:r.stratA, v:true},
                    {l:'Buy Home', s:r.stratB, v:r.possibleB && this.i.home.active},
                    {l:'Lodger', s:r.stratC, v:r.possibleB && this.i.home.active && this.i.home.lodger.active},
                    {l:'BTL (Co)', s:r.stratD, v:r.possibleD && this.i.btl.active && this.i.btl.wrappers.company},
                    {l:'BTL (Pers)', s:r.stratE, v:r.possibleE && this.i.btl.active && this.i.btl.wrappers.personal},
                    {l:'Home+BTL', s:r.stratF, v:r.possibleF && this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
                ].filter(x => x.v);

                const labelsDM = strategies.map(x => x.l);
                const dsRent = { label: 'Rent', data: strategies.map(x => x.s.breakdown.rent[idx]), backgroundColor: '#94a3b8', stack: 'Stack 0' };
                const dsInt = { label: 'Interest', data: strategies.map(x => x.s.breakdown.interest[idx]), backgroundColor: '#ef4444', stack: 'Stack 0' };
                const dsMaint = { label: 'Maintenance', data: strategies.map(x => x.s.breakdown.maintenance[idx]), backgroundColor: '#f59e0b', stack: 'Stack 0' };
                const dsTax = { label: 'Tax', data: strategies.map(x => x.s.breakdown.tax[idx]), backgroundColor: '#8b5cf6', stack: 'Stack 0' };
                const dsFees = { label: 'Fees (Stamp/Legal)', data: strategies.map(x => x.s.breakdown.fees[idx]), backgroundColor: '#64748b', stack: 'Stack 0' };

                if (dmChart) {
                    dmChart.data.labels = labelsDM;
                    dmChart.data.datasets = [dsRent, dsInt, dsMaint, dsTax, dsFees];
                    dmChart.update('none');
                } else {
                    dmChart = new Chart(document.getElementById('deadMoneyChart').getContext('2d'), {
                        type: 'bar', 
                        data: { 
                            labels: labelsDM, 
                            datasets: [dsRent, dsInt, dsMaint, dsTax, dsFees] 
                        },
                        options: { 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            scales: { 
                                x: { stacked: true }, 
                                y: { stacked: true, ticks: { callback: v => '£' + (v/1000).toFixed(0) + 'k' } } 
                            },
                            interaction: { mode: 'index', intersect: false }
                        }
                    });
                }
            }
        };
    });
});