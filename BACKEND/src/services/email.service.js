require('dotenv').config(); 
const nodemailer = require('nodemailer');


/* const transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
     type: 'OAuth2',
     user: process.env.EMAIL_USER,
     clientId: process.env.CLIENT_ID,
     clientSecret: process.env.CLIENT_SECRET,
     refreshToken: process.env.REFRESH_TOKEN,
   },
 });

 Verify the connection configuration
 transporter.verify((error, success) => {
   if (error) {
     console.error('Error connecting to email server:', error);
   } else {
     console.log('Email server is ready to send messages');
   }
 });
*/

/*
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // 👈 Using the App Password instead of OAuth
  },
});
*/

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, 
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});


// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// ... keep the rest of your sendEmail functions exactly as they are ...


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend-ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

async function sendRegistrationEmail(userEmail, name) {
  const subject = 'Welcome to Backend-ledger!';
  const text = `Hi ${name},\n\nThank you for registering at Backend-ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend-ledger Team`;
  const html = `<p>Hi ${name},</p><p>Thank you for registering at Backend-ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend-ledger Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Successful!"
  const text = `Hello ${name}, \n\nYour transaction of ₹${amount} to account ${toAccount} was successful. \n\nBest regards, \n The Backend Ledger Team`;
  const html = `<p> Hello ${name}, </p><p>Your transaction of ₹${amount} to account ${toAccount} was successful. </p><p>Best regards, <br> The Backend Ledger Team</p>`

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Failed"
  const text = `Hello ${name}, \n\nWe regret to inform you that your transaction of ₹${amount} to account ${toAccount} failed. \n\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name}, </p><p>We regret to inform you that your transaction of ₹${amount} to account ${toAccount} failed. </p><p>The Backend Ledger Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

// 🚀 NEW: Function to notify the receiver
async function sendReceiverEmail(receiverEmail, receiverName, amount, fromAccountId) {
  const subject = "Money Received - BankLedger 💰";
  const text = `Hello ${receiverName},\n\nGood news! You have just received ₹${amount}.\n\nFrom Account: ${fromAccountId}\n\nLog in to your BankLedger dashboard to view your updated balance and transaction history.\n\nSecurely yours,\nThe Backend Ledger Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 10px;">
        <h2>Hello ${receiverName},</h2>
        <p>Good news! You have just received <strong>₹${amount}</strong>.</p>
        <p><strong>From Account:</strong> ${fromAccountId}</p>
        <p>Log in to your BankLedger dashboard to view your updated balance and transaction history.</p>
        <br/>
        <p>Securely yours,<br/>The Backend Ledger Team</p>
    </div>
  `;

  await sendEmail(receiverEmail, subject, text, html);
}

// 🚀 NEW: Low Balance Alert Email
// 🚀 NEW: Low Balance Alert Email Function
async function sendLowBalanceAlert(email, name, balance) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER, // or whatever your 'from' email variable is
      to: email,
      subject: '⚠️ Action Required: Low Balance Alert',
      html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
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
                </div>
            `
    };

    const info = await transporter.sendMail(mailOptions); // make sure 'transporter' matches what you called it in this file!
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending low balance alert:", error);
  }
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail,
  sendReceiverEmail,
  sendLowBalanceAlert
};