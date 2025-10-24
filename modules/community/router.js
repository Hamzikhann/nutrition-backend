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

router.post("/create/post", upload.array("images", 10), (req, res) => {
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

router.post("/detail/post", (req, res) => {
	communityController.getPostDetails(req, res);
});

router.post("/delete/post", (req, res) => {
	communityController.deletePost(req, res);
});
router.post("/update/post", upload.array("images"), (req, res) => {
	communityController.updatePost(req, res);
});

router.post("/update/category", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		communityController.updateCategory(req, res);
	} else {
		return res.status(403).json({
			message: "You are not authorized to update a category"
		});
	}
});

router.post("/delete/category", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		communityController.deleteCategory(req, res);
	} else {
		return res.status(403).json({
			message: "You are not authorized to delete a category"
		});
	}
});

module.exports = router;
