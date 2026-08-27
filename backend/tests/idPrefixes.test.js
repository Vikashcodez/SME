import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ID_PREFIXES, generateId } from '../src/db/idPrefixes.js';

describe('idPrefixes & ID Generator Suite', () => {
  it('should have valid prefixes defined for key entities', () => {
    assert.equal(ID_PREFIXES.salesOrder, 'SAL-');
    assert.equal(ID_PREFIXES.customerMaster, 'CUS-');
    assert.equal(ID_PREFIXES.vendorMaster, 'VEN-');
    assert.equal(ID_PREFIXES.purchaseOrder, 'PUR-');
  });

  it('should generate properly padded IDs with default prefixes', () => {
    assert.equal(generateId('salesOrder', 1), 'SAL-0001');
    assert.equal(generateId('customerMaster', 42), 'CUS-0042');
    assert.equal(generateId('purchaseOrder', 9999), 'PUR-9999');
  });

  it('should support custom prefix override', () => {
    assert.equal(generateId('salesOrder', 7, 'SO-'), 'SO-0007');
  });

  it('should fallback to REC- prefix for unknown entities', () => {
    assert.equal(generateId('unknownEntity', 12), 'REC-0012');
  });
});
