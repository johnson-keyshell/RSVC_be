var nodemailer = require('nodemailer');

module.exports = {
  generateRandom: (min, max) => {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNum;
  },
  sendEmailNotification: (to, subject, content) => {
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'rsvcdelta@gmail.com', // 'aswin1542000@gmail.com',
        pass: 'cawyfjdnbgdegyuu ',
      },
    });

    var mailOptions = {
      from: 'rsvcdelta@gmail.com',
      to: to,
      subject: subject,
      text: content,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  },
};
