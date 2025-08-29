const express = require("express");
const router = express.Router();

const categoriesController = require("./categories.controller");

router.post("/list", categoriesController.list);

module.exports = router;
