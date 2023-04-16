const express = require('express');
const router = express.Router();

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You must be logged in to access that page.');
  res.redirect('/login');
}

// Profile route
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('groups');
    res.render('profile', { user });
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred while retrieving your profile information.');
    res.redirect('/dashboard');
  }
});
module.exports = router;
