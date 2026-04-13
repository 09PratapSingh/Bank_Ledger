const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const tokenBlacklistModel = require('../models/blacklist.model')

/**
 * - user register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res){
    // 🚀 1. Grab the transactionPin from the request body
    const {email, name, password, transactionPin} = req.body;
    
    // 🚀 2. Validate the PIN (Must exist and be exactly 4 or 6 digits)
    if (!transactionPin || !/^\d{4}$|^\d{6}$/.test(transactionPin)) {
        return res.status(400).json({
            message: "A 4 or 6-digit Security PIN is required to open an account.",
            status: "failed"
        });
    }

    const userExists = await userModel.findOne({email: email});
    if(userExists){
        return res.status(422).json({
            message: "Email already exists. Please use a different email address.",
            status: "failed"
        });
    }

    // 🚀 3. Save the custom PIN to the database
    const user = await userModel.create({
        email, password, name, transactionPin 
    });

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: '3d'});

    res.cookie('token', token);

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: user.systemUser || false
        },
        token
    });

    await emailService.sendRegistrationEmail(user.email, user.name);
}

/**
 * - user login controller
 * - POST /api/auth/login
 */

async function userLoginController(req, res){
    const {email, password} = req.body;

    const user = await userModel.findOne({email}).select('+password +systemUser');
    if(!user){
        return res.status(401).json({
            message: "Email or password is incorrect",
        });
    }

    const isValidPassword = await user.comparePassword(password);
    if(!isValidPassword){
        return res.status(401).json({
            message: "Email or password is incorrect",
        });
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: '3d'});

    res.cookie('token', token, { 
    httpOnly: true, 
    secure: true,        // REQUIRED: Allows cookies over HTTPS
    sameSite: 'none',    // REQUIRED: Tells the browser "Yes, Vercel is allowed to save this Render cookie"
    maxAge: 3600000 
    });

    return res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            systemUser: user.systemUser || false

        },
        token
    });


}

/**
 * -user logout controller
 * -POST /api/auth/logout
 */

async function userLogoutController(req,res){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token){
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }

    

    await tokenBlacklistModel.create({
        token: token
    })

    res.cookie("token", "")

    res.status(200).json({
        message: "User logged out Successfully"
    })

}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
}