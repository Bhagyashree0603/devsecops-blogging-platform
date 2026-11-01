const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePostInput } = require('../src/validators');
test('rejects a post with a missing title', () => {
  assert.equal(validatePostInput({ content: 'Some content' }).valid, false);
});
test('rejects a post with empty content', () => {
  assert.equal(validatePostInput({ title: 'A title', content: '  ' }).valid, false);
});
test('normalizes valid post input and applies a default category', () => {
  assert.deepEqual(validatePostInput({ title: '  Hello  ', content: '  World  ' }), { valid: true, value: { title: 'Hello', content: 'World', category: 'General' } });
});
test('rejects a title longer than 180 characters', () => {
  assert.equal(validatePostInput({ title: 'x'.repeat(181), content: 'body' }).valid, false);
});
