const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyer');
const propertyController = require('../controllers/property');
const contractController = require('../controllers/contract');

router.use(function (req, res, next) {
  next();
});

// get property details
router.get('/sail-selections/:id', buyerController.getSailSelectionForProperty);

router.get('/sail-record/:id', contractController.getSailRecord);

router.get('/property/:id', propertyController.getFullPropertyDetails);

router.post('/notify-selection/:id', buyerController.initiateSailNotification);

router.get('/chat/list', buyerController.getChatList);

router.get('/chat/messages/:id', buyerController.getChatMessages);

router.post('/chat/set-read-flag/:id', buyerController.setReadFlagForChatID);

router.post('/chat/send-message', buyerController.sendMessage);

router.post('/contract/set-type', contractController.selectContractType);

router.get('/contract/signing-url/:id', contractController.getSigningUrl);

router.get('/contract/signing-status/:id', contractController.getSigningStatus);

module.exports = router;
