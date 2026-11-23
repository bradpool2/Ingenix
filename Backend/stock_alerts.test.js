import assert from 'node:assert/strict';
import test from 'node:test';
import { stockEsCritico } from './stock_alerts.js';

test('stock crítico incluye 0, 1 y 2 unidades, pero no 3', () => {
    assert.equal(stockEsCritico(0), true);
    assert.equal(stockEsCritico(1), true);
    assert.equal(stockEsCritico(2), true);
    assert.equal(stockEsCritico(3), false);
    assert.equal(stockEsCritico(null), false);
    assert.equal(stockEsCritico(''), false);
});
