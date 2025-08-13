// routes/studentRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const Student = require("../models/Student");
const upload = require("../middleware/upload");
const transporter = require('../config/email'); // Nodemailer config

// @route   POST /api/student/register
// @desc    Register a new student with proof upload
// @access  Public
router.post("/register", upload.single("proof"), async (req, res) => {
  const {
    salutation,
    firstName,
    lastName,
    mobile,
    timezone,
    email,
    password,
    class: studentClass,
    group,
    syllabus,
    emisNumber
  } = req.body;

  const proof = req.file?.filename;

  try {
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      salutation,
      firstName,
      lastName,
      mobile,
      timezone,
      email,
      password: hashedPassword,
      class: studentClass,
      group,
      syllabus,
      emisNumber,
      proof,
    });

    await newStudent.save();

    res.status(201).json({ message: "✅ Student registered successfully" });
  } catch (err) {
    console.error("Student Registration Error:", err);
    res.status(500).json({ message: "❌ Server error" });
  }
});

// @route   POST /api/student/login
// @desc    Authenticate student and return user data
// @access  Public
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Find student by email
//     const student = await Student.findOne({ email });
//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, student.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // Return success response with student data (excluding password)
//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       student: {
//         id: student._id,
//         email: student.email,
//         firstName: student.firstName,
//         lastName: student.lastName,
//         mobile: student.mobile,
//         class: student.class,
//         group: student.group,
//         syllabus: student.syllabus,
//         salutation: student.salutation,
//         timezone: student.timezone,
//         isApproved: student.isApproved || true
//       }
//     });
//   } catch (err) {
//     console.error("Student Login Error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// @route   POST /api/student/login
// @desc    Authenticate student and return user data
// @access  Public
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find student by email
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Return success response with student data (excluding password)
    res.status(200).json({
      success: true,
      message: "Login successful",
      student: {
        id: student._id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        mobile: student.mobile,
        class: student.class,
        group: student.group,
        syllabus: student.syllabus,
        salutation: student.salutation,
        timezone: student.timezone,
        approvalStatus: student.approvalStatus,  // ✅ Add this
        status: student.status,                  // ✅ Add this
        isActive: student.isActive
      }
    });
  } catch (err) {
    console.error("Student Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// @route   GET /api/student/
// @desc    Get all students (admin)
// @access  Public (until auth is added)
router.get("/", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    console.error("Fetch Students Error:", err);
    res.status(500).json({ message: "❌ Failed to fetch students" });
  }
});






// Add these new routes to your existing studentRoutes.js

