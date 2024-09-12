const express = require('express')
const router = express.Router()
const User = require('../models/Useres')

// Create a new event
router.post('/', async (req, res) => {
    const { email, password } = req.body;
    try {
      const newUser = new User({ email, password });
      await newUser.save();
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create event' });
    }
  });
  
  // Get all events for a specific date
router.get('/', async (req, res) => {
    const { date } = req.params;
    try {
      const User = await User.find({ });
      res.status(200).json(User);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  module.exports = router;