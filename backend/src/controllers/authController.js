const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const refreshTokens = new Set();

// Token generators
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m' // Short lifespan (15 minutes) for access tokens
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Long lifespan (7 days) for refresh tokens
  });
};

// Set refresh token cookie helper
const sendRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    refreshTokens.add(refreshToken);

    sendRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    const user = await User.findOne({ email });
    let isMatch = false;
    if (user) {
      isMatch = await user.matchPassword(password);
    }

    if (!user || !isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Persist refresh token
    refreshTokens.add(refreshToken);
    sendRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (Uses Refresh Token HTTP cookie)
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    // Verify token exists in database store
    if (!refreshTokens.has(refreshToken)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or revoked refresh token'
      });
    }

    // Verify token validity
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      refreshTokens.delete(refreshToken); // Token expired/corrupted, delete it
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired, please login again'
      });
    }

    // Verify user exists
    const user = await User.findById(decoded.id);

    if (!user) {
      refreshTokens.delete(refreshToken);
      res.clearCookie('refreshToken');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Token Rotation: Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Swap old refresh token with new one
    refreshTokens.delete(refreshToken);
    refreshTokens.add(newRefreshToken);

    // Send new cookie
    sendRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Private/Public
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // req.user is populated by protect middleware
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};
