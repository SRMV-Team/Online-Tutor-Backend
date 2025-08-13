const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin'); // Add this only if needed

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  let UserModel;
  if (role === 'student') UserModel = Student;
  else if (role === 'teacher') UserModel = Teacher;
  else if (role === 'admin') UserModel = Admin;
  else return res.status(400).json({ message: 'Invalid role' });

  try {
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid password' });

    res.status(200).json({
      message: 'Login successful',
      user: { email: user.email, name: user.name, role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
