const { Op } = require('sequelize');
const fs = require('fs');
const chatService = require('../services/chat');
const imageService = require('../services/images');

/**
 * Function to upload a private images
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */

exports.uploadImage = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access. User not logged in.');
      return;
    }
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let chatId = req.body.chatId;
    let chat = await chatService.findOne(() => [
      {
        where: {
          ChatID: chatId,
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    if (!chat) {
      res.status(403).send('Unauthorised access to chat');
      return;
    }

    const uploadedFile = req.files.image;
    const fileName = uploadedFile.name;
    fs.mkdirSync(`${__dirname}/../uploads/images`, { recursive: true }); // Create the directory if it doesn't exist
    let image = await imageService.create({
      ImageName: fileName,
    });
    const uploadPath = `${__dirname}/../uploads/images/${image.ImageID}`;

    uploadedFile.mv(uploadPath, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        await imageService.deleteRow({ where: { ImageID: image.ImageID } });
        return res.status(500).json({ message: 'File upload failed' });
      }

      image = await imageService.create({ ImageLink: `/image/${chatId}/${image.ImageID}`, ImageID: image.ImageID });

      res.status(201).send(image);
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
    let user = req?.decoded?.data?.UserName;

    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chat = await chatService.findOne(() => [
      {
        where: {
          ChatID: req.params.chatid,
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    if (!chat) {
      res.status(403).send('Unauthorised access');
      return;
    }
    fs.unlinkSync(`${__dirname}/../uploads/images/${req.params.id}`);
    res.send(`${await imageService.deleteRow({ where: { ImageID: req.params.id } })} image deleted`);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to download a image
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.downloadImage = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let chat = await chatService.findOne(() => [
      {
        where: {
          ChatID: req.params.chatid,
          [Op.or]: [{ User1: user }, { User2: user }],
        },
      },
    ]);
    if (!chat) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let image = await imageService.findOne(() => [{ where: { ImageID: req.params.id } }]);
    const uploadPath = `${__dirname}/../uploads/images/${image.ImageID}`;
    res.download(uploadPath, image.ImageName, (err) => {
      if (err) {
        // Handle any errors that may occur during the download
        console.error('File download error:', err);
        res.status(500).send('File download failed');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to get a image details
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getImageDetails = async (req, res, next) => {
  try {
    let image = await imageService.findOne(() => [{ where: { ImageID: req.params.id } }]);
    res.send(image);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
