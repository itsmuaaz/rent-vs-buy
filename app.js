document.addEventListener('alpine:init', () => {
    Alpine.data('calculator', () => ({
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
                buyingCost: 2000, sellingCostPct: 1.5 // Added missing fields
            },
            settings: { valuationMode: 'liquid', stockCrash: false, propCrash: false }
        },
        
        results: null,
        nwChart: null,
        dmChart: null,
        
        init() {
            // Load state from LocalStorage (migration logic needed?)
            const saved = localStorage.getItem('rentVsBuyData_v3');
            if (saved) {
                try { 
                    const parsed = JSON.parse(saved);
                    // Simple deep merge or assign
                    if(parsed.personal) this.i = parsed; 
                } catch(e){}
            }
            
            this.$watch('i', () => { this.calculate(); this.save(); }, { deep: true });
            this.$watch('simYears', () => this.updateCharts());
            this.$watch('valuationMode', () => { this.i.settings.valuationMode = this.valuationMode; this.updateCharts(); });
            
            // Initial calculation
            this.$nextTick(() => { this.calculate(); });
        },
        
        get payload() {
            // Pass the state directly, but ensure settings are synced
            this.i.settings.valuationMode = this.valuationMode;
            // Deep copy to avoid reference issues
            return JSON.parse(JSON.stringify(this.i));
        },
        
        get errors() {
            const errs = [];
            // Affordability Check Logic
            const P = this.i.personal;
            
            // Check Home Affordability
            if (this.i.home.active) {
                const H = this.i.home;
                const stamp = Engine.calculateStampDuty(H.price, 'personal', P.isFTB);
                const upfront = (H.price * H.depositPct/100) + stamp + H.buyingCost + H.renoCost;
                if (upfront > P.liquidAssets) errs.push(`Insufficient funds for Home (Need £${Math.round(upfront/1000)}k)`);
            }
            
            return errs;
        },

        getNW(s, idx) {
            if (!s) return -Infinity;
            const arr = (this.valuationMode === 'gross') ? s.netWorth : s.netWorthLiquid;
            return arr ? (arr[idx] || 0) : 0;
        },

        get headlineHTML() {
            if (!this.results) return '<h2>Calculating...</h2>';
            const idx = this.simYears - 1;
            const r = this.results;
            const strats = [
                {name: 'Renting', val: this.getNW(r.stratA, idx), interest: 0, code: 'A', type: 'Rent', show: true},
                {name: 'Buy & Live In', val: r.possibleB ? this.getNW(r.stratB, idx) : -Infinity, interest: r.possibleB ? r.stratB.totalInterest[idx] : 0, code: 'B', type: 'Buy', show: this.i.home.active},
                {name: 'Buy + Lodger', val: r.possibleB ? this.getNW(r.stratC, idx) : -Infinity, interest: r.possibleB ? r.stratC.totalInterest[idx] : 0, code: 'C', type: 'Buy', show: this.i.home.active && this.i.home.lodger.active},
                {name: 'Company BTL', val: r.possibleD ? this.getNW(r.stratD, idx) : -Infinity, interest: r.possibleD ? r.stratD.totalInterest[idx] : 0, code: 'D', type: 'Buy', show: this.i.btl.active && this.i.btl.wrappers.company},
                {name: 'Personal BTL', val: r.possibleE ? this.getNW(r.stratE, idx) : -Infinity, interest: r.possibleE ? r.stratE.totalInterest[idx] : 0, code: 'E', type: 'Buy', show: this.i.btl.active && this.i.btl.wrappers.personal},
                {name: 'Home + Co. BTL', val: r.possibleF ? this.getNW(r.stratF, idx) : -Infinity, interest: r.possibleF ? r.stratF.totalInterest[idx] : 0, code: 'F', type: 'Buy', show: this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
            ].filter(s => s.show); 
            
            if (strats.length === 0) return '';
            strats.sort((a,b) => b.val - a.val);
            const winner = strats[0];
            
            if (!strats.some(s => s.type === 'Buy' && s.val > -Infinity) && this.i.home.active) return `<h2 class="text-2xl font-bold">Renting is the only option</h2><p class="opacity-90">Insufficient liquid assets for purchase.</p>`;
            
            const rentVal = this.getNW(r.stratA, idx);
            let title, desc, subtext;
            
            if (winner.type === 'Rent') {
                const runnerUp = strats[1];
                const diff = winner.val - (runnerUp ? runnerUp.val : 0);
                title = "Renting is the Wealthier Choice 🏖️";
                desc = `Projected to be <strong>£${Math.round(diff/1000)}k wealthier</strong> than ${runnerUp ? runnerUp.name : 'buying'}.`;
                subtext = `You avoided mortgage interest and buying costs. Investing the surplus returns more.`;
            } else {
                const diff = winner.val - rentVal;
                title = `${winner.name} Wins 🏡`;
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
                {name: 'Buy', nw: this.getNW(r.stratB, y), liq: r.stratB.liquidHistory[y], int: r.stratB.totalInterest[y], code: 'B', visible: r.possibleB && this.i.home.active},
                {name: 'Lodger', nw: this.getNW(r.stratC, y), liq: r.stratC.liquidHistory[y], int: r.stratC.totalInterest[y], code: 'C', visible: r.possibleB && this.i.home.active && this.i.home.lodger.active},
                {name: 'Co. BTL', nw: this.getNW(r.stratD, y), liq: r.stratD.liquidHistory[y], int: r.stratD.totalInterest[y], code: 'D', visible: r.possibleD && this.i.btl.active && this.i.btl.wrappers.company},
                {name: 'Pers. BTL', nw: this.getNW(r.stratE, y), liq: r.stratE.liquidHistory[y], int: r.stratE.totalInterest[y], code: 'E', visible: r.possibleE && this.i.btl.active && this.i.btl.wrappers.personal},
                {name: 'Home+Co', nw: this.getNW(r.stratF, y), liq: r.stratF.liquidHistory[y], int: r.stratF.totalInterest[y], code: 'F', visible: r.possibleF && this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
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
                {name: 'Rent & Invest', s: r.stratA, show: true},
                {name: 'Buy & Live In', s: r.stratB, show: r.possibleB && this.i.home.active},
                {name: 'Buy + Lodger', s: r.stratC, show: r.possibleB && this.i.home.active && this.i.home.lodger.active},
                {name: 'Company BTL', s: r.stratD, show: r.possibleD && this.i.btl.active && this.i.btl.wrappers.company},
                {name: 'Personal BTL', s: r.stratE, show: r.possibleE && this.i.btl.active && this.i.btl.wrappers.personal},
                {name: 'Home + Co. BTL', s: r.stratF, show: r.possibleF && this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
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
                mkDs('Rent & Invest', r.stratA, '#94a3b8', false)
            ];
            
            if (this.i.home.active) {
                nwDatasets.push(mkDs('Buy & Live In', r.stratB, '#3b82f6', !r.possibleB));
                if (this.i.home.lodger.active) nwDatasets.push(mkDs('Buy + Lodger', r.stratC, '#10b981', !r.possibleB));
            }
            if (this.i.btl.active) {
                if (this.i.btl.wrappers.company) nwDatasets.push(mkDs('Company BTL', r.stratD, '#8b5cf6', !r.possibleD));
                if (this.i.btl.wrappers.personal) nwDatasets.push(mkDs('Personal BTL', r.stratE, '#f97316', !r.possibleE));
            }
            if (this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company) {
                nwDatasets.push(mkDs('Home + Co. BTL', r.stratF, '#eab308', !r.possibleF));
            }
            
            if (this.nwChart) this.nwChart.destroy();
            this.nwChart = new Chart(document.getElementById('netWorthChart').getContext('2d'), {
                type: 'line', data: { labels, datasets: nwDatasets },
                options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { ticks: { callback: v => '£' + (v/1000).toFixed(0) + 'k' } } } }
            });

            // Dead Money Breakdown
            const idx = len - 1;
            const strategies = [
                {l:'Rent', s:r.stratA, v:true},
                {l:'Buy & Live In', s:r.stratB, v:r.possibleB && this.i.home.active},
                {l:'Buy + Lodger', s:r.stratC, v:r.possibleB && this.i.home.active && this.i.home.lodger.active},
                {l:'Co. BTL', s:r.stratD, v:r.possibleD && this.i.btl.active && this.i.btl.wrappers.company},
                {l:'Pers. BTL', s:r.stratE, v:r.possibleE && this.i.btl.active && this.i.btl.wrappers.personal},
                {l:'Home + Co.', s:r.stratF, v:r.possibleF && this.i.home.active && this.i.btl.active && this.i.btl.wrappers.company}
            ].filter(x => x.v);

            const labelsDM = strategies.map(x => x.l);
            const dsRent = { label: 'Rent', data: strategies.map(x => x.s.breakdown.rent[idx]), backgroundColor: '#94a3b8', stack: 'Stack 0' };
            const dsInt = { label: 'Interest', data: strategies.map(x => x.s.breakdown.interest[idx]), backgroundColor: '#ef4444', stack: 'Stack 0' };
            const dsMaint = { label: 'Maintenance', data: strategies.map(x => x.s.breakdown.maintenance[idx]), backgroundColor: '#f59e0b', stack: 'Stack 0' };
            const dsTax = { label: 'Tax', data: strategies.map(x => x.s.breakdown.tax[idx]), backgroundColor: '#8b5cf6', stack: 'Stack 0' };
            const dsFees = { label: 'Fees (Stamp/Legal)', data: strategies.map(x => x.s.breakdown.fees[idx]), backgroundColor: '#64748b', stack: 'Stack 0' };

            if (this.dmChart) this.dmChart.destroy();
            this.dmChart = new Chart(document.getElementById('deadMoneyChart').getContext('2d'), {
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
        },

        applyPreset(name) {
            const presets = {
                nomad: {
                    personal: { liquidAssets: 100000, rent: {current:800}, stockGrowth: 12, monthlySavings: 2000, isFTB: true },
                    home: { active: false },
                    btl: { active: false }
                },
                london: {
                    personal: { liquidAssets: 130000, isaBalance: 30000, monthlySavings: 1500, taxBand: 'higher', rent: {current:2400}, isFTB: true },
                    home: { active: true, price: 500000, depositPct: 20, rate: 4.5, serviceCharge: 2000, repairRate: 0.5 },
                    btl: { active: false }
                },
                starter: {
                    personal: { liquidAssets: 40000, isaBalance: 5000, monthlySavings: 800, stockGrowth: 8, rent: {current:1200}, isFTB: true, taxBand: 'basic' },
                    home: { active: true, price: 280000, depositPct: 10, rate: 4.8, renoCost: 5000, lodger: {active: true, income: 625, years: 5} },
                    btl: { active: false }
                },
                landlord: {
                    personal: { liquidAssets: 90000, isaBalance: 10000, monthlySavings: 3000, stockGrowth: 8, rent: {current:2500}, isFTB: false, taxBand: 'additional' },
                    home: { active: false }, // Renting
                    btl: { active: true, price: 200000, depositPct: 25, rentYield: 6, wrappers: { company: true, personal: false } }
                }
            };
            
            const p = presets[name];
            if (p) {
                if(p.personal) Object.assign(this.i.personal, p.personal);
                if(p.home) { Object.assign(this.i.home, p.home); if(p.home.lodger) Object.assign(this.i.home.lodger, p.home.lodger); }
                if(p.btl) { Object.assign(this.i.btl, p.btl); if(p.btl.wrappers) Object.assign(this.i.btl.wrappers, p.btl.wrappers); }
            }
        },

        save() {
            localStorage.setItem('rentVsBuyData_v3', JSON.stringify(this.i));
        }
    }));
});