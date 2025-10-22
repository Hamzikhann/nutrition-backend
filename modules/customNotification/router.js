const express = require("express");
const router = express.Router();
const controller = require("./customNotification.controller");

router.post("/create", controller.createNotification);
router.post("/list", controller.getNotifications);
router.post("/update/:id", controller.updateNotification);
router.post("/delete/:id", controller.deleteNotification);
router.post("/send/:id", controller.sendNotification);

module.exports = router;
