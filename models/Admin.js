const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  instituteName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  logo: { type: String }  // Stores image filename
});

module.exports = mongoose.model("Admin", adminSchema);
