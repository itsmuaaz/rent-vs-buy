document.addEventListener('alpine:init', () => {
    Alpine.data('calculator', () => ({
        isAdvanced: false,
        isStockCrash: false,
        isPropCrash: false,
        simYears: 10,
        inspectorYear: 5,
        valuationMode: 'liquid',
        copied: false,
        i: { // inputs
            liquidAssets: 50000, isaBalance: 20000, monthlySavings: 1000, stockGrowth: 8,
            currentRent: 1500, rentInflation: 3,
            propertyPrice: 400000, renoCost: 60000, postWorkValue: 525000, buyingCost: 2000, maintenanceRate: 1.0,
            depositPercent: 25, mortgageTerm: 30, ratePersonal: 4.5, rateCompany: 5.5,
            isFTB: true, lodgerIncome: 900, lodgerYears: 2, taxBand: 'additional', sellingCostPct: 1.5
        },
        results: null,
        nwChart: null,
        dmChart: null,
        
        init() {
            // Load state
            const p = new URLSearchParams(window.location.search);
            if ([...p.keys()].length > 0) {
                for (const [k, v] of p) { if (this.i.hasOwnProperty(k)) this.i[k] = (v === 'true' || v === 'false') ? v === 'true' : parseFloat(v); }
            } else {
                const saved = localStorage.getItem('rentVsBuyData');
                if (saved) try { Object.assign(this.i, JSON.parse(saved)); } catch(e){}
            }
            
            this.$watch('i', () => { this.calculate(); this.save(); }, { deep: true });
            this.$watch('simYears', () => this.updateCharts());
            this.$watch('isStockCrash', () => this.calculate());
            this.$watch('isPropCrash', () => this.calculate());
            this.$watch('valuationMode', () => this.updateCharts());
            this.$watch('isAdvanced', () => this.updateCharts());
            
            // Initial calculation and charts setup
            this.$nextTick(() => { this.calculate(); });
        },
        
        get payload() {
            return {
                liquid: this.i.liquidAssets, isa: this.i.isaBalance, monthlySavings: this.i.monthlySavings,
                stockGrowth: this.i.stockGrowth/100, rent: this.i.currentRent, rentInf: this.i.rentInflation/100,
                price: this.i.propertyPrice, reno: this.i.renoCost, postValue: this.i.postWorkValue,
                depositPct: this.i.depositPercent/100, term: this.i.mortgageTerm,
                rateP: this.i.ratePersonal, rateC: this.i.rateCompany, isFTB: this.i.isFTB,
                lodgerInc: this.i.lodgerIncome, lodgerYears: this.i.lodgerYears, taxBand: this.i.taxBand,
                buyingCost: this.i.buyingCost, maintenanceRate: this.i.maintenanceRate,
                sellingCostPct: this.i.sellingCostPct,
                isStockCrash: this.isStockCrash, isPropCrash: this.isPropCrash
            };
        },
        
        get errors() {
            const errs = [];
            // We need a helper to check affordability without full simulation if possible, or just use simulation result
            // For now, simple check:
            const stamp = Engine.calculateStampDuty(this.i.propertyPrice, 'personal', this.i.isFTB);
            const upfront = (this.i.propertyPrice * this.i.depositPercent/100) + stamp + 2000 + this.i.renoCost;
            if (upfront > this.i.liquidAssets) errs.push(`Insufficient funds for Buy (Need £${Math.round(upfront/1000)}k)`);
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
                {name: 'Renting', val: this.getNW(r.stratA, idx), interest: 0, code: 'A', type: 'Rent'},
                {name: 'Buy & Live In', val: r.possibleB ? this.getNW(r.stratB, idx) : -Infinity, interest: r.possibleB ? r.stratB.totalInterest[idx] : 0, code: 'B', type: 'Buy'},
                {name: 'Buy + Lodger', val: r.possibleB ? this.getNW(r.stratC, idx) : -Infinity, interest: r.possibleB ? r.stratC.totalInterest[idx] : 0, code: 'C', type: 'Buy', show: this.isAdvanced},
                {name: 'Company BTL', val: r.possibleD ? this.getNW(r.stratD, idx) : -Infinity, interest: r.possibleD ? r.stratD.totalInterest[idx] : 0, code: 'D', type: 'Buy', show: this.isAdvanced},
                {name: 'Personal BTL', val: r.possibleE ? this.getNW(r.stratE, idx) : -Infinity, interest: r.possibleE ? r.stratE.totalInterest[idx] : 0, code: 'E', type: 'Buy', show: this.isAdvanced},
                {name: 'Home + Co. BTL', val: r.possibleF ? this.getNW(r.stratF, idx) : -Infinity, interest: r.possibleF ? r.stratF.totalInterest[idx] : 0, code: 'F', type: 'Buy', show: this.isAdvanced}
            ].filter(s => s.show !== false); 
            
            strats.sort((a,b) => b.val - a.val);
            const winner = strats[0];
            
            if (!strats.some(s => s.type === 'Buy' && s.val > -Infinity)) return `<h2 class="text-2xl font-bold">Renting is the only option</h2><p class="opacity-90">Insufficient liquid assets.</p>`;
            
            const rentVal = this.getNW(r.stratA, idx);
            let title, desc, subtext;
            if (winner.type === 'Rent') {
                const diff = winner.val - strats[1].val;
                title = "Renting is the Wealthier Choice 🏖️";
                desc = `Projected to be <strong>£${Math.round(diff/1000)}k wealthier</strong> than ${strats[1].name}.`;
                subtext = `You avoided paying <strong>£${Math.round(strats[1].interest/1000)}k</strong> in mortgage interest. Investing the surplus returns more.`;
            } else {
                const diff = winner.val - rentVal;
                title = `${winner.name} Wins 🏡`;
                desc = `Projected to make you <strong>£${Math.round(diff/1000)}k wealthier</strong> than Renting.`;
                subtext = `Although you paid <strong>£${Math.round(winner.interest/1000)}k</strong> in interest, the property equity growth outweighed it.`;
            }
            return `<div class="flex flex-col md:flex-row md:items-center gap-4"><div class="flex-1"><h2 class="text-2xl font-bold leading-tight">${title}</h2><p class="text-lg mt-1">${desc}</p><p class="text-sm mt-2 opacity-80 border-l-2 border-white/30 pl-3">${subtext}</p></div></div>`;
        },

        get inspectorData() {
            if (!this.results) return [];
            const y = this.inspectorYear - 1;
            const r = this.results;
            const list = [
                {name: 'Rent', nw: this.getNW(r.stratA, y), liq: r.stratA.liquidHistory[y], int: r.stratA.totalInterest[y], code: 'A', visible: true},
                {name: 'Buy', nw: this.getNW(r.stratB, y), liq: r.stratB.liquidHistory[y], int: r.stratB.totalInterest[y], code: 'B', visible: r.possibleB},
                {name: 'Lodger', nw: this.getNW(r.stratC, y), liq: r.stratC.liquidHistory[y], int: r.stratC.totalInterest[y], code: 'C', visible: r.possibleB && this.isAdvanced},
                {name: 'Co. BTL', nw: this.getNW(r.stratD, y), liq: r.stratD.liquidHistory[y], int: r.stratD.totalInterest[y], code: 'D', visible: r.possibleD && this.isAdvanced},
                {name: 'Pers. BTL', nw: this.getNW(r.stratE, y), liq: r.stratE.liquidHistory[y], int: r.stratE.totalInterest[y], code: 'E', visible: r.possibleE && this.isAdvanced},
                {name: 'Home+Co', nw: this.getNW(r.stratF, y), liq: r.stratF.liquidHistory[y], int: r.stratF.totalInterest[y], code: 'F', visible: r.possibleF && this.isAdvanced}
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
                {name: 'Buy & Live In', s: r.stratB, show: r.possibleB},
                {name: 'Buy + Lodger', s: r.stratC, show: r.possibleB && this.isAdvanced},
                {name: 'Company BTL', s: r.stratD, show: r.possibleD && this.isAdvanced},
                {name: 'Personal BTL', s: r.stratE, show: r.possibleE && this.isAdvanced},
                {name: 'Home + Co. BTL', s: r.stratF, show: r.possibleF && this.isAdvanced}
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
            const yield = (this.i.currentRent * 12 / this.i.propertyPrice) * 100;
            if (yield < 3.5) tips.push({icon: '📉', title: 'Low Yield', text: `Rent is only ${yield.toFixed(1)}% of price. Renting is likely superior.`});
            else if (yield > 6) tips.push({icon: '📈', title: 'High Yield', text: `Rent is ${yield.toFixed(1)}% of price. Buying saves significant cost.`});
            if (this.i.stockGrowth > 10) tips.push({icon: '🚀', title: 'Aggressive Stocks', text: '10%+ growth is historically optimistic.'});
            if (this.i.depositPercent < 15) tips.push({icon: '⚖️', title: 'High Leverage', text: 'Low deposit amplifies both gains and negative equity risks.'});
            return tips;
        },

        calculate() {
            this.results = Engine.simulateStrategies(this.payload);
            this.updateCharts();
        },
        
        updateCharts() {
            if (!this.results) return;
            const r = this.results;
            const len = this.simYears;
            const labels = Array.from({length: len}, (_, i) => `Year ${i+1}`);
            
            const getData = (s) => (this.valuationMode === 'gross' ? s.netWorth : s.netWorthLiquid).slice(0, len);
            const mkDs = (lbl, s, color, hidden) => ({ label: lbl, data: getData(s), borderColor: color, borderWidth: 2, tension: 0.3, hidden });
            
            const nwDatasets = [
                mkDs('Rent & Invest', r.stratA, '#94a3b8', false),
                mkDs('Buy & Live In', r.stratB, '#3b82f6', !r.possibleB)
            ];
            if (this.isAdvanced) {
                nwDatasets.push(
                    mkDs('Buy + Lodger', r.stratC, '#10b981', !r.possibleB),
                    mkDs('Company BTL', r.stratD, '#8b5cf6', !r.possibleD),
                    mkDs('Personal BTL', r.stratE, '#f97316', !r.possibleE),
                    mkDs('Home + Co. BTL', r.stratF, '#eab308', !r.possibleF)
                );
            }
            // Filter out hidden entirely if !isAdvanced is handled by pushing logic
            
            if (this.nwChart) this.nwChart.destroy();
            this.nwChart = new Chart(document.getElementById('netWorthChart').getContext('2d'), {
                type: 'line', data: { labels, datasets: nwDatasets },
                options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { ticks: { callback: v => '£' + (v/1000).toFixed(0) + 'k' } } } }
            });

            // Dead Money Breakdown
            const idx = len - 1;
            const strategies = [
                {l:'Rent', s:r.stratA, v:true},
                {l:'Buy & Live In', s:r.stratB, v:r.possibleB},
                {l:'Buy + Lodger', s:r.stratC, v:r.possibleB && this.isAdvanced},
                {l:'Co. BTL', s:r.stratD, v:r.possibleD && this.isAdvanced},
                {l:'Pers. BTL', s:r.stratE, v:r.possibleE && this.isAdvanced},
                {l:'Home + Co.', s:r.stratF, v:r.possibleF && this.isAdvanced}
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
                nomad: { liquidAssets: 100000, isaBalance: 20000, monthlySavings: 2000, stockGrowth: 12, currentRent: 800, propertyPrice: 350000, renoCost: 0, isFTB: true, lodgerIncome: 0, taxBand: 'basic', depositPercent: 25 },
                london: { liquidAssets: 130000, isaBalance: 30000, monthlySavings: 1500, stockGrowth: 7, currentRent: 2400, propertyPrice: 500000, renoCost: 10000, isFTB: true, lodgerIncome: 0, taxBand: 'higher', depositPercent: 20 },
                starter: { liquidAssets: 40000, isaBalance: 5000, monthlySavings: 800, stockGrowth: 8, currentRent: 1200, propertyPrice: 280000, renoCost: 5000, isFTB: true, lodgerIncome: 625, lodgerYears: 5, taxBand: 'basic', depositPercent: 10 },
                landlord: { liquidAssets: 90000, isaBalance: 10000, monthlySavings: 3000, stockGrowth: 8, currentRent: 2500, propertyPrice: 200000, renoCost: 15000, isFTB: false, lodgerIncome: 0, taxBand: 'additional', depositPercent: 25 }
            };
            if (presets[name]) Object.assign(this.i, presets[name]);
        },

        save() {
            const p = new URLSearchParams();
            Object.entries(this.i).forEach(([k, v]) => p.set(k, v));
            window.history.replaceState({}, '', `${window.location.pathname}?${p.toString()}`);
            localStorage.setItem('rentVsBuyData', JSON.stringify(this.i));
        },

        copyLink() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.copied = true; setTimeout(() => this.copied = false, 2000);
            });
        }
    }));
});