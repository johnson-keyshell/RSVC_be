const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent');
const propertyController = require('../controllers/property');
const contractController = require('../controllers/contract');

router.use(function (req, res, next) {
  next();
});

router.get('/sail-record/:id', contractController.getSailRecord);

router.get('/chat/buyer-list', agentController.getBuyerChatList);

router.get('/chat/seller-list', agentController.getSellerChatList);

router.post('/chat/initiate-chat', agentController.initiateChat);

router.get('/chat/messages/:id', agentController.getChatMessages);

router.post('/chat/set-read-flag/:id', agentController.setReadFlagForChatID);

router.post('/chat/send-message', agentController.sendMessage);

router.post('/contract/generate/:id', contractController.generateContract);

router.get('/contract/signing-url/:id', contractController.getSigningUrl);

router.get('/contract/signing-status/:id', contractController.getSigningStatus);

router.delete('/contract/delete/:id', contractController.deleteContract);

module.exports = router;
