const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Subject = require("../models/Subject");
const nodemailer = require("nodemailer");

// Utility: Create transporter once
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ Register Admin
router.post("/register", upload.single("logo"), async (req, res) => {
  const { instituteName, email, password } = req.body;
  const logoFile = req.file;

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      instituteName,
      email,
      password: hashedPassword,
      logo: logoFile ? logoFile.filename : null
    });

    await newAdmin.save();

    res.status(200).json({ message: "Admin registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login Admin
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error("Error in admin login:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get pending teachers
router.get("/teachers/pending", async (req, res) => {
  try {
    const unapproved = await Teacher.find({ isApproved: false });
    res.json(unapproved);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});

// ✅ Get teacher by ID
router.get("/teachers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: "Error fetching teacher" });
  }
});

// ✅ Approve or Reject Teacher + send approval email
router.put("/teachers/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const teacher = await Teacher.findByIdAndUpdate(
      id,
      { isApproved: status },
      { new: true }
    );

    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Send email if approved
    if (status === true) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: teacher.email,
        subject: "Approval as Teacher – Welcome Onboard!",
        text: `Dear ${teacher.salutation} ${teacher.firstName},

We are pleased to inform you that your application has been reviewed and approved. Welcome to our teaching team!

At this stage, your account has been activated and is now eligible for class and subject assignment by the admin.

Next Steps:
- Please wait while your teaching class and subjects are assigned.
- You will receive a separate confirmation email with the full details of your teaching responsibilities.

We are excited to have you onboard and look forward to your contributions in shaping young minds.

If you have any questions or require assistance, feel free to reach out to us at ${process.env.EMAIL_USER}.

Warm regards,  
Admin Team  
[Your Tuition Platform Name]`
      };

      await transporter.sendMail(mailOptions);
    }

    res.json({ message: `Teacher ${status ? "approved" : "rejected"}`, teacher });
  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ message: "Failed to update status or send email" });
  }
});

// ✅ Assign class + subjects to teacher & send assignment email
router.post("/teachers/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { classesAssigned, subjects } = req.body;

  console.log('Assignment Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Classes Assigned:', classesAssigned);
  console.log('Subjects:', subjects);

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Support both single and multiple classes
    if (Array.isArray(classesAssigned)) {
      teacher.classesAssigned = classesAssigned;
      teacher.classAssigned = classesAssigned[0]; // Set first class for backward compatibility
    } else {
      teacher.classAssigned = classesAssigned;
      teacher.classesAssigned = [classesAssigned];
    }
    teacher.subjects = subjects;
    
    console.log('Before saving teacher:', {
      classAssigned: teacher.classAssigned,
      classesAssigned: teacher.classesAssigned,
      subjects: teacher.subjects
    });
    
    await teacher.save();
    
    console.log('After saving teacher:', {
      classAssigned: teacher.classAssigned,
      classesAssigned: teacher.classesAssigned,
      subjects: teacher.subjects
    });
    
    const assignedClasses = Array.isArray(classesAssigned) ? classesAssigned : [classesAssigned];
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: teacher.email,
      subject: "Teaching Assignment Confirmation",
      text: `Dear ${teacher.salutation} ${teacher.firstName},

Congratulations!

We are pleased to inform you that your application has been approved. You have officially been onboarded as a teacher on our platform.

Please find your teaching assignment details below:

📚 Assigned Class${assignedClasses.length > 1 ? 'es' : ''}: ${assignedClasses.join(", ")}
📖 Assigned Subject${subjects.length > 1 ? 's' : ''}: ${subjects.join(", ")}

We believe your expertise in ${subjects.join(", ")} will greatly benefit the students, and we are excited to have you join our dedicated faculty team.

Next Steps:
- You may now log in to your dashboard to view class schedules.
- A coordinator will reach out to you shortly regarding onboarding instructions and resource materials.

If you have any questions, feel free to reach out to the admin team at ${process.env.EMAIL_USER}.

We look forward to a great academic journey together.

Warm regards,  
Admin Team  
[Your Tuition Platform Name]`
    };


    await transporter.sendMail(mailOptions);

    res.json({ message: "Assignment confirmed and email sent", teacher });
  } catch (error) {
    console.error("Assignment email error:", error);
    res.status(500).json({ message: "Failed to assign or send email" });
  }
});

