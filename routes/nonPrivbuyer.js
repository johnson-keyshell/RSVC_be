const express = require("express");
const router = express.Router();
const buyerController = require("../controllers/buyer");
const propertyController = require("../controllers/property");

router.use(function (req, res, next) {
  next();
});

// get property details
router.get("/landing-page", buyerController.getLandingPageInfo);

router.get("/property/:id", propertyController.getPropertyDetails);

module.exports = router;
