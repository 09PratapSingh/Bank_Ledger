const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
        default: 'PENDING'
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true
    },
    // The HMAC Digital Signature
    signature: {
        type: String,
        required: true
    }
}, { timestamps: true });

const transactionModel = mongoose.model('Transaction', transactionSchema);
module.exports = transactionModel;