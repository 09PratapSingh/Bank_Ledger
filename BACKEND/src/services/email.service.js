const { Resend } = require('resend');

// Initialize Resend with the key from Render's Environment Variables
const resend = new Resend(process.env.RESEND_API_KEY);

// On Resend's free tier, the sender email MUST be their testing domain
const SYSTEM_SENDER = 'BankLedger <onboarding@resend.dev>';

async function sendRegistrationEmail(userEmail, name) {
    try {
        await resend.emails.send({
            from: SYSTEM_SENDER,
            to: userEmail,
            subject: 'Welcome to BankLedger!',
            html: `<p>Hi ${name},</p>
                   <p>Thank you for registering at BankLedger. We're excited to have you on board!</p>
                   <p>Best regards,<br>The BankLedger Team</p>`
        });
        console.log("✅ Registration email delivered via Resend");
    } catch (error) {
        console.error("❌ Resend Registration Error:", error.message);
    }
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
    try {
        await resend.emails.send({
            from: SYSTEM_SENDER,
            to: userEmail,
            subject: 'Transaction Successful!',
            html: `<p>Hello ${name},</p>
                   <p>Your transaction of <b>₹${amount}</b> to account ${toAccount} was successful.</p>
                   <p>Best regards,<br>The BankLedger Team</p>`
        });
        console.log("✅ Sender email delivered via Resend");
    } catch (error) {
        console.error("❌ Resend Sender Error:", error.message);
    }
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
    try {
        await resend.emails.send({
            from: SYSTEM_SENDER,
            to: userEmail,
            subject: 'Transaction Failed',
            html: `<p>Hello ${name},</p>
                   <p>We regret to inform you that your transaction of <b>₹${amount}</b> to account ${toAccount} failed.</p>
                   <p>The BankLedger Team</p>`
        });
        console.log("✅ Failure email delivered via Resend");
    } catch (error) {
        console.error("❌ Resend Failure Error:", error.message);
    }
}

async function sendReceiverEmail(receiverEmail, receiverName, amount, fromAccountId) {
    try {
        await resend.emails.send({
            from: SYSTEM_SENDER,
            to: receiverEmail,
            subject: 'Money Received - BankLedger 💰',
            html: `<div style="font-family: Arial, sans-serif; padding: 10px;">
                    <h2>Hello ${receiverName},</h2>
                    <p>Good news! You have just received <strong>₹${amount}</strong>.</p>
                    <p><strong>From Account:</strong> ${fromAccountId}</p>
                    <p>Log in to your BankLedger dashboard to view your updated balance and transaction history.</p>
                    <br/>
                    <p>Securely yours,<br/>The BankLedger Team</p>
                   </div>`
        });
        console.log("✅ Receiver email delivered via Resend");
    } catch (error) {
        console.error("❌ Resend Receiver Error:", error.message);
    }
}

async function sendLowBalanceAlert(email, name, balance) {
    try {
        await resend.emails.send({
            from: SYSTEM_SENDER,
            to: email,
            subject: '⚠️ Action Required: Low Balance Alert',
            html: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #ef4444; padding: 20px; text-align: center;">
                        <h2 style="color: white; margin: 0;">Low Balance Alert</h2>
                    </div>
                    <div style="padding: 24px;">
                        <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
                        <p>This is an automated security alert from BankLedger to inform you that your account balance has dropped to critically low levels.</p>
                        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0;">
                            <p style="margin: 0; font-size: 18px; color: #991b1b;"><strong>Current Balance: ₹${balance}</strong></p>
                        </div>
                        <p>Please log in to your dashboard and add funds to your account to ensure future transactions are not declined.</p>
                        <br>
                        <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">Securely yours,</p>
                        <p style="margin-top: 5px; font-weight: bold; color: #111827;">The BankLedger Security Team</p>
                    </div>
                   </div>`
        });
        console.log("✅ Low balance email delivered via Resend");
    } catch (error) {
        console.error("❌ Resend Low Balance Error:", error.message);
    }
}

module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailureEmail,
    sendReceiverEmail,
    sendLowBalanceAlert
};