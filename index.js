/**
 * Currency Rates in Real Time v1.0.0
 */

// Libs & utils
const server = require('http').createServer(handler)
const io = require('socket.io')(server)
const mongoose = require('mongoose')
const fs = require('fs')
const requireDirectory = require('require-directory')
const models = requireDirectory(module, './models')
const config = require('config')
const request = require('request')
const EventEmitter = require('events')
const format = require('util').format
const parser = require('./parser')

// Events Server
class EmitterServer extends EventEmitter {
    constructor() {
        super()
        this._serverUpdate = null
    }
    set serverUpdate(e) { this._serverUpdate = e }
    get serverUpdate() { return this._serverUpdate }
}

const eventEmitter = new EmitterServer()

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
        makeGetRequest('cryptoCompare'),
        makeGetRequest('coinApiIo')
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
        eventEmitter.emit('serverUpdate', { model: 'exchange_log', data: dbResult })
    }).catch((err) => {
        console.log(err)
    })
    setTimeout(fetchCurrenciesData, parseInt(config.get('App.fetchInterval')))
}

fetchCurrenciesData()

// Mongo Connection
mongoose.connect(format(config.get('Mongo.uri'), config.get('Mongo.dbName')), config.get('Mongo.connectionParameters')).then(
    () => { console.log('Connected to MongoDB') },
    err => { console.log(err) },
)

// Starting Server

server.listen(config.get('App.port'));

function handler (req, res) {
    fs.readFile(
        __dirname + '/pages/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200);
            res.end(data);
        }
    );
}

io.on('connection', async (socket) => {
    console.log('User connected')
    if (!eventEmitter.serverUpdate) {
        eventEmitter.serverUpdate = eventEmitter.on('serverUpdate', (data) => {
            io.sockets.emit('serverUpdate', data);
        })
    }
    socket.use((packet, next) => {
        if (
            ['read', 'write'].includes(packet[0].toString()) && (
                !packet[1] ||
                typeof packet[1] !== 'object' ||
                !packet[1].hasOwnProperty('model') ||
                !models.hasOwnProperty(packet[1].model.toString())
            )
        ) {
            next('Error', 'Read and write events require correct model to be provided along with them')
        } else {
            next()
        }
    })
    const resultExchangeLog =  await models['exchange_log'].find({}).sort({ createdAt: -1 }).limit(1)
    const resultComment =  await models['comment'].find({}).sort({ createdAt: -1 })
    socket.emit('firstPage', {
        exchange_log: {
            data: resultExchangeLog[0]
        },
        comment: {
            data: resultComment
        }
    });
    socket.on('read', async (req) => {
        const results = await models[req.model].find(
            {},
            ((req.currency)? Object.assign({ [`currencies.${req.currency.toString().toUpperCase()}`] : 1} ,{ createdAt: 1 }) : { currencies: 1, createdAt: 1 })
        ).sort({ createdAt: -1 })
        socket.emit('readResult', { model: req.model, data: results })
    })
    socket.on('write', async (req) => {
        const model = models[req.model](req.data)
        const dbResult = await model.save()
        io.sockets.emit('serverUpdate', { model: req.model, data: dbResult })
    })
});