// ✅ Update teacher assignment
router.post("/teachers/:id/update-assignment", async (req, res) => {
  const { id } = req.params;
  const { classesAssigned, subjects } = req.body;

  console.log('Update Assignment Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Classes Assigned:', classesAssigned);
  console.log('Subjects:', subjects);

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Support both single and multiple classes
    if (Array.isArray(classesAssigned)) {
      teacher.classesAssigned = classesAssigned;
      teacher.classAssigned = classesAssigned[0]; // Set first class for backward compatibility
    } else {
      teacher.classAssigned = classesAssigned;
      teacher.classesAssigned = [classesAssigned];
    }
    teacher.subjects = subjects;
    
    console.log('Before updating teacher:', {
      classAssigned: teacher.classAssigned,
      classesAssigned: teacher.classesAssigned,
      subjects: teacher.subjects
    });
    
    await teacher.save();
    
    console.log('After updating teacher:', {
      classAssigned: teacher.classAssigned,
      classesAssigned: teacher.classesAssigned,
      subjects: teacher.subjects
    });

    const assignedClasses = Array.isArray(classesAssigned) ? classesAssigned : [classesAssigned];

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: teacher.email,
      subject: "Teaching Assignment Updated",
      text: `Dear ${teacher.salutation} ${teacher.firstName},

Your teaching assignment has been updated with the following details:

📚 Updated Assigned Class${assignedClasses.length > 1 ? 'es' : ''}: ${assignedClasses.join(", ")}
📖 Updated Assigned Subject${subjects.length > 1 ? 's' : ''}: ${subjects.join(", ")}

If you have any questions regarding this change, please reach out to the admin team at ${process.env.EMAIL_USER}.

Best regards,  
Admin Team  
[Your Tuition Platform Name]`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Assignment updated and email sent", teacher });
  } catch (error) {
    console.error("Assignment update error:", error);
    res.status(500).json({ message: "Failed to update assignment or send email" });
  }
});

// Get approved and assigned teachers
router.get('/teachers/approved', async (req, res) => {
  try {
    const approved = await Teacher.find({
      isApproved: true,
      classAssigned: { $exists: true, $ne: null },
      subjects: { $exists: true, $not: { $size: 0 } }
    });

    res.json(approved);
  } catch (err) {
    console.error("Error fetching approved teachers:", err);
    res.status(500).json({ message: "Failed to fetch approved teachers" });
  }
});

// Get available classes from student registrations
router.get('/available-classes', async (req, res) => {
  try {
    const classes = await Student.distinct('class', { approvalStatus: 'Approved' });
    res.json(classes.sort((a, b) => parseInt(a) - parseInt(b)));
  } catch (error) {
    console.error("Error fetching available classes:", error);
    res.status(500).json({ message: "Failed to fetch available classes" });
  }
});

// Get all teachers with pagination and search
router.get('/teachers', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, category } = req.query;
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by approval status
    if (status && status !== 'All') {
      if (status === 'pending') {
        query.isApproved = false;
      } else if (status === 'approved') {
        query.isApproved = true;
        query.classAssigned = { $exists: false };
      } else if (status === 'assigned') {
        query.isApproved = true;
        query.classAssigned = { $exists: true, $ne: null };
      } else if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'rejected') {
        query.isApproved = false;
        query.isRejected = true; // Assuming you want to add this field
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const teachers = await Teacher.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-password'); // Exclude password field

    const total = await Teacher.countDocuments(query);

    res.json({
      teachers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalTeachers: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      stats: {
        total: await Teacher.countDocuments(),
        pending: await Teacher.countDocuments({ isApproved: false }),
        approved: await Teacher.countDocuments({ isApproved: true, classAssigned: { $exists: false } }),
        assigned: await Teacher.countDocuments({ 
          isApproved: true, 
          classAssigned: { $exists: true, $ne: null } 
        }),
        active: await Teacher.countDocuments({ isActive: true }),
        inactive: await Teacher.countDocuments({ isActive: false })
      }
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});

// Create new teacher
router.post('/teachers', async (req, res) => {
  try {
    const {
      salutation,
      firstName,
      lastName,
      email,
      mobile,
      timezone,
      password,
      preferredSubjects,
      experience,
      qualification,
      notes
    } = req.body;

    // Check if email already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
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
      experience,
      qualification,
      notes,
      isActive: true,
      isApproved: false // Admin can approve later
    });

    await newTeacher.save();

    res.status(201).json({ 
      message: 'Teacher created successfully',
      teacher: { ...newTeacher.toObject(), password: undefined }
    });
  } catch (error) {
    console.error("Error creating teacher:", error);
    res.status(500).json({ message: "Failed to create teacher" });
  }
});

// Update teacher information
router.put('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update if it's empty
    if (updateData.password === '') {
      delete updateData.password;
    } else if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Handle preferredSubjects as array
    if (updateData.preferredSubjects) {
      if (Array.isArray(updateData.preferredSubjects)) {
        updateData.preferredSubjects = updateData.preferredSubjects;
      } else if (typeof updateData.preferredSubjects === 'string') {
        updateData.preferredSubjects = updateData.preferredSubjects.split(',').map(s => s.trim()).filter(s => s);
      }
    }

    const teacher = await Teacher.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ message: "Teacher updated successfully", teacher });
  } catch (error) {
    console.error("Error updating teacher:", error);
    res.status(500).json({ message: "Failed to update teacher" });
  }
});

