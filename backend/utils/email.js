const nodemailer = require('nodemailer');

let transporter;

const setupTransporter = async () => {
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
    console.log("Real Email Setup Completed with Gmail credentials.");
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log("Real Email Setup Completed with provided credentials.");
  } else {
    // Fallback to test account
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });
    console.log("Mock Email Setup Completed. Check ethereal.email for emails.");
  }
};

setupTransporter();

const sendEmail = async (to, subject, text, html) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: '"WorkSphere" <non-reply@worksphere.in>',
        to,
        subject,
        text,
        html
      });
      console.log("Email Sent! View it here: " + nodemailer.getTestMessageUrl(info));
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
    }
  } else {
    console.log("Email transporter not ready yet.");
  }
};

const sendProfessionalEmail = async (to, subject, title, htmlContent) => {
  const logoUrl = 'https://work-sphere.vercel.app/logo.png'; // Assuming frontend has /logo.png
  
  const professionalHtml = `
  <div style="font-family: 'Inter', Arial, sans-serif; padding: 40px 20px; background-color: #f1f5f9; color: #334155; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="text-align: center; padding: 30px 20px; background-color: #1e293b;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px;">WorkSphere</h1>
        <p style="font-size: 14px; color: #94a3b8; margin-top: 5px; margin-bottom: 0;">Empowering Freelancers Worldwide</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 25px; font-size: 22px;">${title}</h2>
        <div style="line-height: 1.6; color: #475569; font-size: 16px;">
          ${htmlContent}
        </div>
      </div>
      <div style="background-color: #f8fafc; text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} WorkSphere Inc. All rights reserved.</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  </div>`;
  
  return await sendEmail(to, subject, htmlContent.replace(/<[^>]*>?/gm, ''), professionalHtml);
};

module.exports = { sendEmail, sendProfessionalEmail, getTransporter: () => transporter };
