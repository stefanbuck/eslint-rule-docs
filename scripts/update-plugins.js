#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const got = require('got');
const async = require('async');
const sortKeys = require('sort-keys');
const findReachableUrls = require('find-reachable-urls')

async function load(from = 0) {
  const response = await got(
    `https://registry.npmjs.org/-/v1/search?text=eslint-plugin&size=250&from=${from}`,
    { json: true }
  );
  const results = response.body.objects.map(pkg => {
    return {
      name: pkg.package.name,
      scope: pkg.package.scope !== 'unscoped' ? pkg.package.scope : undefined,
      repositoryUrl: pkg.package.links.repository
    };
  });

  if (from < response.body.total) {
    return results.concat(await load(from + 250));
  } else {
    return results;
  }
}

function documentationUrl(item, callback) {  
  findReachableUrls([
    `${item.repositoryUrl}/blob/main/docs/rules/`,
    `${item.repositoryUrl}/blob/master/docs/rules/`,
    `${item.repositoryUrl}/blob/master/packages/${item.name.replace(`@${item.scope}/`, '')}/docs/rules/`,
    `${item.repositoryUrl}/blob/main/packages/${item.name.replace(`@${item.scope}/`, '')}/docs/rules/`,
  ]).then(result => callback(null, { ...item, docsUrl: result[0] }))
    .catch(error => callback(null, item));
}

(async () => {
  const allResults = await load();
  const allEslintPlugins = allResults.filter(({ name }) =>
    name.includes('eslint-plugin')
  );

  const withLink = allEslintPlugins.filter(
    ({ repositoryUrl }) => repositoryUrl
  );
  const withGitHubLink = withLink.filter(({ repositoryUrl }) =>
    repositoryUrl.startsWith('https://github.com')
  );

  console.log('Total search results', allResults.length);
  console.log('Total ESLint plugins', allEslintPlugins.length);
  console.log('Plugins with a link', withLink.length);
  console.log('Plugins with a github link', withGitHubLink.length);

  async.mapLimit(withGitHubLink, 10, documentationUrl, (err, results) => {
    const data = results.reduce((memo, item) => {
      let name = item.name;

      if (name.startsWith('eslint-plugin-')) {
        name = item.name.replace('eslint-plugin-', '');
      }

      memo[name] = {
        docs: item.docsUrl,
        repository: item.repositoryUrl
      };
      return memo;
    }, {});

    fs.writeFileSync(
      path.join(__dirname, '../plugins.json'),
      JSON.stringify(sortKeys(data), null, ' ')
    );
  });
})();