// Delete teacher
router.delete('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const teacher = await Teacher.findByIdAndDelete(id);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    res.status(500).json({ message: "Failed to delete teacher" });
  }
});

// Toggle teacher active status
router.patch('/teachers/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const teacher = await Teacher.findById(id);
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    teacher.isActive = !teacher.isActive;
    await teacher.save();

    res.json({ 
      message: `Teacher ${teacher.isActive ? 'activated' : 'deactivated'} successfully`,
      teacher: { ...teacher.toObject(), password: undefined }
    });
  } catch (error) {
    console.error("Error toggling teacher status:", error);
    res.status(500).json({ message: "Failed to update teacher status" });
  }
});

// ✅ Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get students stats
    const totalStudents = await Student.countDocuments();
    const pendingStudents = await Student.countDocuments({ approvalStatus: 'Pending' });
    const approvedStudents = await Student.countDocuments({ approvalStatus: 'Approved' });
    const paidStudents = await Student.countDocuments({ paymentStatus: 'Paid' });
    
    // Get teachers stats
    const totalTeachers = await Teacher.countDocuments();
    const pendingTeachers = await Teacher.countDocuments({ isApproved: false });
    const approvedTeachers = await Teacher.countDocuments({ isApproved: true });
    const assignedTeachers = await Teacher.countDocuments({ 
      isApproved: true, 
      classAssigned: { $exists: true, $ne: null } 
    });
    
    // Calculate monthly revenue (students with paid status)
    const monthlyRevenue = paidStudents * 2500; // Assuming ₹2500 per student
    
    // Calculate pending payments
    const pendingPayments = totalStudents - paidStudents;
    
    // Get recent activities (last 10 registrations/approvals)
    const recentStudents = await Student.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName createdAt approvalStatus');
      
    const recentTeachers = await Teacher.find({ isApproved: true })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('firstName lastName subjects createdAt');
    
    // Generate activities array
    const recentActivities = [];
    
    // Add student activities
    recentStudents.forEach((student, index) => {
      const timeAgo = getTimeAgo(student.createdAt);
      recentActivities.push({
        id: `student_${student._id}`,
        activity: `New student registered - ${student.firstName} ${student.lastName}`,
        time: timeAgo,
        type: 'student'
      });
    });
    
    // Add teacher activities
    recentTeachers.forEach((teacher, index) => {
      const timeAgo = getTimeAgo(teacher.createdAt);
      const subjects = teacher.subjects && teacher.subjects.length > 0 
        ? teacher.subjects.join(', ') 
        : 'subjects';
      recentActivities.push({
        id: `teacher_${teacher._id}`,
        activity: `Teacher ${teacher.firstName} ${teacher.lastName} approved for ${subjects}`,
        time: timeAgo,
        type: 'teacher'
      });
    });
    
    // Sort activities by most recent
    recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Generate system alerts based on real data
    const systemAlerts = [];
    
    if (pendingStudents > 0) {
      systemAlerts.push({
        id: 'pending_students',
        message: `${pendingStudents} student${pendingStudents > 1 ? 's' : ''} waiting for approval`,
        type: 'warning',
        time: '1 hour ago'
      });
    }
    
    if (pendingTeachers > 0) {
      systemAlerts.push({
        id: 'pending_teachers',
        message: `${pendingTeachers} teacher${pendingTeachers > 1 ? 's' : ''} waiting for approval`,
        type: 'warning',
        time: '2 hours ago'
      });
    }
    
    if (pendingPayments > 0) {
      systemAlerts.push({
        id: 'pending_payments',
        message: `${pendingPayments} student${pendingPayments > 1 ? 's have' : ' has'} pending payments`,
        type: 'danger',
        time: '3 hours ago'
      });
    }
    
    // Calculate attendance rate (mock calculation based on active students)
    const attendanceRate = Math.round((approvedStudents / totalStudents) * 100) || 0;
    
    // Calculate active classes (estimated based on assigned teachers and subjects)
    const activeClasses = assignedTeachers * 2; // Assuming each teacher handles 2 classes on average
    
    res.json({
      stats: {
        totalStudents,
        totalTeachers,
        monthlyRevenue,
        pendingPayments,
        activeClasses,
        attendanceRate,
        systemAlerts: systemAlerts.length,
        pendingStudents,
        pendingTeachers,
        approvedStudents,
        approvedTeachers,
        assignedTeachers,
        paidStudents
      },
      recentActivities: recentActivities.slice(0, 8), // Limit to 8 activities
      systemAlerts
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// Helper function to calculate time ago
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


