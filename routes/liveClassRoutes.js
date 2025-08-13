const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getLiveClasses, addLiveClass, removeLiveClass } = require('../socket/socketHandler');

const router = express.Router();

// Get all live classes
router.get('/', (req, res) => {
  try {
    const liveClasses = getLiveClasses();
    res.json(liveClasses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start a live class - FIXED VERSION
// routes/liveClassRoutes.js - Fix the start route
router.post('/start', (req, res) => {
  try {
    const { subject, teacher, teacherId, class: className, roomName, jitsiUrl } = req.body;
    
    console.log('Starting live class with data:', req.body); // Debug log
    
    // Check for required fields
    if (!subject || !teacher || !teacherId || !className) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const meetingId = uuidv4();
    const newLiveClass = {
      id: uuidv4(),
      meetingId: meetingId,
      subject,
      teacher,
      teacherId,
      class: className,
      roomName: roomName || `${subject}-${className}-${Date.now()}`,
      jitsiUrl: jitsiUrl || `https://meet.jit.si/${roomName}`,
      isLive: true,
      startTime: new Date(),
      participants: []
    };
    
    addLiveClass(newLiveClass);
    
    // Broadcast to all connected sockets
    const io = req.app.get('io');
    if (io) {
      io.emit('liveClassesUpdate', getLiveClasses());
      console.log('Broadcasted live class update'); // Debug log
    }
    
    res.json({ success: true, liveClass: newLiveClass });
  } catch (error) {
    console.error('Error starting live class:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// router.post('/start', (req, res) => {
//   try {
//     const { subject, teacher, teacherId, class: className, roomName, jitsiUrl } = req.body;
    
//     const meetingId = uuidv4();
//     const newLiveClass = {
//       id: uuidv4(),
//       meetingId: meetingId,
//       subject,
//       teacher,
//       teacherId,
//       class: className,
//       roomName: roomName, // ADD THIS - This was missing!
//       jitsiUrl: jitsiUrl, // ADD THIS - This was missing!
//       isLive: true,
//       startTime: new Date(),
//       participants: []
//     };

//     addLiveClass(newLiveClass);
    
//     // Broadcast to all connected sockets
//     const io = req.app.get('io');
//     io.emit('liveClassesUpdate', getLiveClasses());
    
//     res.json({ success: true, liveClass: newLiveClass });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// End a live class
router.delete('/end/:classId', (req, res) => {
  try {
    const { classId } = req.params;
    removeLiveClass(classId);
    
    const io = req.app.get('io');
    io.emit('liveClassesUpdate', getLiveClasses());
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get live classes for a specific class
router.get('/class/:className', (req, res) => {
  try {
    const { className } = req.params;
    const liveClasses = getLiveClasses();
    const classLiveClasses = liveClasses.filter(cls => cls.class === className && cls.isLive);
    
    res.json(classLiveClasses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get live classes by teacher
router.get('/teacher/:teacherId', (req, res) => {
  try {
    const { teacherId } = req.params;
    const liveClasses = getLiveClasses();
    const teacherClasses = liveClasses.filter(cls => cls.teacherId === teacherId && cls.isLive);
    
    res.json(teacherClasses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
