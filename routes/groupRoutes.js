const express = require('express');
const router = express.Router();
const passport = require('passport');
const Group = require('../models/Group');
const User = require('../models/User');
const { ensureAuthenticated } = require('../config/auth');

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user._id });
    res.render('dashboard', { 
      username: req.user.username, 
      userGroups: userGroups 
    });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/login');
  }
});

router.get('/create-group', ensureAuthenticated, (req, res) => {
  res.render('create-group');
});

router.post('/create-group', ensureAuthenticated, async (req, res) => {
  try {
    const group = new Group({ 
      name: req.body.name,
      description: req.body.description,
      admin: req.user._id,
      members: [req.user._id]
    });
    await group.save();
    req.flash('success', 'Group created successfully');
    res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/create-group');
  }
});

router.get('/group/:id', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members');
    res.render('group', { 
      username: req.user.username, 
      group: group 
    });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

router.post('/join-group/:id', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group.members.includes(req.user._id)) {
      group.members.push(req.user._id);
      await group.save();
      req.flash('success', 'You have joined the group');
    } else {
      req.flash('error', 'You are already a member of this group');
    }
    res.redirect(`/group/${req.params.id}`);
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

router.post('/leave-group/:id', ensureAuthenticated, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (group.admin.equals(req.user._id)) {
      req.flash('error', 'You are the admin of this group and cannot leave it');
    } else if (group.members.includes(req.user._id)) {
      group.members = group.members.filter(member => !member.equals(req.user._id));
      await group.save();
      req.flash('success', 'You have left the group');
    } else {
      req.flash('error', 'You are not a member of this group');
    }
    res.redirect(`/group/${req.params.id}`);
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

module.exports = router;