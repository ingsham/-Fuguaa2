import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, jsonLd } from '../lib/html';

test('escapeHtml neutralises tags and quotes', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml(null), '');
});

test('jsonLd cannot be broken out of with </script>', () => {
  const out = jsonLd({ name: '</script><script>alert(1)</script>' });
  assert.ok(!out.includes('</script>'));
  assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script>' });
});
