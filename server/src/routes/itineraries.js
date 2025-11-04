const express = require('express');
const Itinerary = require('../models/Itinerary');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all itineraries for the authenticated user (including group trips where user is a participant)
router.get('/', auth, async (req, res) => {
  try {
    const userItineraries = await Itinerary.find({ user: req.user._id })
      .populate('participants.user', 'name email')
      .sort({ startDate: -1 });
    
    const groupItineraries = await Itinerary.find({
      'participants.user': req.user._id,
      isGroupTrip: true
    })
      .populate('participants.user', 'name email')
      .sort({ startDate: -1 });
    
    // Combine and deduplicate
    const allItineraries = [...userItineraries];
    groupItineraries.forEach(it => {
      if (!allItineraries.find(i => i._id.toString() === it._id.toString())) {
        allItineraries.push(it);
      }
    });
    
    res.json(allItineraries.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single itinerary
router.get('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
      .populate('participants.user', 'name email');
    
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    
    // Check if user has access (owner or participant)
    const hasAccess = itinerary.user.toString() === req.user._id.toString() ||
      (itinerary.isGroupTrip && itinerary.participants.some(p => p.user.toString() === req.user._id.toString()));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(itinerary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new itinerary
router.post('/', auth, async (req, res) => {
  try {
    const { isGroupTrip, participants } = req.body;
    
    // Initialize participants array with owner
    let participantsData = [{
      user: req.user._id,
      role: 'owner',
      joinedAt: new Date()
    }];
    
    // Add other participants if group trip
    if (isGroupTrip && participants && participants.length > 0) {
      participants.forEach(userId => {
        if (userId.toString() !== req.user._id.toString()) {
          participantsData.push({
            user: userId,
            role: 'member',
            joinedAt: new Date()
          });
        }
      });
    }
    
    const itinerary = new Itinerary({
      ...req.body,
      user: req.user._id,
      isGroupTrip: isGroupTrip || false,
      participants: participantsData
    });
    
    await itinerary.save();
    await itinerary.populate('participants.user', 'name email');
    
    res.status(201).json(itinerary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update an itinerary
router.put('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    
    // Check if user has access (owner or participant)
    const isOwner = itinerary.user.toString() === req.user._id.toString();
    const isParticipant = itinerary.isGroupTrip && 
      itinerary.participants.some(p => p.user.toString() === req.user._id.toString());
    
    if (!isOwner && !isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Only owner can update participants
    if (req.body.participants && !isOwner) {
      return res.status(403).json({ message: 'Only owner can modify participants' });
    }
    
    // Handle participants update
    if (req.body.participants && isOwner) {
      const { participants } = req.body;
      let participantsData = [{
        user: req.user._id,
        role: 'owner',
        joinedAt: itinerary.participants.find(p => p.role === 'owner')?.joinedAt || new Date()
      }];
      
      participants.forEach(userId => {
        if (userId.toString() !== req.user._id.toString()) {
          const existing = itinerary.participants.find(
            p => p.user.toString() === userId.toString()
          );
          participantsData.push({
            user: userId,
            role: 'member',
            joinedAt: existing?.joinedAt || new Date()
          });
        }
      });
      
      req.body.participants = participantsData;
    }
    
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('participants.user', 'name email');
    
    res.json(updatedItinerary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add participant to itinerary
router.post('/:id/participants', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    
    // Only owner can add participants
    if (itinerary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can add participants' });
    }
    
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check if already a participant
    if (itinerary.participants.some(p => p.user.toString() === userId.toString())) {
      return res.status(400).json({ message: 'User is already a participant' });
    }
    
    itinerary.participants.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });
    
    itinerary.isGroupTrip = true;
    await itinerary.save();
    await itinerary.populate('participants.user', 'name email');
    
    res.json(itinerary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove participant from itinerary
router.delete('/:id/participants/:participantId', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    
    // Only owner can remove participants
    if (itinerary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can remove participants' });
    }
    
    const participant = itinerary.participants.id(req.params.participantId);
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Cannot remove owner
    if (participant.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove owner' });
    }
    
    participant.remove();
    await itinerary.save();
    await itinerary.populate('participants.user', 'name email');
    
    res.json(itinerary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Search users by email (for adding to group trips)
router.get('/users/search', auth, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required' });
    }
    
    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('name email').limit(10);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an itinerary
router.delete('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    res.json({ message: 'Itinerary deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

