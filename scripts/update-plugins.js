#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const got = require('got')
const async = require('async')
const sortKeys = require('sort-keys')

async function load (from = 0) {
  const response = await got(
    `https://registry.npmjs.org/-/v1/search?text=eslint-plugin&size=250&from=${from}`,
    { json: true }
  )
  const results = response.body.objects.map(pkg => {
    return {
      name: pkg.package.name,
      repositoryUrl: pkg.package.links.repository
    }
  })

  if (from < response.body.total) {
    return results.concat(await load(from + 250))
  } else {
    return results
  }
}

function documentationUrl (item, callback) {
  const docsUrl = `${item.repositoryUrl}/blob/master/docs/rules/`
  got
    .head(docsUrl)
    .then(response => callback(null, { ...item, docsUrl }))
    .catch(error => callback(null, item))
}

(async () => {
  const allResults = await load()
  const allEslintPlugins = allResults.filter(({ name }) =>
    name.startsWith('eslint-plugin-')
  )
  const withLink = allEslintPlugins.filter(
    ({ repositoryUrl }) => repositoryUrl
  )
  const withGitHubLink = withLink.filter(({ repositoryUrl }) =>
    repositoryUrl.startsWith('https://github.com')
  )

  console.log('Total search results', allResults.length)
  console.log('Total ESLint plugins', allEslintPlugins.length)
  console.log('Plugins with a link', withLink.length)
  console.log('Plugins with a github link', withGitHubLink.length)

  async.mapLimit(withGitHubLink, 10, documentationUrl, (err, results) => {
    const data = results.reduce((memo, item) => {
      const name = item.name.replace('eslint-plugin-', '')
      memo[name] = {
        docs: item.docsUrl,
        repository: item.repositoryUrl
      }
      return memo
    }, {})

    fs.writeFileSync(
      path.join(__dirname, '../plugins.json'),
      JSON.stringify(sortKeys(data), null, ' ')
    )
  })
})()
