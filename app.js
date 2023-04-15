const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');
const dotenv = require('dotenv');
const { nanoid } = require('nanoid');
const path = require('path');

const User = require('./models/User');
const Group = require('./models/Group');

dotenv.config();

const app = express();

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return done(null, false, { message: 'Incorrect password.' });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
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

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/welcome',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/welcome', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  try {
    const userGroups = await Group.find({ members: req.user._id });
    res.render('welcome', { username: req.user.username, userGroups });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/login');
  }
});

app.post('/logout', (req, res) => {
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

app.get('/create-group', (req, res) => {
  res.render('create-group', { messages: req.flash() });
});

app.post('/create-group', async (req, res) => {
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

app.get('/join-group', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  res.render('join-group');
});

app.post('/join-group', async (req, res) => {
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
    await group.save();
    req.flash('success', `You have successfully joined the group ${group.name}.`);
    res.redirect('/welcome');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/join-group');
  }
});

app.get('/groups', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  try {
    const groups = await Group.find().populate('members', 'username');
    res.render('groups', { groups });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/welcome');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

