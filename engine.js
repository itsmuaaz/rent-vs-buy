/**
 * @typedef {Object} TaxRates
 * @property {number} income - Income Tax Rate
 * @property {number} cgt - Capital Gains Tax Rate
 * @property {number} div - Dividend Tax Rate
 * @property {number} corp - Corporation Tax Rate
 */

/**
 * @typedef {Object} PersonalConfig
 * @property {number} taxBand - Tax band ('basic', 'higher', 'additional')
 * @property {number} liquidAssets - Total liquid assets (£)
 * @property {number} isaBalance - Amount held in ISA (£)
 * @property {number} monthlySavings - Monthly savings contribution (£)
 * @property {number} stockGrowth - Annual stock market growth (%)
 * @property {number} propertyGrowth - Annual property market growth (%)
 * @property {boolean} [isFTB] - First Time Buyer status
 * @property {Object} rent
 * @property {number} rent.current - Current monthly rent (£)
 * @property {number} rent.inflation - Annual rent inflation (%)
 */

/**
 * @typedef {Object} LodgerConfig
 * @property {boolean} active - Is lodger active?
 * @property {number} income - Monthly lodger income (£)
 * @property {number} years - Duration of lodger stay (years)
 */

/**
 * @typedef {Object} HomeConfig
 * @property {boolean} active - Is buying a home active?
 * @property {number} price - Property price (£)
 * @property {number} depositPct - Deposit percentage (%)
 * @property {number} rate - Mortgage interest rate (%)
 * @property {number} term - Mortgage term (years)
 * @property {number} serviceCharge - Annual service charge (£)
 * @property {number} repairRate - Annual maintenance rate (%)
 * @property {number} buyingCost - Buying fees (£)
 * @property {number} sellingCostPct - Selling fees (%)
 * @property {number} renoCost - Renovation cost (£)
 * @property {number} [postWorkValue] - Value after renovation (£)
 * @property {number} [overpayment] - Monthly overpayment (£)
 * @property {LodgerConfig} lodger - Lodger settings
 */

/**
 * @typedef {Object} WrapperConfig
 * @property {boolean} personal - Personal ownership
 * @property {boolean} company - Ltd Company ownership
 */

/**
 * @typedef {Object} BTLConfig
 * @property {boolean} active - Is BTL active?
 * @property {number} price - Property price (£)
 * @property {number} depositPct - Deposit percentage (%)
 * @property {number} rentYield - Annual rent yield (%)
 * @property {number} serviceCharge - Annual service charge (£)
 * @property {number} repairRate - Annual maintenance rate (%)
 * @property {number} buyingCost - Buying fees (£)
 * @property {number} sellingCostPct - Selling fees (%)
 * @property {string} mortgageType - 'interestOnly' or 'repayment'
 * @property {number} term - Mortgage term (years)
 * @property {number} ratePersonal - Interest rate for personal (%)
 * @property {number} rateCompany - Interest rate for company (%)
 * @property {WrapperConfig} wrappers - Ownership types enabled
 * @property {number} [overpayment] - Monthly overpayment (£)
 */

/**
 * @typedef {Object} SimulationInput
 * @property {PersonalConfig} personal
 * @property {HomeConfig} home
 * @property {BTLConfig} btl
 * @property {Object} settings
 * @property {boolean} [settings.stockCrash]
 * @property {boolean} [settings.propCrash]
 */

/**
 * @typedef {Object} StrategyResult
 * @property {string} name
 * @property {number[]} netWorth - Array of annual Net Worth (Gross)
 * @property {number[]} netWorthLiquid - Array of annual Net Worth (Liquid)
 * @property {number[]} liquidHistory - Array of liquid assets over time
 * @property {number[]} deadMoney - Array of cumulative sunk costs
 * @property {Object} breakdown
 * @property {number[]} breakdown.interest
 * @property {number[]} breakdown.maintenance
 * @property {number[]} breakdown.tax
 * @property {number[]} breakdown.rent
 * @property {number[]} breakdown.fees
 */

/**
 * @typedef {Object} SimulationResult
 * @property {StrategyResult} stratA - Rent & Invest
 * @property {StrategyResult} stratB - Buy Home
 * @property {StrategyResult} stratC - Buy + Lodger
 * @property {StrategyResult} stratD - BTL (Ltd)
 * @property {StrategyResult} stratE - BTL (Personal)
 * @property {StrategyResult} stratF - Home + BTL
 * @property {boolean} possibleB
 * @property {boolean} possibleD
 * @property {boolean} possibleE
 * @property {boolean} possibleF
 */

const Engine = {};

