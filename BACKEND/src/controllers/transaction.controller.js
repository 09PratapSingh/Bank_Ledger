const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET is not defined in environment variables. Server cannot start securely.");
}
const SYSTEM_SECRET = process.env.JWT_SECRET;

// 🔐 HMAC Digital Signatures Engine
function generateSignature(fromAccount, toAccount, amount) {
    const dataString = `${String(fromAccount)}-${String(toAccount)}-${Number(amount)}`;
    return crypto.createHmac('sha256', SYSTEM_SECRET).update(dataString).digest('hex');
}

async function createTransaction(req, res) {
    try {
        const { fromAccount, toAccount, amount, idempotencyKey, pin } = req.body;

        if (!fromAccount || !toAccount || !amount || !idempotencyKey || !pin) {
            return res.status(400).json({ message: "Missing required fields, including PIN." });
        }

        // Force PIN to string to prevent bcrypt type errors
        const pinStr = String(pin);

        // Fetch the sender's full user document to ensure we have their email and name
        const user = await userModel.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const storedPin = user.transactionPin;
        let pinIsValid;

        if (storedPin && storedPin.startsWith("$2b$")) {
            pinIsValid = await bcrypt.compare(pinStr, storedPin);
        } else {
            pinIsValid = pinStr === String(storedPin || "1234");
            if (pinIsValid) {
                user.transactionPin = await bcrypt.hash(pinStr, 10);
                await user.save();
            }
        }

        if (!pinIsValid) {
            return res.status(401).json({ message: "Invalid Transaction PIN. Transfer blocked." });
        }

        const fromUserAccount = await accountModel.findOne({ _id: fromAccount });
        if (!fromUserAccount) {
            return res.status(404).json({ message: "Sender account not found." });
        }

        const recipientUser = await userModel.findOne({ email: toAccount });
        if (!recipientUser) {
            return res.status(404).json({ message: "Recipient email not found in our system." });
        }

        const toUserAccount = await accountModel.findOne({ user: recipientUser._id });
        if (!toUserAccount) {
            return res.status(404).json({ message: "Recipient user does not have an active bank account." });
        }

        const realToAccountId = toUserAccount._id;

        const existingTx = await transactionModel.findOne({ idempotencyKey });
        if (existingTx) {
            return res.status(200).json({ message: "Transaction already processed", transaction: existingTx });
        }

        let transaction;
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const numericAmount = Number(amount);

            const ledgerEntries = await ledgerModel
                .find({ account: fromAccount })
                .session(session);

            const balance = ledgerEntries.reduce((acc, entry) => {
                return entry.type === "CREDIT" ? acc + entry.amount : acc - entry.amount;
            }, 0);

            if (balance < numericAmount) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Insufficient balance" });
            }

            const signature = generateSignature(fromAccount, realToAccountId, numericAmount);

            transaction = (await transactionModel.create([{
                fromAccount,
                toAccount: realToAccountId,
                amount: numericAmount,
                idempotencyKey,
                status: "PENDING",
                signature,
            }], { session }))[0];

            await ledgerModel.create(
                [{ account: fromAccount, amount: numericAmount, transaction: transaction._id, type: "DEBIT" }],
                { session }
            );
            await ledgerModel.create(
                [{ account: realToAccountId, amount: numericAmount, transaction: transaction._id, type: "CREDIT" }],
                { session }
            );

            await transactionModel.findOneAndUpdate(
                { _id: transaction._id },
                { status: "COMPLETED" },
                { session, new: true }
            );

            await session.commitTransaction();
            session.endSession();

        } catch (dbError) {
            try {
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }
            } catch (abortErr) {
                console.error("Failed to cleanly abort transaction:", abortErr);
            } finally {
                session.endSession();
            }
            console.error("Database Transaction Error:", dbError);
            return res.status(500).json({ message: "Transaction failed at database level." });
        }

        // 📧 Email notifications
        // Awaits ensure the server doesn't close the connection before Google sends the email.
        // We use 'user' and 'recipientUser' to guarantee the variables exist.
        try {
            await emailService.sendTransactionEmail(user.email, user.name, Number(amount), realToAccountId);

            if (recipientUser.email) {
                await emailService.sendReceiverEmail(recipientUser.email, recipientUser.name, Number(amount), fromAccount);
            }
        } catch (emailError) {
            console.warn("⚠️ Email block failed.", emailError.message);
        }

        // 🔔 Low Balance Alert
        try {
            const LOW_BALANCE_LIMIT = 250;
            const postLedger = await ledgerModel.find({ account: fromAccount });
            const newBalance = postLedger.reduce((acc, entry) => {
                return entry.type === "CREDIT" ? acc + entry.amount : acc - entry.amount;
            }, 0);

            if (newBalance <= LOW_BALANCE_LIMIT) {
                await emailService.sendLowBalanceAlert(user.email, user.name, newBalance);
            }
        } catch (balanceErr) {
            console.error("Non-critical: Failed to send low balance alert", balanceErr);
        }

        return res.status(201).json({ message: "Success", transaction });

    } catch (globalError) {
        console.error("Global Transaction Error:", globalError);
        return res.status(500).json({ message: "An unexpected error occurred processing your request." });
    }
}

