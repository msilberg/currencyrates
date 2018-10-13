const mongoose = require('mongoose')
const Float = require('mongoose-float').loadType(mongoose)
const config = require('config')

const Currencies = mongoose.Schema({
    [config.get('currencies.crypto.btc')]: { type: Float, required: true },
    [config.get('currencies.crypto.eth')]: { type: Float, required: true },
    [config.get('currencies.crypto.ltc')]: { type: Float, required: true }
}, { _id: false, timestamps: false })

const ExchangeLogSchema = mongoose.Schema({
    currencies: { type: Currencies, required: true }
}, { timestamps: true })

module.exports = mongoose.model('exchange_log', ExchangeLogSchema)
