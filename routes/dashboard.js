const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');

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
    res.render('dashboard', {
      username: req.user.username,
      userGroups: userGroups,
      inGroup: userGroups.length > 0,
      messages: req.flash(),
    });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

router.post('/leave-group/:id', async (req, res) => {
  console.log('Leave group route triggered');
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    console.log('Group found:', group);

    if (!group) {
      req.flash('error', 'Invalid group ID. Please try again.');
      return res.redirect('/dashboard');
    }

    if (!group.members.includes(req.user._id)) {
      req.flash('error', 'You are not a member of this group.');
      return res.redirect('/dashboard');
    }

    if (group.admin.toString() === req.user._id.toString()) {
      // If the user is the group admin, render a confirmation form with a delete button
      return res.render('delete-group', {
        groupName: group.name,
        groupId: group._id,
      });
    }

    await Group.updateOne(
      { _id: groupId },
      { $pull: { members: req.user._id } }
    );

    // Update the user's groupId to null
    await User.findByIdAndUpdate(req.user._id, { groupId: null });

    req.flash('success', 'You have successfully left the group.');
    res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});


// Route to create a group
router.post('/create-group', async (req, res) => {
  if (req.user.currentGroup) {
    req.flash('error', 'You are already in a group. You cannot create a new group.');
    return res.redirect('/dashboard');
  }

  const groupName = req.body.groupName;

  try {
    const newGroup = new Group({
      name: groupName,
      admin: req.user._id,
      members: [req.user._id],
      code: cryptoRandomString({ length: 8, type: 'url-safe' }),
    });

    const savedGroup = await newGroup.save();
    
    req.user.currentGroup = savedGroup._id;
    await req.user.save();

    req.flash('success', 'Group successfully created.');
    res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

router.post('/delete-group/:id', async (req, res) => {
  console.log('Delete group route triggered');
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    console.log('Group found:', group);

    if (!group) {
      req.flash('error', 'Invalid group ID. Please try again.');
      return res.redirect('/dashboard');
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      req.flash('error', 'You are not the admin of this group.');
      return res.redirect('/dashboard');
    }

    await Group.deleteOne({ _id: groupId });

    // Update the user's groupId to null
    await User.findByIdAndUpdate(req.user._id, { groupId: null });

    req.flash('success', 'You have successfully deleted the group.');
    res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

router.get('/group-details/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'username');
    res.render('group-details', {
      group: group,
      messages: req.flash(),
    });
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

router.post('/join-group', async (req, res) => {
  try {
    const groupCode = req.body.groupCode;
    const group = await Group.findOne({ code: groupCode });

    if (!group) {
      req.flash('error', 'Invalid group code. Please try again.');
      return res.redirect('/dashboard');
    }

    if (group.members.includes(req.user._id)) {
      req.flash('error', 'You are already a member of this group.');
      return res.redirect('/dashboard');
    }

    await Group.findByIdAndUpdate(group._id, { $push: { members: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { currentGroup: group._id });

    req.flash('success', 'You have successfully joined the group.');
    res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});


module.exports = router;
