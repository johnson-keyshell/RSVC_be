const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/owner');
const contractController = require('../controllers/contract');

router.use(function (req, res, next) {
  next();
});

router.get('/sail-record/:id', contractController.getSailRecord);

router.post('/set-sail-status', ownerController.setSailStatus);

router.post('/approve-contract/:id', contractController.ownerApproveContract);

router.post('/reject-contract', contractController.ownerRejectContract);

router.post('/contract/generate/:id', contractController.generateContract, contractController.ownerApproveContract);

router.get('/contract/signing-url/:id', contractController.getSigningUrl);

router.get('/contract/signing-status/:id', contractController.getSigningStatus);

router.delete('/contract/delete/:id', contractController.deleteContract);

// get property details
router.get('/landing-page', ownerController.getLandingPageInfo);

router.get('/user-list', ownerController.getUserList);

router.get('/agent-list', ownerController.getAgentList);

router.post('/add-agents', ownerController.addAgent);

router.get('/listing-info/:id', ownerController.getEditListingInfo);

router.get('/general-details/:id', ownerController.getGeneralDetailsInfo);

router.get('/additional-details/:id', ownerController.getPropertyAdditionalDetails);

router.get('/chat/chat-list', ownerController.getChatList);

router.get('/chat/messages/:id', ownerController.getChatMessages);

router.post('/chat/set-read-flag/:id', ownerController.setReadFlagForChatID);

router.post('/chat/send-message', ownerController.sendMessage);

router.post('/chat/initiate-chat', ownerController.initiateChat);

module.exports = router;
