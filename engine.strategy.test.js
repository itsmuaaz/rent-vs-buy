const Engine = require('./engine');

describe('Strategy Base Class', () => {
    test('should be defined', () => {
        expect(Engine.Strategy).toBeDefined();
    });

    test('should throw error when instantiated directly (abstract)', () => {
        // Optional: strict abstract enforcement
        expect(() => new Engine.Strategy('Test')).toThrow(); 
    });
    
    // If I allow instantiation for now (as a base with defaults):
    /*
    test('should initialize with correct properties', () => {
        const s = new Engine.Strategy('TestStrat');
        expect(s.name).toBe('TestStrat');
        expect(s.netWorth).toEqual([]);
    });
    */
});
