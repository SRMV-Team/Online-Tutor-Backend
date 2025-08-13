const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Multer setup to handle degree certificate uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// POST /api/teacher/register
router.post('/register', upload.single('degreeCertificate'), async (req, res) => {
  const {
    salutation,
    firstName,
    lastName,
    mobile,
    timezone,
    email,
    password,
    preferredSubjects
  } = req.body;

  try {
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle preferredSubjects as array
    let subjectsArray = [];
    if (preferredSubjects) {
      if (Array.isArray(preferredSubjects)) {
        subjectsArray = preferredSubjects;
      } else if (typeof preferredSubjects === 'string') {
        subjectsArray = preferredSubjects.split(',').map(s => s.trim()).filter(s => s);
      }
    }

    const newTeacher = new Teacher({
      salutation,
      firstName,
      lastName,
      email,
      mobile,
      timezone,
      password: hashedPassword,
      preferredSubjects: subjectsArray,
      proof: req.file ? req.file.filename : null,
      isActive: true
    });

    await newTeacher.save();
    res.status(200).json({ message: 'Registration successful. Await admin approval.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/teacher/login - Updated to return complete teacher data
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if teacher is approved
    if (!teacher.isApproved) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is pending admin approval. Please wait for approval.',
        needsApproval: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      teacher: {
        id: teacher._id.toString(), // ⬅️ Make sure this is string
        email: teacher.email,
        isApproved: teacher.isApproved,
        name: teacher.firstName + ' ' + teacher.lastName,
        subjects: teacher.subjects || [],
        classesAssigned: teacher.classesAssigned || [],
        classAssigned: teacher.classAssigned, // For backward compatibility
        preferredSubjects: teacher.preferredSubjects || [],
        isActive: teacher.isActive
      }
    });
  } catch (error) {
    console.error('Error in teacher login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/teacher/subjects/:teacherId - Updated and improved
router.get('/subjects/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    console.log('Fetching subjects for teacher ID:', teacherId);

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found. Please login again.',
        code: 'TEACHER_NOT_FOUND'
      });
    }

    if (!teacher.isApproved) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is pending admin approval.',
        code: 'NOT_APPROVED'
      });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is currently inactive. Please contact admin.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if teacher has subjects assigned
    const assignedSubjects = teacher.subjects || [];
    if (assignedSubjects.length === 0) {
      return res.status(200).json({
        success: true,
        subjects: [],
        teacher: {
          id: teacher._id,
          name: teacher.firstName + ' ' + teacher.lastName,
          subjects: [],
          classesAssigned: teacher.classesAssigned || []
        },
        message: 'No subjects assigned yet. Please contact admin.'
      });
    }

    // Get classes assigned to teacher
    let assignedClasses = [];
    if (teacher.classesAssigned && teacher.classesAssigned.length > 0) {
      assignedClasses = teacher.classesAssigned;
    } else if (teacher.classAssigned) {
      assignedClasses = [teacher.classAssigned];
    }

    // Get subject details for assigned subjects
    const subjectDetails = await Subject.find({ 
      name: { $in: assignedSubjects },
      isActive: true 
    });

    // Format response with classes assigned to teacher
    const teacherSubjects = subjectDetails.map(subject => ({
      name: subject.name,
      category: subject.category,
      price: subject.price,
      classes: assignedClasses, // Use teacher's assigned classes
      subjectId: subject._id,
      image: getSubjectImage(subject.name),
      icon: getSubjectIcon(subject.name)
    }));

    res.status(200).json({
      success: true,
      subjects: teacherSubjects,
      teacher: {
        id: teacher._id,
        name: teacher.firstName + ' ' + teacher.lastName,
        subjects: teacher.subjects,
        classesAssigned: assignedClasses
      }
    });
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching subjects.',
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/teacher/profile/:teacherId - Get teacher profile
router.get('/profile/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const teacher = await Teacher.findById(teacherId).select('-password');
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.status(200).json({
      success: true,
      teacher: teacher
    });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Helper functions for subject images and icons
function getSubjectImage(subjectName) {
  const imageMap = {
    'Maths': '/assets/Maths.jpeg',
    'Physics': '/assets/Physics.jpeg',
    'Chemistry': '/assets/Chemistry.jpeg',
    'English': '/assets/English.jpeg',
    'Tamil': '/assets/Tamil.jpeg',
    'Science': '/assets/Science.jpeg',
    'Social': '/assets/Social.jpeg',
    'Zoology': '/assets/Zoology.jpeg',
    'Botany': '/assets/Botany.jpeg',
    'Geography': '/assets/Geography.jpeg',
    'History': '/assets/History.jpeg',
    'Economics': '/assets/Economics.jpeg',
    'Hindi': '/assets/Hindi.jpeg',
    'Computer Science': '/assets/ComputerScience.jpeg',
    'Accounts': '/assets/Accounts.jpeg'
  };
  return imageMap[subjectName] || '/assets/default.jpeg';
}

function getSubjectIcon(subjectName) {
  const iconMap = {
    'Maths': 'FaCalculator',
    'Computer Science': 'FaLaptopCode'
  };
  return iconMap[subjectName] || 'FaBook';
}




// ✅ Get teacher dashboard statistics
router.get('/dashboard/stats/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Get teacher details
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get students assigned to this teacher's classes
    const teacherClasses = teacher.classesAssigned || [teacher.classAssigned].filter(Boolean);
    const teacherSubjects = teacher.subjects || [];
    
    // Find students in teacher's classes
    const studentsInClasses = await Student.find({
      class: { $in: teacherClasses },
      approvalStatus: 'Approved'
    });

    const totalStudents = studentsInClasses.length;
    
    // Calculate assignments to review (mock - you can implement actual assignment model)
    const assignmentsToReview = Math.floor(totalStudents * 0.3); // Assuming 30% have pending assignments
    
    // Calculate student queries (mock - you can implement actual query model) 
    const pendingQueries = Math.floor(totalStudents * 0.15); // Assuming 15% have queries
    
    // Calculate upcoming classes (based on assigned classes and subjects)
    const upcomingClasses = teacherClasses.length * teacherSubjects.length; // Classes per day estimate
    
    // Calculate attendance rate
    const attendanceRate = Math.floor(85 + Math.random() * 10); // You can replace with actual attendance logic
    
    // Get recent activities for this teacher
    const recentActivities = [];
    
    // Add student-related activities
    const recentStudents = studentsInClasses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
      
    recentStudents.forEach((student, index) => {
      const timeAgo = getTimeAgo(student.createdAt);
      const randomActivity = [
        `New student ${student.firstName} ${student.lastName} joined your class`,
        `${student.firstName} ${student.lastName} submitted assignment`,
        `Attendance marked for ${student.firstName} ${student.lastName}`
      ][index % 3];
      
      recentActivities.push({
        id: `student_${student._id}`,
        activity: randomActivity,
        time: timeAgo,
        type: ['student', 'assignment', 'attendance'][index % 3]
      });
    });
    
    // Add class-related activities
    teacherClasses.forEach((className, index) => {
      if (index < 2) { // Limit to 2 class activities
        recentActivities.push({
          id: `class_${className}_${index}`,
          activity: `Class ${className} session completed for ${teacherSubjects[0] || 'subject'}`,
          time: `${index + 2} hours ago`,
          type: 'class'
        });
      }
    });

    // Generate performance metrics
    const performanceMetrics = {
      averageAssignmentScore: Math.floor(75 + Math.random() * 20), // 75-95%
      classParticipation: Math.floor(70 + Math.random() * 25), // 70-95%
      assignmentSubmissionRate: Math.floor(80 + Math.random() * 15) // 80-95%
    };

    // Sort activities by most recent
    recentActivities.sort((a, b) => {
      const timeA = a.time.includes('hour') ? parseInt(a.time) : 
                   a.time.includes('day') ? parseInt(a.time) * 24 : 0;
      const timeB = b.time.includes('hour') ? parseInt(b.time) : 
                   b.time.includes('day') ? parseInt(b.time) * 24 : 0;
      return timeA - timeB;
    });

    res.json({
      stats: {
        totalStudents,
        assignmentsToReview,
        pendingQueries,
        upcomingClasses,
        attendanceRate,
        activeClasses: teacherClasses.length,
        assignedSubjects: teacherSubjects.length
      },
      teacherInfo: {
        name: `${teacher.firstName} ${teacher.lastName}`,
        classes: teacherClasses,
        subjects: teacherSubjects
      },
      recentActivities: recentActivities.slice(0, 6),
      performanceMetrics,
      classDetails: teacherClasses.map(className => ({
        class: className,
        studentCount: studentsInClasses.filter(s => s.class === className).length,
        subjects: teacherSubjects
      }))
    });
    
  } catch (error) {
    console.error('Teacher dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch teacher dashboard statistics' });
  }
});

// Helper function (if not already exists)
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}




module.exports = router;
