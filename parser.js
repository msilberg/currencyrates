const config = require('config')
const relevantCurrencies = Object.values(config.currencies.crypto).map(toLC)
const baseCurrency = config.currencies.base.toString()

const symbolKeyName = 'symbol'
const priceKeyName = 'price'

module.exports.symbolKeyName = symbolKeyName
module.exports.priceKeyName = priceKeyName

/**
 * @param {*} str
 * @return {string}
 */
function toLC(str) {
    return str.toString().toLowerCase()
}

/**
 * @param {Array} data
 * @return {Array}
 */
function coinMarketCap(data) {
    const result = []
    let relevantData = data.filter((item) => {
        return (
            relevantCurrencies.includes(item.symbol.toString().toLowerCase()) &&
            item.hasOwnProperty('quote') && item.quote.hasOwnProperty(baseCurrency)
        )
    })
    for (let rdItem of relevantData) {
        result.push({
            [symbolKeyName]: rdItem.symbol.toString().toUpperCase(),
            [priceKeyName]: parseFloat(rdItem.quote[baseCurrency].price)
        })
    }
    return result
}

module.exports.coinMarketCap = coinMarketCap

/**
 * @param {Object} data
 * @return {Array}
 */
function cryptoCompare(data) {
    const result = []
    for (let symbol in data) {
        if (data.hasOwnProperty(symbol.toString()) && relevantCurrencies.includes(symbol.toString().toLowerCase())) {
            result.push({
                [symbolKeyName]: symbol.toString().toString().toUpperCase(),
                [priceKeyName]: 1 / parseFloat(data[symbol.toString()])
            })
        }
    }
    return result
}

module.exports.cryptoCompare = cryptoCompare