/**
 * Base class for all financial strategies.
 * Defines the common interface and state management.
 * @abstract
 */
Engine.Strategy = class Strategy {
    /**
     * @param {string} name - Name of the strategy
     */
    constructor(name) {
        if (new.target === Engine.Strategy) {
            throw new Error("Cannot instantiate abstract class Strategy directly.");
        }
        this.name = name;
        /** @type {number[]} */
        this.netWorth = [];
        /** @type {number[]} */
        this.netWorthLiquid = [];
        /** @type {number[]} */
        this.liquidHistory = [];
        /** @type {number[]} */
        this.deadMoney = [];
        /** @type {Object} */
        this.breakdown = {
            interest: [],
            maintenance: [],
            tax: [],
            rent: [],
            fees: []
        };
    }

    /**
     * Simulate a single month.
     * @abstract
     * @param {number} monthIndex - 0-based month index
     * @param {SimulationInput} input - Global input configuration
     * @param {TaxRates} rates - Current tax rates
     */
    simulateMonth(monthIndex, input, rates) {
        throw new Error("Method 'simulateMonth()' must be implemented.");
    }

    /**
     * Calculate exit value at the end of a year.
     * @abstract
     * @param {number} year - 1-based year
     * @param {SimulationInput} input - Global input configuration
     * @param {TaxRates} rates - Current tax rates
     */
    calculateExit(year, input, rates) {
        throw new Error("Method 'calculateExit()' must be implemented.");
    }

    /**
     * Helper to record results for a year.
     * @param {number} gross - Gross Net Worth
     * @param {number} liquid - Liquid Net Worth
     * @param {number} liquidity - Liquid Assets available
     * @param {number} dead - Cumulative Dead Money
     * @param {Object} breakdown - Annual breakdown of costs
     */
    recordYear(gross, liquid, liquidity, dead, breakdown) {
        this.netWorth.push(gross);
        this.netWorthLiquid.push(liquid);
        this.liquidHistory.push(liquidity);
        this.deadMoney.push(dead);
        
        this.breakdown.interest.push(breakdown.interest || 0);
        this.breakdown.maintenance.push(breakdown.maintenance || 0);
        this.breakdown.rent.push(breakdown.rent || 0);
        this.breakdown.tax.push(breakdown.tax || 0);
        this.breakdown.fees.push(breakdown.fees || 0);
    }
    
    /**
     * Generic investment helper
     * @param {number} surplus - Monthly surplus (or deficit if negative)
     * @param {number} stockM - Stock market multiplier for the month
     */
    invest(surplus, stockM) {
        if (surplus > 0) {
            let toISA = Math.min(surplus, 20000 / 12);
            let toGIA = Math.max(0, surplus - toISA);
            this.isa = (this.isa + toISA) * stockM;
            this.gia = (this.gia + toGIA) * stockM;
            this.giaBasis = this.giaBasis + toGIA;
        } else {
            let n = -surplus;
            if (this.gia >= n) {
                this.isa = this.isa * stockM;
                this.gia = (this.gia - n) * stockM;
                this.giaBasis = this.giaBasis - n;
            } else {
                this.isa = Math.max(0, this.isa - (n - this.gia)) * stockM;
                this.gia = 0;
                this.giaBasis = 0; // Basis wiped out? Logic says basis-n, but if gia=0, basis should probably be 0 or track loss? 
                // Original logic: return [ Math.max(0, isa-(n-gia))*stockM, 0, 0 ];
                // So yes, basis becomes 0.
            }
        }
    }
};

/**
 * Strategy A: Rent & Invest
 */
