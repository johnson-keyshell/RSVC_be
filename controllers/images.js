const { Op } = require("sequelize");
const fs = require("fs");
const propertyService = require("../services/properties");
const floorService = require("../services/floors");
const apartmentService = require("../services/apartments");
const amenityService = require("../services/amenities");
const imagesService = require("../services/images");
const structuralDetailsService = require("../services/structuralDetails");

/**
 * Function to upload a image
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadedFile = req.files.image;
    const fileName = uploadedFile.name;
    const uploadPath = `${__dirname}/../public/images/uploads/${fileName}`;
    fs.mkdirSync(`${__dirname}/../public/images/uploads`, { recursive: true }); // Create the directory if it doesn't exist
    uploadedFile.mv(uploadPath, async (err) => {
      if (err) {
        console.error("File upload error:", err);
        return res.status(500).json({ message: "File upload failed" });
      }

      let image = await imagesService.create({
        ImageName: fileName,
      });
      res.status(201).send(image?.ImageID);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to delete a image
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.deteleImage = async (req, res, next) => {
  try {
    res.send(`${await imagesService.deleteRow({ where: { ImageID: req.params.id } })} image deleted`);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
