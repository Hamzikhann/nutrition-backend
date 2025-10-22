const express = require("express");
const router = express.Router();
const controller = require("./notificationCategoriesFolder.controller");

router.post("/create", controller.createFolder);
router.post("/list", controller.getFolders);
router.post("/update/:id", controller.updateFolder);
router.post("/delete/:id", controller.deleteFolder);
router.post("/users", controller.getUsersByCategories);

module.exports = router;
