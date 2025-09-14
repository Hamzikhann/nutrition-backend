const router = require("express").Router();
const communityLikesController = require("./communityLikes.controller");
// const communityLikesController = require("./communityLikes.v2.controller");

router.post("/react", communityLikesController.addOrUpdateReaction);
router.post("/unreact", communityLikesController.removeReaction);
router.post("/counts", communityLikesController.list);

module.exports = router;
