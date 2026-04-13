const accountModel = require('../models/account.model');
const userModel = require('../models/user.model');

async function createAccountController(req, res){
    const user= req.user;

    const account = await accountModel.create({
        user: user._id,
    });

    return res.status(201).json({
        message: "Account created successfully",
        account
    });
}

async function getUserAccountsController(req,res){
    try {
        const accounts = await accountModel.find({ user: req.user._id });

        return res.status(200).json({
            accounts: accounts,
            userName: req.user.name // 👈 NEW: Send the name from the verified token!
        });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        return res.status(500).json({ message: "Failed to fetch accounts" });
    }

}

async function getAccountBalanceController(req, res){
    const {accountId} = req.params;

    const account = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    });

    if(!account){
        return res.status(404).json({
            message: "Account not found"
        })
    }

    const balance = await account.getBalance();

    res.status(200).json({
        accountId: account._id,
        balance: balance
    })


}

async function lookupAccountByEmailController(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required for lookup." });
        }

        // 1. Find the user by email
        const targetUser = await userModel.findOne({ email: email.toLowerCase().trim() });
        
        if (!targetUser) {
            return res.status(404).json({ message: "No user found with that email address." });
        }

        // 2. Find an active account for that user
        const targetAccount = await accountModel.findOne({ 
            user: targetUser._id, 
            status: 'active' 
        });

        if (!targetAccount) {
            return res.status(404).json({ message: "This user exists but has no active bank accounts." });
        }

        // 3. Send back the hidden Account ID and their Name for the UI
        return res.status(200).json({
            message: "Account found",
            name: targetUser.name,
            accountId: targetAccount._id
        });

    } catch (error) {
        console.error("[Lookup Error]:", error);
        return res.status(500).json({ message: "Server error during account lookup." });
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    lookupAccountByEmailController
}