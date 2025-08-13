const express = require("express");
const router = express.Router();
const { registerStudent } = require("../controllers/authController");

router.post("/register/student", registerStudent);
// Add admin and teacher routes similarly

module.exports = router;
