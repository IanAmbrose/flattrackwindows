const express = require('express');
const app = express();
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo');


require('dotenv').config();
// Passport config
require('./config/passport')(passport);

// DB config
const db = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// EJS
app.set('view engine', 'ejs');

// Bodyparser
app.use(express.urlencoded({ extended: false }));

// Express session
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: db,
    mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
    ttl: 14 * 24 * 60 * 60 // = 14 days. Default
  })
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/userRoutes'));
app.use('/groups', require('./routes/groupRoutes'));
app.use('/dashboard', require('./routes/dashboard'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server started on port ${PORT}`));
