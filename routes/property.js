const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property');

router.use(function (req, res, next) {
  next();
});

router.get('/excel-template', propertyController.downloadExcelTemplate);

// get property details
router.get('/:id', propertyController.getPropertyDetails);

router.post('/add-edit-listing', propertyController.addNewProperty);

router.post('/edit-general-details', propertyController.addPropertyGeneralDetails);

router.post('/edit-additional-details', propertyController.addPropertyAdditionalDetails);

router.post('/convert-excel', propertyController.convertExcel);

module.exports = router;
