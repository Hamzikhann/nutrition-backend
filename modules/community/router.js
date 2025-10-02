"use strict";

const express = require("express");
const router = express.Router();
const fileUplod = require("../../utils/fileUpload");
const { upload } = fileUplod("communityPosts");
const communityController = require("./community.controller");

router.post("/create/category", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		communityController.createCategory(req, res);
	} else {
		res.status(403).json({
			message: "You are not authorized to create a category"
		});
	}
});

router.post("/create/post", upload.single("image"), (req, res) => {
	communityController.createPost(req, res);
});

router.post("/list/categories", (req, res) => {
	communityController.listCategories(req, res);
});

router.post("/list/posts", (req, res) => {
	communityController.listPosts(req, res);
});

router.post("/detail", (req, res) => {
	communityController.detail(req, res);
});

router.post("/delete/post", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		communityController.deletePost(req, res);
	} else {
		return res.status(403).json({
			message: "You are not authorized to delete a post"
		});
	}
});

module.exports = router;
