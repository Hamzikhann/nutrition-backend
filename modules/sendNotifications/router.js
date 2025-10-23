// In your Express route
"use strict";

const express = require("express");
const router = express.Router();
const sendPushNotification = require("./notifications.sontroller");

router.post("/list", sendPushNotification.getUserNotifications);
router.post("/update", (req, res) => sendPushNotification.markAsRead(req, res));
router.post("/update/all", (req, res) => sendPushNotification.markAllAsRead(req, res));
router.post("/delete", (req, res) => sendPushNotification.deleteNotification(req, res));

module.exports = router;