async function updateTransactionPin(req, res) {
    try {
        const { currentPin, newPin } = req.body;
        const user = await userModel.findById(req.user._id);

        const storedPin = user.transactionPin;

        let currentPinValid;
        if (storedPin && storedPin.startsWith("$2b$")) {
            currentPinValid = await bcrypt.compare(String(currentPin), storedPin);
        } else {
            currentPinValid = String(currentPin) === String(storedPin || "1234");
        }

        if (!currentPinValid) {
            return res.status(400).json({ message: "Your Current PIN is incorrect." });
        }

        if (!/^\d{4}$|^\d{6}$/.test(newPin)) {
            return res.status(400).json({ message: "New PIN must be exactly 4 or 6 digits." });
        }

        user.transactionPin = await bcrypt.hash(String(newPin), 10);
        await user.save();

        return res.status(200).json({ message: "Transaction PIN updated successfully!" });
    } catch (error) {
        console.error("Update PIN Error:", error);
        return res.status(500).json({ message: "Failed to update PIN." });
    }
}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    const SYSTEM_RESERVE_ACCOUNT_ID = process.env.SYSTEM_RESERVE_ACCOUNT_ID;
    if (!SYSTEM_RESERVE_ACCOUNT_ID) {
        return res.status(500).json({ message: "System reserve account is not configured." });
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const signature = generateSignature(SYSTEM_RESERVE_ACCOUNT_ID, toAccount, amount);

        const transaction = new transactionModel({
            fromAccount: SYSTEM_RESERVE_ACCOUNT_ID,
            toAccount,
            amount: Number(amount),
            idempotencyKey,
            status: "COMPLETED",
            signature,
        });

        await ledgerModel.create(
            [{ account: SYSTEM_RESERVE_ACCOUNT_ID, amount: Number(amount), transaction: transaction._id, type: "DEBIT" }],
            { session }
        );
        await ledgerModel.create(
            [{ account: toAccount, amount: Number(amount), transaction: transaction._id, type: "CREDIT" }],
            { session }
        );

        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ message: "Funds added", transaction });
    } catch (error) {
        try {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
        } catch (e) { } finally {
            session.endSession();
        }
        console.error("Init Funds Error:", error);
        return res.status(500).json({ message: "Failed to add funds" });
    }
}

async function getTransactionHistoryController(req, res) {
    try {
        const myAccounts = await accountModel.find({ user: req.user._id }).select('_id');
        const myAccountIds = myAccounts.map(acc => acc._id);

        if (myAccountIds.length === 0) {
            return res.status(200).json({ transactions: [], myAccountIds: [] });
        }

        const transactions = await transactionModel.find({
            $or: [
                { fromAccount: { $in: myAccountIds } },
                { toAccount: { $in: myAccountIds } }
            ]
        })
            .populate({ path: 'fromAccount', populate: { path: 'user', select: 'email name' } })
            .populate({ path: 'toAccount', populate: { path: 'user', select: 'email name' } })
            .sort({ createdAt: -1 });

        return res.status(200).json({ transactions, myAccountIds });
    } catch (error) {
        console.error("Transaction History Error:", error);
        return res.status(500).json({ message: "Failed to fetch history." });
    }
}

async function auditLedgerController(req, res) {
    try {
        const transactions = await transactionModel.find({ signature: { $exists: true } });
        const brokenLinks = [];

        for (const tx of transactions) {
            const expectedSignature = generateSignature(tx.fromAccount, tx.toAccount, tx.amount);

            if (expectedSignature !== tx.signature) {
                brokenLinks.push({
                    error: "DATA_TAMPERING",
                    transactionId: tx._id,
                    message: `Invalid HMAC Signature. Expected ${expectedSignature.substring(0, 10)}...`
                });
            }
        }

        if (brokenLinks.length === 0) {
            return res.status(200).json({
                status: "SECURE",
                message: "HMAC Signatures are 100% valid. No tampering detected.",
                totalBlocksVerified: transactions.length,
            });
        } else {
            return res.status(400).json({
                status: "TAMPERED",
                message: "CRITICAL ALERT: Invalid cryptographic signatures detected!",
                brokenLinks,
            });
        }
    } catch (error) {
        console.error("Audit Error:", error);
        return res.status(500).json({ message: "Failed to run audit." });
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getTransactionHistoryController,
    auditLedgerController,
    updateTransactionPin,
};