const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors'); 

const app = express();

// 2. Configure CORS before your routes
// The VIP Guest List for your backend
const allowedOrigins = [
  'http://127.0.0.1:5500', 
  'http://localhost:5500',
  'https://bank-ledger-frontend-three.vercel.app',
  'https://quiet-palmier-0ab8d7.netlify.app' // NO slash at the end!
];

app.use(cors({
    // origin: 'https://bank-ledger.netlify.app', 
    origin:allowedOrigins,
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());    

/**
 * -Routes required
 */
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');

/**
 * - API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);

// dummy api
app.get("/", (req, res) => {
    res.send("Ledger service is up and running.")
});

// Proxy route for currency conversion
app.get("/api/rates", async (req, res) => {
    const { amount, from, to } = req.query;
    try {
        // Node.js fetches the data instead of the browser
        const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
        if (!response.ok) throw new Error("API failed");
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
});


module.exports = app;