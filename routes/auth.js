const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated, ensureGuest } = require('../config/auth');

// Login Page
router.get('/login', ensureGuest, (req, res) => {
  res.render('login');
});

// Login Handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// Logout Handle
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/login');
});

module.exports = router;