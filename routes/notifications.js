const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notifications');

router.use(function (req, res, next) {
  next();
});

// get notifications
router.get('/', notificationController.getNotifications);

router.post('/set-read-flag/:id', notificationController.setReadFlag);

router.delete('/:id', notificationController.deteleNotification);

module.exports = router;
