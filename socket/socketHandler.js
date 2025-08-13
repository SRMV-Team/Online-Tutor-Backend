const { v4: uuidv4 } = require('uuid');

// In-memory storage (use database in production)
let liveClasses = [];
let connectedUsers = [];

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins with their role and data
    socket.on('join', (userData) => {
      socket.userData = userData;
      connectedUsers.push({
        socketId: socket.id,
        ...userData
      });
      
      // Send current live classes to the user
      socket.emit('liveClassesUpdate', liveClasses);
    });

    // Teacher starts a live class
    socket.on('startLiveClass', (classData) => {
      const meetingId = uuidv4();
      const newLiveClass = {
        id: uuidv4(),
        meetingId: meetingId,
        subject: classData.subject,
        teacher: classData.teacher,
        teacherId: classData.teacherId,
        class: classData.class,
        isLive: true,
        startTime: new Date(),
        participants: []
      };

      liveClasses.push(newLiveClass);
      
      // Broadcast to all connected users
      io.emit('liveClassesUpdate', liveClasses);
      
      // Send meeting ID back to teacher
      socket.emit('classStarted', { 
        success: true, 
        liveClass: newLiveClass 
      });
    });

    // End a live class
    socket.on('endLiveClass', (classId) => {
      liveClasses = liveClasses.filter(cls => cls.id !== classId);
      io.emit('liveClassesUpdate', liveClasses);
      socket.emit('classEnded', { success: true });
    });

    // Join a live class
    socket.on('joinLiveClass', (classData) => {
      const liveClass = liveClasses.find(cls => cls.id === classData.classId);
      if (liveClass) {
        // Add participant to class
        if (!liveClass.participants.find(p => p.userId === socket.userData?.id)) {
          liveClass.participants.push({
            userId: socket.userData?.id,
            name: socket.userData?.name,
            role: socket.userData?.role
          });
        }
        
        socket.emit('joinClassSuccess', { 
          success: true, 
          meetingId: liveClass.meetingId,
          liveClass: liveClass 
        });
      } else {
        socket.emit('joinClassError', { 
          success: false, 
          message: 'Class not found' 
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      connectedUsers = connectedUsers.filter(user => user.socketId !== socket.id);
    });
  });
};

// Export functions to be used in routes
const getLiveClasses = () => liveClasses;
const addLiveClass = (liveClass) => {
  liveClasses.push(liveClass);
  return liveClass;
};
const removeLiveClass = (classId) => {
  liveClasses = liveClasses.filter(cls => cls.id !== classId);
};

module.exports = socketHandler;
module.exports.getLiveClasses = getLiveClasses;
module.exports.addLiveClass = addLiveClass;
module.exports.removeLiveClass = removeLiveClass;
