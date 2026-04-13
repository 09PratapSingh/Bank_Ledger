const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, "Ledger entry must be associated with an Account"],
        index: true,
        immutable: true
    },
    amount: {
        type: Number,
        required: [true, "amount is required for creating a Ledger entry"],
        immutable: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: [true, "Ledger entry must be associated with a Transaction"],
        index: true,
        immutable: true
    },
    type: {
        type: String,
        enum: {
            values: ['DEBIT', 'CREDIT'],
            message: 'Ledger entry type must be either debit or credit'
        },
        required: [true, "Ledger entry type is required"],
        immutable: true

    }
}, {
    timestamps: true
});

function preventledgerModification(){
    throw new Error("Ledger entries cannot be modified after creation");
}

ledgerSchema.pre('findOneAndUpdate', preventledgerModification);
ledgerSchema.pre('updateOne', preventledgerModification);
ledgerSchema.pre('updateMany', preventledgerModification);
ledgerSchema.pre('update', preventledgerModification);
ledgerSchema.pre('deleteMany', preventledgerModification);
ledgerSchema.pre('deleteOne', preventledgerModification);
ledgerSchema.pre('findOneAndDelete', preventledgerModification);
ledgerSchema.pre('findOneAndRemove', preventledgerModification);
ledgerSchema.pre('remove', preventledgerModification);
ledgerSchema.pre('findOneAndReplace', preventledgerModification);


const ledgerModel = mongoose.model('Ledger', ledgerSchema);



module.exports = ledgerModel;