const express = require('express');
const userController = require('../controllers/users');
const { addAgentsManually } = require('../services/freshInstallation');
const router = express.Router();

router.use(function (req, res, next) {
  next();
});

router.get('/profile', userController.getUserDetails);

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.get('/unread-chat-count', userController.getUnreadChatCount);

router.post('/save-profile', userController.saveProfileDetails);

module.exports = router;
