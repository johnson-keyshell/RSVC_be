const { Op } = require('sequelize');
const userService = require('../services/users');
const imageService = require('../services/images');
const addressService = require('../services/addresses');
const chatMessageService = require('../services/chatMessages');
const rolesService = require('../services/roles');
const bcrypt = require('bcrypt');
const { SaltRounds: saltRounds } = require('../constants/constants');

const HTTP_OK = 200;
const HTTP_FORBIDDEN = 403;

/**
 * Function to fetch the user details
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    if (req?.decoded?.data?.UserName) {
      let user = await userService.findOne(() => [{ where: { UserName: req?.decoded?.data?.UserName } }]);

      // get the profile pic if avaiable
      if (user?.ProfilePic) {
        let image = await imageService.findOne(() => [{ where: { ImageID: user.ProfilePic } }]);
        user.ProfilePic = image.ImageLink;
      }

      if (user?.Address) {
        let address = await addressService.findOne(() => [{ where: { AddressID: user.Address } }]);
        user.Address = address;
      }

      res.status(200).send(user);
    } else {
      res.status(403).send('Unauthorised Access');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to unread chats count
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.getUnreadChatCount = async (req, res) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised Access');
    }

    const unreadChatsCount = await chatMessageService.getUnreadChatsCountForUser(user);

    res.status(200).send(`${unreadChatsCount}`);
  } catch (error) {
    console.error('Error:', error);
  }
};

/**
 * Function to unread chats count
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.saveProfileDetails = async (req, res) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised Access');
    }

    let data = req.body;
    let address = data.Address;

    if (data?.Address) {
      address = await addressService.create(data.Address);
      data.Address = address.AddressID;
    }
    if (data.HashPassword) {
      const HashPassword = await bcrypt.hash(data.HashPassword, saltRounds);
      data.HashPassword = HashPassword;
    }

    const userInfo = await userService.create({ ...req.body, UserName: user });

    res.status(200).send({ ...userInfo, Address: address });
  } catch (error) {
    console.error('Error:', error);
  }
};

/**
 * Function to unread chats count
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.signUp = async (req, res) => {
  try {
    let data = req.body;
    let address = data.Address;

    // lets check if the email id or the username is duplicate
    let duplicateUserName = await userService.findOne(() => [{ where: { UserName: data?.UserName } }]);
    if (duplicateUserName) {
      res.status(409).send('Duplicate username');
      return;
    }

    let duplicateEmail = await userService.findOne(() => [{ where: { eMail: data.eMail } }]);
    if (duplicateEmail) {
      res.status(409).send('Duplicate E-mail');
      return;
    }

    if (data?.Address) {
      address = await addressService.create(data.Address);
      data.Address = address.AddressID;
    }

    let role = await rolesService.findOne(() => [{ where: { RoleName: 'buyer' } }]);
    const userInfo = await userService.create({
      ...req.body,
      SignUpMethod: 'Default',
      Role: role.RoleID,
      UserName: data?.UserName ?? data.eMail,
    });

    res.status(200).send({ ...userInfo, Address: address });
  } catch (error) {
    console.error('Error:', error);
  }
};
