const assert = require('assert');
const { Utils } = require('../script.js');

function testPreciseAdd() {
  assert.strictEqual(Utils.preciseAdd(1.2345, 2.3456), 3.5801);
  assert.strictEqual(Utils.preciseAdd(0, 0), 0);
}

function testCalculateAge() {
  const today = new Date();
  const birth = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
  assert.strictEqual(Utils.calculateAge(birth.toISOString()), 30);
}

try {
  testPreciseAdd();
  testCalculateAge();
  console.log('All tests passed');
} catch (err) {
  console.error('Test failed:', err.message);
  process.exit(1);
}
