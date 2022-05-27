const assert = require('assert');
const getRuleUrl = require('./index.js');

describe('eslint-rule-docs', () => {
  it('Find url for core rules', () => {
    assert.deepStrictEqual(getRuleUrl('no-undef'), {
      exactMatch: true,
      url: 'https://eslint.org/docs/rules/no-undef'
    });
  });

  it('Find url for known plugins', () => {
    assert.deepStrictEqual(getRuleUrl('react/sort-prop-types'), {
      exactMatch: true,
      url:
        'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/sort-prop-types.md'
    });
  });

  it('If the plugin has no documentation, return repository url ', () => {
    assert.deepStrictEqual(getRuleUrl('flowtype/semi'), {
      exactMatch: false,
      url: 'https://github.com/gajus/eslint-plugin-flowtype'
    });
  });

  it('If the plugin is unknown, returns an empty object', () => {
    assert.throws(getRuleUrl.bind(null, 'unknown-foo/bar'), new Error('No documentation found for rule'));
  });
});
