const express = require("express");
const router = express.Router();

const postController = require("../controllers/posts.controller");

router.get('/:usuario_id', postController.getPostsByUser)
//router.delete('/:id', postController.deletepost)
router.post('/tweet',postController.crearTweet)
router.post('/tweet/link',postController.crearAuthLink)
router.post('/tweet/token',postController.crearAuthToken)
router.post('/reddit/token',postController.crearRedditAuthToken)
router.post('/reddit/link',postController.crearRedditAuthLink)
router.post('/reddit/post',postController.crearRedditPost)
router.post('/linkedin/token',postController.crearLinkedAuthToken)
router.post('/linkedin/link',postController.crearLinkedAuthLink)


module.exports = router;