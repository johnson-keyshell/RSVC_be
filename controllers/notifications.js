const { Op } = require('sequelize');
const notificationService = require('../services/notification');

/**
 * Function to fetch the notifications
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 *
 * TBD: We need to update this controller dependin on the future changes
 */

exports.getNotifications = async (req, res, next) => {
  try {
    let user = req?.decoded?.data?.UserName;
    if (!user) {
      res.status(403).send('Unauthorised access');
      return;
    }
    let notifications = await notificationService.findMany(() => [
      {
        attributes: ['NotificationID', 'Message', 'Timestamp', 'ReadFlag'],
        order: [['Timestamp', 'DESC']],
        where: {
          User: user,
        },
      },
    ]);
    res.status(200).send(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to delete a notification
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.deteleNotification = async (req, res, next) => {
  try {
    res.send(`${await notificationService.deleteRow({ where: { NotificationID: req.params.id } })} notification deleted`);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

/**
 * Function to set read flag of notification
 * @param {Object} req The Express req object
 * @param {Object} res The Express response object
 * @param {Function} next The next middleware function to be called
 */
exports.setReadFlag = async (req, res, next) => {
  try {
    await notificationService.create({ NotificationID: req.params.id, ReadFlag: true });
    res.send(req.params.id);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
