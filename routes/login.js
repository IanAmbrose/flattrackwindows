const express = require('express');
const passport = require('passport');
const router = express.Router();

// GET login page
router.get('/login', function (req, res, next) {
  const message = req.flash('error');
  res.render('login', { message });
});

// POST login
router.post('/', (req, res, next) => {
    passport.authenticate('local', {
      successRedirect: '/dashboard',
      failureRedirect: '/login',
      failureFlash: true,
    })(req, res, next);
  });

module.exports = router;