Engine.RentStrategy = class RentStrategy extends Engine.Strategy {
    /**
     * @param {string} name
     * @param {PersonalConfig} personal
     */
    constructor(name, personal) {
        super(name);
        this.isa = personal.isaBalance;
        this.gia = personal.liquidAssets - personal.isaBalance;
        this.giaBasis = this.gia;
        this.cumulativeRent = 0;
        this.cumulativeDead = 0;
    }

    /**
     * @param {number} monthIndex
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    simulateMonth(monthIndex, input, rates) {
        const P = input.personal;
        const year = Math.floor(monthIndex / 12) + 1;
        
        const rentInf = P.rent.inflation / 100;
        const rentY = P.rent.current * Math.pow(1 + rentInf, year - 1);
        
        const totalMonthlyBudget = P.monthlySavings + P.rent.current;
        
        const stockGrowth = P.stockGrowth / 100;
        const isStockCrash = input.settings.stockCrash || false;
        let stockM = (1 + stockGrowth / 12);
        if (year === 1 && isStockCrash) stockM = Math.pow(0.7, 1/12);

        // Deduct rent
        this.cumulativeRent += rentY;
        this.cumulativeDead += rentY;
        
        const surplus = totalMonthlyBudget - rentY;
        this.invest(surplus, stockM);
    }
    
    /**
     * @param {number} year
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    calculateExit(year, input, rates) {
        const stockGross = this.isa + this.gia;
        const stockGain = Math.max(0, this.gia - this.giaBasis);
        
        // CGT Allowance (Simplified 3k logic from engine.js)
        let remAllowance = 3000;
        const taxableStock = Math.max(0, stockGain - remAllowance);
        const stockLiquid = this.isa + (this.gia - taxableStock * rates.cgt);
        
        const liqHist = this.isa + this.gia; // Simple liq hist for rent

        this.recordYear(
            stockGross, 
            stockLiquid, 
            liqHist, 
            this.cumulativeDead, 
            { rent: this.cumulativeRent }
        );
    }
};

/**
 * Strategy B: Buy Home
 */
Engine.BuyStrategy = class BuyStrategy extends Engine.Strategy {
    /**
     * @param {string} name
     * @param {SimulationInput} input
     */
    constructor(name, input) {
        super(name);
        const P = input.personal;
        const H = input.home;
        
        // 1. Calculate Upfront Costs
        const isFTB = P.isFTB !== undefined ? P.isFTB : false;
        const deposit = H.price * (H.depositPct / 100);
        const acq = Engine.getAcquisitionCost(H.price, 'personal', isFTB, H.buyingCost, H.renoCost);
        
        const totalUpfront = deposit + acq.total;
        
        // 2. Adjust Cash
        let gia = P.liquidAssets - P.isaBalance;
        let isa = P.isaBalance;
        
        if (gia >= totalUpfront) {
            gia -= totalUpfront;
        } else {
            const rem = totalUpfront - gia;
            gia = 0;
            isa = Math.max(0, isa - rem);
        }
        
        this.isa = isa;
        this.gia = gia;
        this.giaBasis = gia; 
        
        // 3. Setup Mortgage
        this.debt = H.price - deposit;
        this.houseValue = H.renoCost > 0 ? (H.postWorkValue || H.price + H.renoCost) : H.price;
        this.propBasis = H.price + H.buyingCost + H.renoCost;
        
        this.monthlyPayment = Engine.calculateMortgage(this.debt, H.rate, H.term);
        
        // 4. Initial Dead Money
        this.cumulativeDead = acq.stamp + H.buyingCost;
        this.cumulativeInterest = 0;
        this.cumulativeMaint = 0;
        this.cumulativeFees = acq.stamp + H.buyingCost;
    }

    /**
     * @param {number} monthIndex
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    simulateMonth(monthIndex, input, rates) {
        const P = input.personal;
        const H = input.home;
        const year = Math.floor(monthIndex / 12) + 1;
        
        // Inflation checks
        const rentInf = P.rent.inflation / 100;
        const stockGrowth = P.stockGrowth / 100;
        
        // 1. Mortgage Step
        const step = Engine.calculateMortgageStep(this.debt, H.rate, this.monthlyPayment, H.overpayment || 0);
        this.debt = step.newDebt;
        this.cumulativeInterest += step.interest;
        
        // 2. Maintenance
        let scH = H.serviceCharge * Math.pow(1 + rentInf, year - 1);
        let maint = (this.houseValue * (H.repairRate / 100) / 12) + (scH / 12);
        this.cumulativeMaint += maint;
        
        // 3. Dead Money
        this.cumulativeDead += (step.interest + maint);
        
        // 3b. Lodger Income
        let netL = 0;
        if (H.lodger && H.lodger.active && year <= H.lodger.years) {
            let l = H.lodger.income;
            let taxable = 0;
            if (l * 12 > 7500) {
                taxable = (l - 7500/12);
            }
            let tax = Math.max(0, taxable * rates.income);
            netL = l - tax;
            this.cumulativeDead -= netL;
        }
        
        // 4. Invest Surplus
        const totalMonthlyBudget = P.monthlySavings + P.rent.current;
        
        const isStockCrash = input.settings.stockCrash || false;
        let stockM = (1 + stockGrowth / 12);
        if (year === 1 && isStockCrash) stockM = Math.pow(0.7, 1/12);
        
        const surplus = totalMonthlyBudget - (step.totalPaid + maint - netL);
        this.invest(surplus, stockM);
    }
    
    /**
     * @param {number} year
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    calculateExit(year, input, rates) {
        const H = input.home;
        const P = input.personal;
        
        // Annual Appreciation
        const propGrowth = (P.propertyGrowth !== undefined ? P.propertyGrowth : 3.0) / 100;
        let propG = 1 + propGrowth;
        if (year === 1 && input.settings.propCrash) propG = propG * 0.85;
        
        this.houseValue *= propG;
        
        // Exit Val
        const res = Engine.getExitVal(
            this.isa, this.gia, this.giaBasis, 
            this.houseValue, this.debt, 
            'home', rates, 0, 
            H.sellingCostPct / 100, 
            this.propBasis
        );
        
        const liqHist = this.isa + this.gia;
        
        this.recordYear(
            res.gross, 
            res.liquid, 
            liqHist, 
            this.cumulativeDead, 
            { 
                interest: this.cumulativeInterest, 
                maintenance: this.cumulativeMaint,
                fees: this.cumulativeFees,
                rent: 0, 
                tax: 0 
            }
        );
    }
};

/**
 * Strategy D/E: Buy-to-Let
 */
Engine.BTLStrategy = class BTLStrategy extends Engine.Strategy {
    /**
     * @param {string} name
     * @param {SimulationInput} input
     * @param {string} wrapperType - 'company' or 'personal'
     */
    constructor(name, input, wrapperType) {
        super(name);
        this.wrapperType = wrapperType;
        const P = input.personal;
        const B = input.btl;
        
        // 1. Calculate Upfront Costs
        const stampType = wrapperType === 'company' ? 'company' : 'additional';
        const deposit = B.price * (B.depositPct / 100);
        const acq = Engine.getAcquisitionCost(B.price, stampType, false, B.buyingCost || 2000, 0);
        
        const totalUpfront = deposit + acq.total;
        
        // 2. Adjust Cash
        let gia = P.liquidAssets - P.isaBalance;
        let isa = P.isaBalance;
        
        if (gia >= totalUpfront) {
            gia -= totalUpfront;
        } else {
            const rem = totalUpfront - gia;
            gia = 0;
            isa = Math.max(0, isa - rem);
        }
        
        this.isa = isa;
        this.gia = gia;
        this.giaBasis = gia;
        
        // 3. Setup Mortgage
        this.debt = B.price - deposit;
        this.houseValue = B.price;
        this.propBasis = B.price + (B.buyingCost || 2000);
        
        const rate = (wrapperType === 'company') ? B.rateCompany : B.ratePersonal;
        
        if (B.mortgageType === 'interestOnly') {
            this.monthlyPayment = this.debt * (rate / 1200);
            this.isInterestOnly = true;
        } else {
            this.monthlyPayment = Engine.calculateMortgage(this.debt, rate, B.term);
            this.isInterestOnly = false;
        }
        this.rate = rate;
        
        // 4. State
        this.coCash = 0; // Cash inside company
        this.cumulativeDead = acq.stamp + (B.buyingCost || 2000);
        this.cumulativeInterest = 0;
        this.cumulativeMaint = 0;
        this.cumulativeFees = acq.stamp + (B.buyingCost || 2000);
        this.cumulativeRent = 0;
        this.cumulativeTax = 0;
    }

    /**
     * @param {number} monthIndex
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    simulateMonth(monthIndex, input, rates) {
        const P = input.personal;
        const B = input.btl;
        const year = Math.floor(monthIndex / 12) + 1;
        
        const rentInf = P.rent.inflation / 100;
        const stockGrowth = P.stockGrowth / 100;
        
        const step = Engine.calculateMortgageStep(this.debt, this.rate, this.monthlyPayment, B.overpayment || 0);
        this.debt = step.newDebt;
        this.cumulativeInterest += step.interest;
        
        let scB = B.serviceCharge * Math.pow(1 + rentInf, year - 1);
        let maint = (this.houseValue * (B.repairRate / 100) / 12) + (scB / 12);
        
        const rentY = P.rent.current * Math.pow(1 + rentInf, year - 1); 
        
        this.cumulativeMaint += maint;
        this.cumulativeRent += rentY; 
        
        let btlIncome = this.houseValue * (B.rentYield / 100) / 12;
        let profit = btlIncome - (step.interest + maint);
        let tax = 0;
        
        if (this.wrapperType === 'company') {
            tax = Math.max(0, profit * rates.corp);
            this.coCash += (profit - tax);
        } else {
            let taxableProfit = btlIncome - maint;
            let taxLiability = taxableProfit * rates.income;
            let relief = step.interest * 0.20;
            tax = Math.max(0, taxLiability - relief);
        }
        
        this.cumulativeTax += tax;
        this.cumulativeDead += (rentY + step.interest + maint + tax - btlIncome);
        
        const totalMonthlyBudget = P.monthlySavings + P.rent.current;
        const isStockCrash = input.settings.stockCrash || false;
        let stockM = (1 + stockGrowth / 12);
        if (year === 1 && isStockCrash) stockM = Math.pow(0.7, 1/12);
        
        let surplus = totalMonthlyBudget - rentY;
        
        if (this.wrapperType === 'company') {
            surplus -= step.extra; 
        } else {
            let cashFlow = btlIncome - step.interest - maint - tax - step.extra;
            surplus += cashFlow;
        }
        
        this.invest(surplus, stockM);
    }
    
    /**
     * @param {number} year
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    calculateExit(year, input, rates) {
        const P = input.personal;
        const B = input.btl;
        
        const propGrowth = (P.propertyGrowth !== undefined ? P.propertyGrowth : 3.0) / 100;
        let propG = 1 + propGrowth;
        if (year === 1 && input.settings.propCrash) propG = propG * 0.85;
        
        this.houseValue *= propG;
        
        const type = this.wrapperType === 'company' ? 'company' : 'btl';
        
        const res = Engine.getExitVal(
            this.isa, this.gia, this.giaBasis, 
            this.houseValue, this.debt, 
            type, rates, this.coCash, 
            (B.sellingCostPct || 1.5) / 100, 
            this.propBasis
        );
        
        const liqHist = this.isa + this.gia + this.coCash * (1 - rates.div);
        
        this.recordYear(
            res.gross, 
            res.liquid, 
            liqHist, 
            this.cumulativeDead, 
            { 
                interest: this.cumulativeInterest, 
                maintenance: this.cumulativeMaint,
                fees: this.cumulativeFees,
                rent: this.cumulativeRent, 
                tax: this.cumulativeTax 
            }
        );
    }
};

/**
 * Strategy F: Home + BTL (Ltd Co)
 */
Engine.HybridStrategy = class HybridStrategy extends Engine.Strategy {
    /**
     * @param {string} name
     * @param {SimulationInput} input
     */
    constructor(name, input) {
        super(name);
        const P = input.personal;
        const H = input.home;
        const B = input.btl;
        
        // 1. Calculate Costs (Combined)
        const isFTB = P.isFTB !== undefined ? P.isFTB : false;
        const acqH = Engine.getAcquisitionCost(H.price, 'personal', isFTB, H.buyingCost, H.renoCost);
        const depH = H.price * (H.depositPct / 100);
        
        const acqB = Engine.getAcquisitionCost(B.price, 'company', false, B.buyingCost || 2000, 0);
        const depB = B.price * (B.depositPct / 100);
        
        const totalUpfront = depH + acqH.total + depB + acqB.total;
        
        // 2. Adjust Cash
        let gia = P.liquidAssets - P.isaBalance;
        let isa = P.isaBalance;
        
        if (gia >= totalUpfront) {
            gia -= totalUpfront;
        } else {
            const rem = totalUpfront - gia;
            gia = 0;
            isa = Math.max(0, isa - rem);
        }
        
        this.isa = isa;
        this.gia = gia;
        this.giaBasis = gia;
        
        // 3. Setup Mortgages
        // Home
        this.debtHome = H.price - depH;
        this.houseValueHome = H.renoCost > 0 ? (H.postWorkValue || H.price + H.renoCost) : H.price;
        this.propBasisBTL = B.price + (B.buyingCost||2000);
        this.propBasisHome = H.price + H.buyingCost + H.renoCost;
        
        this.pmtHome = Engine.calculateMortgage(this.debtHome, H.rate, H.term);
        
        // BTL
        this.debtBTL = B.price - depB;
        this.houseValueBTL = B.price;
        if (B.mortgageType === 'interestOnly') {
            this.pmtBTL = this.debtBTL * (B.rateCompany / 1200);
        } else {
            this.pmtBTL = Engine.calculateMortgage(this.debtBTL, B.rateCompany, B.term);
        }
        
        // 4. State
        this.coCash = 0;
        this.cumulativeDead = acqH.stamp + H.buyingCost + acqB.stamp + (B.buyingCost||2000);
        this.cumulativeInterest = 0;
        this.cumulativeMaint = 0;
        this.cumulativeFees = this.cumulativeDead; 
        this.cumulativeRent = 0; 
        this.cumulativeTax = 0;
    }

    /**
     * @param {number} monthIndex
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    simulateMonth(monthIndex, input, rates) {
        const P = input.personal;
        const H = input.home;
        const B = input.btl;
        const year = Math.floor(monthIndex / 12) + 1;
        
        const rentInf = P.rent.inflation / 100;
        const stockGrowth = P.stockGrowth / 100;
        
        // 1. Home Loop
        const step1 = Engine.calculateMortgageStep(this.debtHome, H.rate, this.pmtHome, H.overpayment || 0);
        this.debtHome = step1.newDebt;
        let scH = H.serviceCharge * Math.pow(1 + rentInf, year - 1);
        let m1 = (this.houseValueHome * (H.repairRate / 100) / 12) + (scH / 12);
        
        // 2. BTL Loop
        const step2 = Engine.calculateMortgageStep(this.debtBTL, B.rateCompany, this.pmtBTL, B.overpayment || 0); 
        this.debtBTL = step2.newDebt;
        let scB = B.serviceCharge * Math.pow(1 + rentInf, year - 1);
        let m2 = (this.houseValueBTL * (B.repairRate / 100) / 12) + (scB / 12);
        
        this.cumulativeInterest += (step1.interest + step2.interest);
        this.cumulativeMaint += (m1 + m2);
        
        let btlIncome = this.houseValueBTL * (B.rentYield / 100) / 12;
        let profit = btlIncome - (step2.interest + m2);
        let tax = Math.max(0, profit * rates.corp);
        
        this.cumulativeTax += tax;
        this.coCash += (profit - tax);
        
        this.cumulativeDead += (step1.interest + m1 + step2.interest + m2 + tax - btlIncome);
        
        let netL = 0;
        if (H.lodger && H.lodger.active && year <= H.lodger.years) {
             let l = H.lodger.income;
             let taxable = Math.max(0, l*12 > 7500 ? (l - 7500/12) : 0);
             let t = taxable * rates.income;
             netL = l - t;
             this.cumulativeDead -= netL;
        }

        const totalMonthlyBudget = P.monthlySavings + P.rent.current;
        const isStockCrash = input.settings.stockCrash || false;
        let stockM = (1 + stockGrowth / 12);
        if (year === 1 && isStockCrash) stockM = Math.pow(0.7, 1/12);
        
        const surplus = totalMonthlyBudget - (step1.totalPaid + m1) - step2.extra + netL;
        
        this.invest(surplus, stockM);
    }
    
    /**
     * @param {number} year
     * @param {SimulationInput} input
     * @param {TaxRates} rates
     */
    calculateExit(year, input, rates) {
        const H = input.home;
        const B = input.btl;
        const P = input.personal;
        
        const propGrowth = (P.propertyGrowth !== undefined ? P.propertyGrowth : 3.0) / 100;
        let propG = 1 + propGrowth;
        if (year === 1 && input.settings.propCrash) propG = propG * 0.85;
        
        this.houseValueHome *= propG;
        this.houseValueBTL *= propG;
        
        const stockGross = this.isa + this.gia;
        const stockGain = Math.max(0, this.gia - this.giaBasis);
        let remAllowance = 3000;
        const taxableStock = Math.max(0, stockGain - remAllowance);
        remAllowance = Math.max(0, remAllowance - stockGain);
        const stockLiquid = this.isa + (this.gia - taxableStock * rates.cgt);
        
        const hSellFee = this.houseValueHome * (H.sellingCostPct / 100);
        const hGross = Math.max(0, this.houseValueHome - this.debtHome);
        const hLiquid = Math.max(0, this.houseValueHome - hSellFee - this.debtHome);
        
        const bSellFee = this.houseValueBTL * ((B.sellingCostPct || 1.5) / 100);
        const bGross = Math.max(0, this.houseValueBTL - this.debtBTL) + this.coCash;
        let bProceeds = Math.max(0, this.houseValueBTL - bSellFee - this.debtBTL);
        const bGain = (this.houseValueBTL - bSellFee) - this.propBasisBTL;
        if (bGain > 0) {
            bProceeds -= (bGain * rates.corp);
        }
        const bLiquid = Math.max(0, (bProceeds + this.coCash) * (1 - rates.div));
        
        const liqHist = this.isa + this.gia + this.coCash * (1 - rates.div); 
        
        this.recordYear(
            stockGross + hGross + bGross,
            stockLiquid + hLiquid + bLiquid,
            liqHist,
            this.cumulativeDead,
            {
                interest: this.cumulativeInterest,
                maintenance: this.cumulativeMaint,
                fees: this.cumulativeFees,
                rent: 0,
                tax: this.cumulativeTax
            }
        );
    }
};

Engine.getTaxRates = function(band) {
    switch(band) {
        case 'basic': return { income: 0.20, cgt: 0.18, div: 0.0875, corp: 0.19 };
        case 'higher': return { income: 0.40, cgt: 0.24, div: 0.3375, corp: 0.19 }; // Assumes Small Profits Rate (<£50k)
        case 'additional': return { income: 0.45, cgt: 0.24, div: 0.3935, corp: 0.19 };
        default: return { income: 0.45, cgt: 0.24, div: 0.3935, corp: 0.19 };
    }
};

Engine.calculateStampDuty = function(price, type, isFTB) {
    if (type === 'personal' && isFTB && price <= 500000) return (price <= 300000) ? 0 : (price - 300000) * 0.05;
    const bands = [{limit: 125000, rate: 0.00}, {limit: 250000, rate: 0.02}, {limit: 925000, rate: 0.05}, {limit: 1500000, rate: 0.10}, {limit: Infinity, rate: 0.12}];
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

Engine.getAcquisitionCost = function(price, stampType, isFTB, buyingCost, reno) {
    const stamp = Engine.calculateStampDuty(price, stampType, isFTB);
    return { stamp, total: stamp + buyingCost + reno };
};

Engine.calculateMortgageStep = function(debt, rate, scheduledPayment, overpayment = 0) {
    if (debt <= 0) return { interest: 0, principal: 0, totalPaid: 0, newDebt: 0, extra: 0 };
    
    const monthlyRate = rate / 1200;
    let interest = debt * monthlyRate;
    
    // Handle final payment (if scheduled payment > remaining balance + interest)
    // scheduledPayment is fixed.
    // If (debt + interest) < scheduledPayment, we just pay off everything.
    let actualPayment = scheduledPayment;
    if ((debt + interest) < scheduledPayment) actualPayment = debt + interest;
    
    let principal = actualPayment - interest;
    let extra = 0;
    
    if (overpayment > 0) {
        // Can we afford overpayment? Assumed yes (check caller).
        // Cap at remaining debt
        extra = Math.min(overpayment, debt - principal);
    }
    
    let totalPaid = actualPayment + extra;
    let newDebt = debt - (principal + extra);
    if (newDebt < 0.01) newDebt = 0; // Floating point hygiene
    
    return { interest, principal: principal + extra, totalPaid, newDebt, extra };
};

Engine.getExitVal = function(isa, gia, giaBasis, houseV, debt, type, rates, cashCo=0, sellCostPct=0.015, propBasis=0) {
    const stockGross = isa + gia;
    const propGross = Math.max(0, houseV - debt);
    const coGross = cashCo;
    const gross = stockGross + propGross + coGross;

    const stockGain = Math.max(0, gia - giaBasis);
    // 2025/26 CGT Allowance: £3,000 (Applied to Stock first, then Property)
    let remAllowance = 3000;
    
    const taxableStock = Math.max(0, stockGain - remAllowance);
    remAllowance = Math.max(0, remAllowance - stockGain);
    
    const stockLiquid = isa + (gia - taxableStock * rates.cgt);

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
                if (gain > 0) {
                    const taxableProp = Math.max(0, gain - remAllowance);
                    proceeds -= (taxableProp * rates.cgt);
                }
            }
            propLiquid = proceeds;
        }
    }

    const liquid = stockLiquid + propLiquid + coLiquid;
    return { gross, liquid };
};

Engine.simulateStrategies = function(V) {
    const P = V.personal;
    const H = V.home;
    const B = V.btl;
    const rates = Engine.getTaxRates(P.taxBand);
    const years = 40;

    // Helper to create dummy result
    const getDummy = (name) => ({
        name,
        netWorth: Array(years).fill(0),
        netWorthLiquid: Array(years).fill(0),
        liquidHistory: Array(years).fill(0),
        deadMoney: Array(years).fill(0),
        breakdown: { interest: [], maintenance: [], tax: [], rent: [], fees: [] },
        totalInterest: []
    });

    // Strategy A: Rent
    const sA = new Engine.RentStrategy("Rent", V.personal);

    // Strategy B: Buy Home
    let sB = null, possibleB = false;
    let inputB = V; // Default
    if (H.active) {
        const isFTB = P.isFTB !== undefined ? P.isFTB : false;
        const deposit = H.price * (H.depositPct / 100);
        const acq = Engine.getAcquisitionCost(H.price, 'personal', isFTB, H.buyingCost, H.renoCost);
        if (P.liquidAssets >= deposit + acq.total) {
            possibleB = true;
            // Clone input to disable lodger for pure Buy Strategy
            inputB = JSON.parse(JSON.stringify(V));
            inputB.home.lodger.active = false;
            sB = new Engine.BuyStrategy("Buy Home", inputB);
        }
    }
    if (!possibleB) sB = getDummy("Buy Home");

    // Strategy C: Buy + Lodger
    let sC = null, possibleC = false;
    if (possibleB && H.lodger.active) {
        sC = new Engine.BuyStrategy("Buy Home + Lodger", V);
        possibleC = true;
    }
    if (!possibleC) sC = getDummy("Buy Home + Lodger");

    // Strategy D: BTL (Co)
    let sD = null, possibleD = false;
    if (B.active && B.wrappers.company) {
        const deposit = B.price * (B.depositPct / 100);
        const acq = Engine.getAcquisitionCost(B.price, 'company', false, B.buyingCost || 2000, 0);
        if (P.liquidAssets >= deposit + acq.total) {
            sD = new Engine.BTLStrategy("BTL (Ltd Co)", V, 'company');
            possibleD = true;
        }
    }
    if (!possibleD) sD = getDummy("BTL (Ltd Co)");

    // Strategy E: BTL (Personal)
    let sE = null, possibleE = false;
    if (B.active && B.wrappers.personal) {
        const deposit = B.price * (B.depositPct / 100);
        const acq = Engine.getAcquisitionCost(B.price, 'additional', false, B.buyingCost || 2000, 0);
        if (P.liquidAssets >= deposit + acq.total) {
            sE = new Engine.BTLStrategy("BTL (Personal)", V, 'personal');
            possibleE = true;
        }
    }
    if (!possibleE) sE = getDummy("BTL (Personal)");

    // Strategy F: Home + BTL
    let sF = null, possibleF = false;
    let inputF = V;
    if (H.active && B.active && B.wrappers.company) {
        const isFTB = P.isFTB !== undefined ? P.isFTB : false;
        const acqH = Engine.getAcquisitionCost(H.price, 'personal', isFTB, H.buyingCost, H.renoCost);
        const depH = H.price * (H.depositPct / 100);
        
        const acqB = Engine.getAcquisitionCost(B.price, 'company', false, B.buyingCost || 2000, 0);
        const depB = B.price * (B.depositPct / 100);
        
        if (P.liquidAssets >= depH + acqH.total + depB + acqB.total) {
            possibleF = true;
            inputF = JSON.parse(JSON.stringify(V));
            inputF.home.lodger.active = false; // Disable lodger for F (as per original logic)
            sF = new Engine.HybridStrategy("Home + BTL", inputF);
        }
    }
    if (!possibleF) sF = getDummy("Home + BTL");

    // Simulation Loop
    for (let y = 1; y <= years; y++) {
        for (let m = 0; m < 12; m++) {
            const mi = (y - 1) * 12 + m;
            sA.simulateMonth(mi, V, rates);
            if (possibleB) sB.simulateMonth(mi, inputB, rates);
            if (possibleC) sC.simulateMonth(mi, V, rates);
            if (possibleD) sD.simulateMonth(mi, V, rates);
            if (possibleE) sE.simulateMonth(mi, V, rates);
            if (possibleF) sF.simulateMonth(mi, inputF, rates);
        }
        
        sA.calculateExit(y, V, rates);
        if (possibleB) sB.calculateExit(y, inputB, rates);
        if (possibleC) sC.calculateExit(y, V, rates);
        if (possibleD) sD.calculateExit(y, V, rates);
        if (possibleE) sE.calculateExit(y, V, rates);
        if (possibleF) sF.calculateExit(y, inputF, rates);
    }

    // Compat aliases
    [sA, sB, sC, sD, sE, sF].forEach(s => s.totalInterest = s.breakdown.interest);

    return { stratA:sA, stratB:sB, stratC:sC, stratD:sD, stratE:sE, stratF:sF, possibleB, possibleD, possibleE, possibleF };
};

Engine.adjustForInflation = function(nominalResults, ratePct) {
    const rate = ratePct / 100;
    const adjust = (val, year) => val / Math.pow(1 + rate, year);
    
    // Deep clone results to avoid mutation
    const realResults = JSON.parse(JSON.stringify(nominalResults));
    
    // Iterate over all strategies (A-F) and arrays (netWorth, netWorthLiquid)
    ['stratA', 'stratB', 'stratC', 'stratD', 'stratE', 'stratF'].forEach(s => {
        const strat = realResults[s];
        if(strat) {
            if (strat.netWorth) strat.netWorth = strat.netWorth.map((v, i) => adjust(v, i + 1));
            if (strat.netWorthLiquid) strat.netWorthLiquid = strat.netWorthLiquid.map((v, i) => adjust(v, i + 1));
        }
    });
    return realResults;
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