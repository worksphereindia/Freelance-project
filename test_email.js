require('dotenv').config({path: './backend/.env'});
const { sendEmail } = require('./backend/utils/email');

setTimeout(async () => {
    try {
        console.log("sending test email to", process.env.SMTP_USER);
        await sendEmail(process.env.SMTP_USER, "Test", "Test email from code", "<p>Test html</p>");
        console.log("done");
    } catch (e) {
        console.error(e);
    }
}, 2000);
