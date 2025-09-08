const express = require("express");
const router = express.Router();
const commentsController = require("./communityComments.controller");

// Add a comment
router.post("/create", commentsController.addComment);

// Get comments of a post
router.post("/list", commentsController.getComments);

// Delete a comment
router.post("/delete", commentsController.deleteComment);

module.exports = router;
