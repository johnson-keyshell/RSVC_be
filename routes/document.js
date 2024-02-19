const express = require('express');
const router = express.Router();
const chatDocumentController = require('../controllers/chatDocument');
const sailDocumentController = require('../controllers/sailDocument');

// Chat documents
router.get('/chat/get-details/:id', chatDocumentController.getDocumentDetails);

router.get('/chat/:chatid/:id', chatDocumentController.downloadChatDocument);

router.post('/chat/upload', chatDocumentController.uploadChatDocument);

router.delete('/chat/delete/:chatid/:id', chatDocumentController.deteleChatDocument);

// Sail documents
router.get('/sail/get-details/:id', sailDocumentController.getDocumentDetails);

router.get('/sail/get-list/:id', sailDocumentController.getList);

router.get('/sail/:id', sailDocumentController.downloadSailDocument);

router.post('/sail/approve/:id', sailDocumentController.approveSailDocument);

router.post('/sail/reject/:id', sailDocumentController.rejectSailDocument);

router.post('/sail/upload', sailDocumentController.uploadSailDocument);

router.delete('/sail/delete/:id', sailDocumentController.deteleSailDocument);

module.exports = router;
