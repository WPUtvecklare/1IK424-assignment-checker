const cheerio = require('cheerio')
const rp = require('request-promise')

const scrape = async (req, res, next) => {
  const url = req.params[0]

  const result = await scrapeMainPage(url)

  if (result.navLinks && result.navLinks.length) {
    const links = result.navLinks.splice(0, 20)
    const subPages = []

    for (const link of links) {
      const elements = await scrapeSubPage(link)
      subPages.push({ page: link, elements })
    }
    result.subPages = subPages
  }
  res.send(result)
}

const scrapeMainPage = (url) => {
  const options = setupOptions(url)

  return rp(options)
    .then(($) => {
      const h1 = $('h1').length
      const h2 = $('h2').length
      const h3 = $('h3').length
      const p = $('p').length
      const wpBlockColumn = $('div.wp-block-column').length
      const wpBlockJetPackColumn = $('div.wp-block-jetpack-layout-grid-column')
        .length
      const columns = wpBlockColumn + wpBlockJetPackColumn

      const navLinks = []

      $('a').each((i, e) => {
        const subPageLink = $(e).attr('href')
        const linkToAdd = getSubPageLinks(subPageLink, url, navLinks)
        if (linkToAdd) {
          navLinks.push(linkToAdd)
        }
      })

      return {
        h1,
        h2,
        h3,
        p,
        columns,
        navLinks
      }
    })
    .catch((err) => {
      console.log(err)
      return { error: 'Failed to scrape website' }
    })
}

const setupOptions = (url) => {
  return {
    uri: url,
    timeout: 5000,
    transform: (body) => {
      return cheerio.load(body)
    }
  }
}

const getSubPageLinks = (subPageLink, submittedUrl, linksArray) => {
  if (subPageLink && subPageLink.startsWith('http')) {
    const trimmedLink = stripTrailingSlash(removeUrlPrefix(subPageLink))
    const trimmedUrl = stripTrailingSlash(removeUrlPrefix(submittedUrl))

    if (
      trimmedLink &&
      trimmedLink !== trimmedUrl &&
      trimmedLink.startsWith(trimmedUrl) &&
      !trimmedLink.includes('/?') &&
      !linksArray.includes(trimmedLink) &&
      !linksArray.includes(subPageLink) &&
      trimmedLink.includes(trimmedUrl)
    ) {
      return subPageLink
    }
  }
}

const stripTrailingSlash = (str) => {
  return str.endsWith('/') ? str.slice(0, -1) : str
}

const removeUrlPrefix = (url) => {
  return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
}

const scrapeSubPage = (url) => {
  const options = setupOptions(url)

  return rp(options)
    .then(($) => {
      const h1 = $('h1').length
      const p = $('p').length

      return {
        h1,
        p
      }
    })
    .catch((err) => {
      console.log(err)
      return { error: 'Failed to scrape sub page' }
    })
}

module.exports = {
  scrape
}
