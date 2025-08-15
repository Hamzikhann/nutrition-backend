// In your Express route
"use strict";

const express = require("express");
const router = express.Router();
const sendPushNotification = require("./notifications.sontroller");

router.post("/list", sendPushNotification.list);
router.post("/update", (req, res) => sendPushNotification.updateIsRead(req, res));
router.post("/delete", (req, res) => sendPushNotification.delete(req, res));

module.exports = router;
