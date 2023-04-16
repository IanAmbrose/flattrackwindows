const express = require('express');
const passport = require('passport');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Group = require('../models/Group');
const LocalStrategy = require('passport-local').Strategy;
const router = express.Router();

passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username: username });
        if (!user) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findOne({_id: id});
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash('error', 'Username already exists. Please choose another username.');
      return res.redirect('/register');
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hash });
    await newUser.save();

    req.flash('success', 'Registration successful! You can now log in.');
    res.redirect('/login');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/register');
  }
});
router.get('/login', function (req, res, next) {
  const message = req.flash('error');
  res.render('login', { message });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/welcome',
  failureRedirect: '/login',
  failureFlash: true
}));

router.get('/welcome', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
  
    try {
      const userGroups = await Group.find({ members: req.user._id });
      res.render('welcome', { 
        username: req.user.username, 
        userGroups: userGroups, 
        messages: req.flash()
      });
    } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred. Please try again.');
      res.redirect('/login');
    }
  });
  
  router.post('/leave-group/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
  
    const groupId = req.params.id;
  
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        req.flash('error', 'Invalid group ID. Please try again.');
        return res.redirect('/welcome');
      }
  
      if (!group.members.includes(req.user._id)) {
        req.flash('error', 'You are not a member of this group.');
        return res.redirect('/welcome');
      }
  
      if (group.admin.toString() === req.user._id.toString()) {
        req.flash('error', 'You are the admin of this group. Please delete the group to leave.');
        return res.redirect('/welcome');
      }
  
      group.members.pull(req.user._id);
      await group.save();
      req.flash('success', 'You have successfully left the group.');
      res.redirect('/welcome');
    } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred. Please try again.');
      res.redirect('/welcome');
    }
  });
  
  router.post('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.log(err);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/login');
      } else {
        req.flash('success', 'You have logged out successfully.');
        res.redirect('/login');
      }
    });
  });
  
  router.get('/create-group', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
  
    res.render('create-group', { messages: req.flash() });
  });
  
  router.post('/create-group', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
  
    const { groupName } = req.body;
    const groupCode = nanoid(6);
  
    try {
      const group = new Group({ name: groupName, code: groupCode, admin: req.user._id, members: [req.user._id] });
      await group.save();
      req.flash('success', `Group ${groupName} created successfully. Invite members with the code: ${groupCode}`);
      res.redirect('/welcome');
    } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred. Please try again.');
      res.redirect('/create-group');
    }
  });
  
  router.get('/join-group', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
  
    const { userGroups } = req.user;
  
    res.render('join-group', { messages: req.flash(), userGroups });
  });
  
  router.post('/join-group', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
  
    const { groupCode } = req.body;
  
    try {
      const group = await Group.findOne({ code: groupCode });
      if (!group) {
        req.flash('error', 'Invalid group code. Please check and try again.');
        return res.redirect('/join-group');
      }
  
      if (group.members.includes(req.user._id)) {
        req.flash('error', 'You are already a member of this group.');
        return res.redirect('/join-group');
      }
  
      group.members.push(req.user._id);
      req.user.userGroups.push(group._id);
  
      // Save the changes to the database
      await Promise.all([group.save(), req.user.save()]);
  
      req.flash('success', `You have successfully joined the group ${group.name}.`);
      res.redirect('/welcome');
    } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred. Please try again.');
      res.redirect('/join-group');
    }
  });
  
  router.post('/leave-group/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
  
    const { id } = req.params;
  
    try {
      const group = await Group.findById(id);
      if (!group) {
        req.flash('error', 'Invalid group id. Please check and try again.');
        return res.redirect('/welcome');
      }
  
      if (!group.members.includes(req.user._id)) {
        req.flash('error', 'You are not a member of this group.');
        return res.redirect('/welcome');
      }
  
      // Remove the user from the group
      group.members = group.members.filter(member => member.toString() !== req.user._id.toString());
      req.user.userGroups = req.user.userGroups.filter(groupId => groupId.toString() !== group._id.toString());
  
      // Save the changes to the database
      await Promise.all([group.save(), req.user.save()]);
  
      req.flash('success', `You have successfully left the group ${group.name}.`);
      res.redirect('/welcome');
    } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred. Please try again.');
      res.redirect('/welcome');
    }
  });
  
  module.exports = router;