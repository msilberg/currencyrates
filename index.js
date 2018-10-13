/**
 * Currency Rates in Real Time v1.0.0
 */

// Libs & utils
const server = require('http').createServer()
const io = require('socket.io')(server)
const mongoose = require('mongoose')
const requireDirectory = require('require-directory')
const models = requireDirectory(module, './models')
const config = require('config')
const request = require('request')
const format = require('util').format
const parser = require('./parser')

// Mongo Connection
mongoose.connect(format(config.get('Mongo.uri'), config.get('Mongo.dbName')), config.get('Mongo.connectionParameters')).then(
    () => { console.log('Connected to MongoDB') },
    err => { console.log(err) },
)

/**
 * @param {String} serviceName
 * @return {Promise|Boolean}
 */
function makeGetRequest(serviceName) {
    if (!config.has(format('API.%s', serviceName))) return false;
    const url = config.get(format('API.%s.url', serviceName))
    return new Promise(async (resolve, reject) => {
        request({
            url: url,
            json: true,
            gzip: true,
            headers: (config.has(format('API.%s.headers', serviceName)))? config.get(format('API.%s.headers', serviceName)) : {}
        }, (err, res, body) => {
            if (err || !res.statusCode || res.statusCode !== 200) {
                reject(err || res)
            } else {
                resolve({
                    data: (
                        config.has(format('API.%s.dataField', serviceName)) &&
                        body.hasOwnProperty(config.get(format('API.%s.dataField', serviceName)).toString())
                    )? body[config.get(format('API.%s.dataField', serviceName)).toString()] : body,
                    service: serviceName
                })
            }
        })
    })
}

function fetchCurrenciesData() {
    Promise.all([
        makeGetRequest('coinMarketCap'),
        makeGetRequest('cryptoCompare')
    ]).then(async (results) => {
        let service
        const mergedResult = {}
        for (let result of results) {
            service = result.service.toString()
            if (parser.hasOwnProperty(service) && typeof parser[service] === 'function') {
                for (let parsedResult of parser[service](result.data)) {
                    if (!mergedResult.hasOwnProperty(parsedResult[parser.symbolKeyName])) {
                        mergedResult[parsedResult[parser.symbolKeyName]] = []
                    }
                    mergedResult[parsedResult[parser.symbolKeyName]].push(parsedResult[parser.priceKeyName])
                }
            }
        }
        for (let symbol in mergedResult) {
            if (mergedResult.hasOwnProperty(symbol)) {
                let sum = mergedResult[symbol].reduce((previous, current) => current += previous)
                mergedResult[symbol] = sum / mergedResult[symbol].length
            }
        }
        const model = new models['exchange_log']({ currencies: mergedResult })
        const dbResult = await model.save()
        console.log(dbResult)
    }).catch((err) => {
        console.log(err)
    })
    // setTimeout(fetchCurrenciesData, parseInt(config.get('App.fetchInterval')))
}

fetchCurrenciesData()
