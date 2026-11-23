import assert from 'node:assert/strict';
import test from 'node:test';
import { proximoRecordatorioRetiro } from './retention.js';

test('no envía recordatorio antes del primer día ni al completar todos', () => {
    assert.equal(proximoRecordatorioRetiro(0, new Set()), null);
    assert.equal(proximoRecordatorioRetiro(30, new Set([1, 15, 30])), null);
});

test('elige los recordatorios de día 1, 15 y 30 una sola vez y en orden', () => {
    assert.equal(proximoRecordatorioRetiro(1, new Set()), 1);
    assert.equal(proximoRecordatorioRetiro(15, new Set([1])), 15);
    assert.equal(proximoRecordatorioRetiro(30, new Set([1, 15])), 30);
    assert.equal(proximoRecordatorioRetiro(30, new Set([1])), 15);
});
