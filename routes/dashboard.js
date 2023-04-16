const express = require('express');
const router = express.Router();
const Group = require('../models/Group');

router.use((req, res, next) => {
  if (!req.isAuthenticated()) {
    res.redirect('/login');
  } else {
    next();
  }
});

router.get('/', async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user._id });
    res.render('dashboard', { username: req.user.username, userGroups: userGroups, messages: req.flash() });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

router.post('/leave-group/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) {
      req.flash('error', 'Invalid group ID. Please try again.');
      return res.redirect('/dashboard');
    }

    if (!group.members.includes(req.user._id)) {
      req.flash('error', 'You are not a member of this group.');
      return res.redirect('/dashboard');
    }

    if (group.admin.toString() === req.user._id.toString()) {
      req.flash('error', 'You are the admin of this group. Please delete the group to leave.');
      return res.redirect('/dashboard');
    }

    group.members.pull(req.user._id);
    await group.save();
    req.flash('success', 'You have successfully left the group.');
    res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

module.exports = router;
