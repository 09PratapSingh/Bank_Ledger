const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const accountController = require('../controllers/account.controller');

const router = express.Router();

/**
 * -POST /api/accounts
 * -Create a new account
 * -Protected route 
 */
router.post('/', authMiddleware.authMiddleware, accountController.createAccountController);

/**
 * -GET /api/accounts
 * -Get all accounts of the logged-in user
 * -Protected Route
 */
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController)

/**
 * -GET /api/accounts/balance/: accountId
 * -Get balance of all accounts of the loggedin user
 * Protected route
 */

router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController)



/**
 * -POST /api/accounts/lookup
 * -Lookup account by email
 * -Protected route
 */
router.post('/lookup', authMiddleware.authMiddleware, accountController.lookupAccountByEmailController);


module.exports = router;