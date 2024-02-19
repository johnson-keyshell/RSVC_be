module.exports = {
  roles: [{ RoleName: "admin" }, { RoleName: "agent" }, { RoleName: "owner" }, { RoleName: "buyer" }],
  users: [
    {
      UserName: "admin",
      password: "rsvc_@dmin_2o23",
      FirstName: "Admin",
      LastName: "RSVC",
      Role: "admin",
      eMail: "test@gmail.com",
      PhoneNumber: "+917012568765",
      PreferredContactMethod: "Whatsapp",
      SignUpMethod: "Default",
    },
  ],
  // creating sample chat users for development only
  chatUsers : [
    {
      UserName: "Aswin",
      password: "Aswin1234",
      FirstName: "Aswin",
      LastName: "S",
      Role: "agent",
      eMail: "aswin@gmail.com",
      PhoneNumber: "+917012568761",
      PreferredContactMethod: "Whatsapp",
      SignUpMethod: "Default",
    },
    {
      UserName: "Geo",
      password: "Geo1234",
      FirstName: "Geo",
      LastName: "G",
      Role: "agent",
      eMail: "geo@gmail.com",
      PhoneNumber: "+917012568762",
      PreferredContactMethod: "Whatsapp",
      SignUpMethod: "Default",
    },
    {
      UserName: "Toshni",
      password: "Toshni1234",
      FirstName: "Toshni",
      LastName: "T",
      Role: "agent",
      eMail: "toshni@gmail.com",
      PhoneNumber: "+917012568763",
      PreferredContactMethod: "Whatsapp",
      SignUpMethod: "Default",
    },
  ]
};
