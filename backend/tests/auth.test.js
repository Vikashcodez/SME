import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

describe('Auth Security & JWT Token Lifecycle Suite', () => {
  const testSecret = 'test_jwt_secret_key_minimum_256bit_length_for_enterprise_unit_testing';

  it('should sign and verify valid JWT payload', () => {
    const payload = {
      userId: 'USR-001',
      email: 'admin@chandraprecision.com',
      role: 'super_admin',
      companyCode: 'CO-0001',
    };

    const token = jwt.sign(payload, testSecret, { expiresIn: '1h' });
    assert.ok(typeof token === 'string');

    const decoded = jwt.verify(token, testSecret);
    assert.equal(decoded.userId, 'USR-001');
    assert.equal(decoded.email, 'admin@chandraprecision.com');
    assert.equal(decoded.role, 'super_admin');
    assert.equal(decoded.companyCode, 'CO-0001');
  });

  it('should reject tokens signed with a different secret', () => {
    const token = jwt.sign({ userId: 'USR-001' }, 'wrong_secret');
    assert.throws(() => {
      jwt.verify(token, testSecret);
    }, /invalid signature/);
  });

  it('should reject expired tokens', () => {
    const expiredToken = jwt.sign({ userId: 'USR-001' }, testSecret, { expiresIn: '-1s' });
    assert.throws(() => {
      jwt.verify(expiredToken, testSecret);
    }, /jwt expired/);
  });
});
