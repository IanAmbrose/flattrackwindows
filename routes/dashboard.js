const express = require('express');
const router = express.Router();
const passport = require('passport');
const Group = require('../models/Group');
const User = require('../models/User');
const { ensureAuthenticated } = require('../config/auth');

router.get('/', (req, res) => {
  res.render('welcome');
});

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user._id });
    const currentGroup = req.user.currentGroup;
    res.render('dashboard', { 
      username: req.user.username, 
      userGroups: userGroups,
      currentGroup: currentGroup
    });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/login');
  }
});

router.post('/update-current-group/:id', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group.members.includes(req.user._id)) {
      req.flash('error', 'You cannot set this group as your current group because you are not a member');
      res.redirect('/dashboard');
      return;
    }
    req.user.currentGroup = req.params.id;
    await req.user.save();
    req.flash('success', 'Your current group has been updated');
    res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

module.exports = router;