// @route   GET /api/student/:id/dashboard
// @desc    Get student dashboard data
// @access  Public (until auth is added)
router.get("/:id/dashboard", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get enrolled subjects (from assigned teachers)
    const Teacher = require("../models/Teacher");
    const assignedTeachers = await Teacher.find({
      classesAssigned: student.class,
      isApproved: true
    });
    
    const enrolledSubjects = assignedTeachers.reduce((subjects, teacher) => {
      if (teacher.subjects) {
        teacher.subjects.forEach(subject => {
          if (!subjects.includes(subject)) {
            subjects.push(subject);
          }
        });
      }
      return subjects;
    }, []);

    // Mock assignments data (you can replace with actual Assignment model later)
    const pendingAssignments = Math.floor(Math.random() * 5) + 1;
    const completedAssignments = Math.floor(Math.random() * 15) + 5;
    
    // Mock attendance (you can replace with actual attendance tracking)
    const attendance = Math.floor(Math.random() * 20) + 75;
    
    // Upcoming classes based on assigned teachers
    const upcomingClasses = assignedTeachers.length;
    
    // Payment status
    const lastPayment = student.status === 'Paid' ? 'Jan 2025' : 'Pending';
    
    const stats = {
      enrolledSubjects: enrolledSubjects.length,
      pendingAssignments,
      completedAssignments,
      upcomingClasses,
      lastPayment,
      attendance
    };

    res.json({
      success: true,
      stats,
      enrolledSubjectsList: enrolledSubjects,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        class: student.class,
        status: student.status,
        approvalStatus: student.approvalStatus
      }
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

// @route   GET /api/student/:id/activities
// @desc    Get student recent activities
// @access  Public (until auth is added)
router.get("/:id/activities", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Generate realistic activities based on student data
    const activities = [];
    
    // Registration activity
    const registrationTime = getTimeAgo(student.createdAt);
    activities.push({
      id: 1,
      activity: `Account registered successfully`,
      time: registrationTime,
      type: 'registration'
    });

    // Approval activity
    if (student.approvalStatus === 'Approved') {
      activities.push({
        id: 2,
        activity: `Registration approved by admin`,
        time: getTimeAgo(student.updatedAt),
        type: 'approval'
      });
    }

    // Payment activity
    if (student.status === 'Paid') {
      activities.push({
        id: 3,
        activity: `Fee payment completed`,
        time: '2 days ago',
        type: 'payment'
      });
    }

    // Get assigned subjects for class activities
    const Teacher = require("../models/Teacher");
    const assignedTeachers = await Teacher.find({
      classesAssigned: student.class,
      isApproved: true
    });

    // Add subject-based activities
    assignedTeachers.forEach((teacher, index) => {
      if (teacher.subjects && teacher.subjects.length > 0) {
        teacher.subjects.forEach((subject, subIndex) => {
          activities.push({
            id: activities.length + 1,
            activity: `${subject} class scheduled with ${teacher.firstName} ${teacher.lastName}`,
            time: `${index + 1} day${index > 0 ? 's' : ''} ago`,
            type: 'class'
          });
        });
      }
    });

    // Sort by most recent and limit to 6 activities
    const recentActivities = activities.slice(0, 6);

    res.json({
      success: true,
      recentActivities
    });

  } catch (err) {
    console.error("Activities Error:", err);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

// @route   PUT /api/student/:id/approve
// @desc    Approve or reject student registration
// @access  Public (until auth is added)
router.put("/:id/approve", async (req, res) => {
  const { status } = req.body;
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: status },
      { new: true }
    );

    if (!student) return res.status(404).json({ message: "Student not found" });

    const subject = status === "Approved" ? "Approval as Student" : "Rejection of Registration";
    const text = `
Hi ${student.firstName || student.name},

We hope this message finds you well.

We wanted to inform you that your registration request to our tuition platform has been **${status.toLowerCase()}**.

${
  status === "Approved"
    ? `🎉 Congratulations!

Your account has been successfully approved by the admin. You can now proceed with the next steps to access our platform:

✅ Please complete the payment process using your dashboard.  
✅ Once payment is verified, you will gain full access to your classes, assignments, and schedule.

We're excited to have you on board and look forward to supporting your learning journey.

If you need assistance or have any questions, feel free to reply to this email or reach out via our support team.`
    : `Unfortunately, your registration has been rejected at this time.

This could be due to missing or invalid information submitted during the registration process. If you believe this is an error or would like clarification, please don't hesitate to contact our support team. We’re here to help!`
}

Best regards,  
Admin Team  
[Your Tuition Platform Name]
`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: student.email,
      subject,
      text
    });

    res.json(student);
  } catch (err) {
    console.error("Approval Error:", err);
    res.status(500).json({ message: "❌ Failed to update approval status" });
  }
});


router.put("/:id/payment", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    
    // Toggle payment status
    const newStatus = student.status === "Paid" ? "Unpaid" : "Paid";
    
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { status: newStatus },
      { new: true }
    );
    
    res.json(updatedStudent);
  } catch (err) {
    console.error("Payment Update Error:", err);
    res.status(500).json({ message: "❌ Failed to update payment status" });
  }
});

// @route   PUT /api/student/:id
// @desc    Update student details
// @access  Public (until auth is added)
router.put("/:id", async (req, res) => {
  const {
    salutation,
    firstName,
    lastName,
    email,
    mobile,
    class: studentClass,
    group,
    emisNumber,
    approvalStatus,
    status
  } = req.body;

  try {
    // Check if email is being changed and if it already exists
    if (email) {
      const existingStudent = await Student.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingStudent) {
        return res.status(409).json({ message: "Email already registered by another student" });
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        salutation,
        firstName,
        lastName,
        email,
        mobile,
        class: studentClass,
        group,
        emisNumber,
        approvalStatus,
        status
      },
      { new: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(updatedStudent);
  } catch (err) {
    console.error("Student Update Error:", err);
    res.status(500).json({ message: "❌ Failed to update student" });
  }
});

// @route   DELETE /api/student/:id
// @desc    Delete a student
// @access  Public (until auth is added)
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Student Delete Error:", err);
    res.status(500).json({ message: "❌ Failed to delete student" });
  }
});

// @route   GET /api/student/:id
// @desc    Get a single student by ID
// @access  Public (until auth is added)
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    console.error("Fetch Student Error:", err);
    res.status(500).json({ message: "❌ Failed to fetch student" });
  }
});


// Helper function for time calculation
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






