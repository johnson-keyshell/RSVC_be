const express = require('express');
const router = express.Router();
const agentAgreementController = require('../controllers/agentAgreement');
const propertyController = require('../controllers/property');

router.use(function (req, res, next) {
  next();
});

router.get('/get-details/:id', agentAgreementController.getDetails);

router.get('/get-agreement/:sailId', agentAgreementController.checkIfAgreementExits);

router.post('/generate', agentAgreementController.generateAgreement);

router.post('/accept-agreement', agentAgreementController.acceptAgreement);

router.post('/reject-agreement', agentAgreementController.rejectAgreement);

module.exports = router;
