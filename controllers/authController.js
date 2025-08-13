// const Student = require("../models/Student");

// const registerStudent = async (req, res) => {
//   try {
//     const student = new Student(req.body);
//     await student.save();
//     res.status(201).json({ message: "Student registered successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// module.exports = { registerStudent };






const Student = require("../models/Student");

const registerStudent = async (req, res) => {
  try {
    const { name, email, password, classLevel } = req.body;

    // Basic validation
    if (!name || !email || !password || !classLevel) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Check if student with same email exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({ error: "Student already registered with this email." });
    }

    const student = new Student({ name, email, password, classLevel });
    await student.save();

    res.status(201).json({ message: "Student registered successfully" });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registerStudent };

