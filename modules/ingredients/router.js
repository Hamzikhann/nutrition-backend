"use strict";

const express = require("express");

const router = express.Router();
const ingredientsController = require("./ingredients.controller");

router.post("/list", ingredientsController.list);
router.post("/create", ingredientsController.create);
router.post("/update", ingredientsController.update);

module.exports = router;
