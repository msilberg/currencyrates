const mongoose = require('mongoose')

const CommentSchema = mongoose.Schema({
    text: { type: String, required: true }
}, { timestamps: true })

module.exports = mongoose.model('comment', CommentSchema)
