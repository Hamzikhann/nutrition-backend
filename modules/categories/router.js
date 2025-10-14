const express = require("express");
const router = express.Router();

const categoriesController = require("./categories.controller");
const fileUpload = require("../../utils/fileUpload");

const { upload } = fileUpload("categories");

router.post("/list", categoriesController.list);

router.post("/updateCategory", categoriesController.update);

router.post("/deleteCategory", categoriesController.delete);

router.post("/update/subcategory", upload.single("image"), categoriesController.updateSubCategory);

router.post("/delete/subcategory", categoriesController.deleteSubCategory);

module.exports = router;
