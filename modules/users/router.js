"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("users");
const usersController = require("./user.controller");

router.post("/list", (req, res) => {
	if (req.role == "Administrator") {
		usersController.listUsers(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

// router.post("/list/employees", (req, res) => {
// 	if (req.role == "Administrator") {
// 		usersController.listEmployees(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/create", (req, res) => {
// 	if (req.role == "Administrator") {
// 		usersController.create(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/update", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "User" || req.role == "Employee") {
// 		usersController.update(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/update/profile", usersController.updateProfile);
// router.post("/update/profile/image", upload.single("image"), usersController.updateProfileImage);
// router.post("/update/password", usersController.changePassword);
// router.post("/detail", usersController.detail);

// router.post("/delete", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.delete(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/reset/credentials", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.reset(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

router.post("/update/status", (req, res) => {
	if (req.role == "Administrator") {
		usersController.updateStatus(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

module.exports = router;
