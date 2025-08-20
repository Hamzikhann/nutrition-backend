"use strict";

const express = require("express");
const router = express.Router();
const plansControler = require("./plans.controller");

router.post("/list", plansControler.list);

module.exports = router;
