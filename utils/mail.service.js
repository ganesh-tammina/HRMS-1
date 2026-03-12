const nodemailer = require("nodemailer");
// Create Transporter (e.g., using Gmail)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // App Password
    },
});

// Exported sendMail function for test email porpuse ganesh new change

const sendMail = async (options) => {
    return await transporter.sendMail({
        from: '"My App" <' + process.env.EMAIL_USER + ">",
        ...options,
    });
};

module.exports = { sendMail };
