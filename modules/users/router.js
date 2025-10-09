"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("users");
const usersController = require("./user.controller");

router.post("/list", (req, res) => {
	if (req.role == "Administrator" || req.role === "Subadmin") {
		usersController.listUsers(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/list/employees", (req, res) => {
	if (req.role == "Administrator" || req.role === "Subadmin") {
		usersController.listEmployees(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/create", upload.single("image"), (req, res) => {
	if (req.role == "Administrator" || req.role === "Subadmin") {
		usersController.create(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

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

router.post("/delete", (req, res) => {
	if (req.role == "Administrator" || req.role == "Subadmin") {
		usersController.delete(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

// router.post("/reset/credentials", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.reset(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

router.post("/update/status", (req, res) => {
	if (req.role == "Administrator" || req.role === "Subadmin") {
		usersController.updateStatus(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/create/employee", (req, res) => {
	if (req.role == "Administrator" || req.role === "Subadmin") {
		usersController.createEmployee(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/update/employee", (req, res) => {
	if (req.role == "Administrator" || req.role === "Subadmin") {
		usersController.updateEmployee(req, res);
	} else {
		res.status(403).send({ message: "Forbidden Access" });
	}
});

router.post("/progress", (req, res) => {
	usersController.getUserProgress(req, res);
});

router.post("/habit/progress", (req, res) => {
	usersController.getHabitProgress(req, res);
});

module.exports = router;
