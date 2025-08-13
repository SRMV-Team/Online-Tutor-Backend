const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject");

// Get all subjects
router.get("/", async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    let query = {};

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Search functionality
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const subjects = await Subject.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Subject.countDocuments(query);

    res.json({
      subjects,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalSubjects: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

// Get subject by ID
router.get("/:id", async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json(subject);
  } catch (error) {
    console.error("Error fetching subject:", error);
    res.status(500).json({ message: "Failed to fetch subject" });
  }
});

// Create new subject
router.post("/", async (req, res) => {
  try {
    const { 
      name, 
      category, 
      price, 
      classes
    } = req.body;

    // Check if subject already exists
    const existingSubject = await Subject.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingSubject) {
      return res.status(400).json({ message: "Subject with this name already exists" });
    }

    const subjectData = {
      name: name.trim(),
      category: category || 'Regular',
      price: price || 'Free',
      classes: classes ? (Array.isArray(classes) ? classes : [classes]) : []
    };

    const newSubject = new Subject(subjectData);
    await newSubject.save();

    res.status(201).json({
      message: "Subject created successfully",
      subject: newSubject
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ message: "Failed to create subject" });
  }
});

// Update subject
router.put("/:id", async (req, res) => {
  try {
    const { 
      name, 
      category, 
      price, 
      classes,
      isActive 
    } = req.body;

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Check if name is being changed and if it conflicts with existing subject
    if (name && name.trim() !== subject.name) {
      const existingSubject = await Subject.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingSubject) {
        return res.status(400).json({ message: "Subject with this name already exists" });
      }
    }

    const updateData = {
      ...(name && { name: name.trim() }),
      ...(category && { category }),
      ...(price !== undefined && { price }),
      ...(classes && { classes: Array.isArray(classes) ? classes : [classes] }),
      ...(isActive !== undefined && { isActive })
    };

    const updatedSubject = await Subject.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: "Subject updated successfully",
      subject: updatedSubject
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({ message: "Failed to update subject" });
  }
});

// Delete subject
router.delete("/:id", async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await Subject.findByIdAndDelete(req.params.id);

    res.json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ message: "Failed to delete subject" });
  }
});

// Toggle subject status (active/inactive)
router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    subject.isActive = !subject.isActive;
    await subject.save();

    const updatedSubject = await Subject.findById(req.params.id);

    res.json({
      message: `Subject ${subject.isActive ? 'activated' : 'deactivated'} successfully`,
      subject: updatedSubject
    });
  } catch (error) {
    console.error("Error toggling subject status:", error);
    res.status(500).json({ message: "Failed to toggle subject status" });
  }
});

module.exports = router;
