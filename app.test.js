// Mock Browser Environment
global.Engine = require('./engine');
global.window = {
    location: { search: '' },
    AuditLogic: require('./audit'),
    addEventListener: jest.fn()
};
global.document = {
    addEventListener: jest.fn()
};
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn()
};
global.Alpine = {
    data: jest.fn(),
    directive: jest.fn()
};

// Import App Logic
const { calculatorLogic } = require('./app');

describe('App Controller Logic (app.js)', () => {
    let app;

    beforeEach(() => {
        // Reset App State
        app = calculatorLogic();
        
        // Mock Alpine's $watch magic
        app.$watch = jest.fn((prop, callback) => {
            // Store watcher if needed, or manually trigger in tests
        });
        
        // Mock Chart update (as no Canvas in Node)
        app.updateCharts = jest.fn();
        app.calculateMatrixDebounced = jest.fn();
    });

    test('Initialization: Loads Default Values', () => {
        expect(app.i.personal.liquidAssets).toBe(45000);
        expect(app.i.home.price).toBe(300000);
        expect(app.i.settings.valuationMode).toBe('liquid');
    });

    test('Presets: London Preset applies correct values', () => {
        app.applyPreset('london');
        expect(app.i.home.price).toBe(550000);
        expect(app.i.personal.rent.current).toBe(2200);
        expect(app.i.personal.liquidAssets).toBe(100000);
    });

    test('Presets: Nomad Preset disables Home Buying', () => {
        app.applyPreset('nomad');
        expect(app.i.home.active).toBe(false);
        expect(app.i.personal.stockGrowth).toBe(8.0);
    });

    test('Audit Logic: Generates Proof for SDLT', () => {
        // Setup State
        app.i.home.price = 500000;
        app.i.personal.isFTB = true;
        
        // Find SDLT item
        const item = app.auditData.find(x => x.id === 'sdlt');
        expect(item).toBeDefined();
        
        const proof = app.getProof(item);
        
        // Expect specific text
        expect(proof).toContain('£500,000');
        expect(proof).toContain('First Time Buyer Relief Applied'); 
    });

    test('Audit Logic: Handles Invalid Item gracefully', () => {
        const proof = app.getProof(null);
        expect(proof).toBe('');
    });
    
    test('Cash Flow Analysis: Generates Year 1 Breakdown', () => {
        app.i.home.active = true;
        app.i.personal.liquidAssets = 100000; // Ensure enough cash for deposit
        app.calculate(); // Generate results
        
        const flows = app.getYear1CashFlows();
        expect(flows.length).toBeGreaterThanOrEqual(2); // Rent vs Buy
        
        const rentFlow = flows.find(f => f.type === 'Rent');
        expect(rentFlow.cost).toBe(app.i.personal.rent.current);
    });

    test('Narrative Generation: Produces output string', () => {
        app.calculate();
        const html = app.narrativeHTML;
        expect(typeof html).toBe('string');
        expect(html.length).toBeGreaterThan(10);
        expect(html).toContain('Year 10'); // Default inspectorYear
    });
});
