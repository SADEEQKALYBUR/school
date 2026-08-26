const nodemailer = require('nodemailer');

// Uses Gmail SMTP (completely free) — requires a Gmail "App Password", not your normal password.
// See DEPLOY_GUIDE.md for how to generate one.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendMail({ to, subject, html, replyTo }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  GMAIL_USER / GMAIL_APP_PASSWORD ba a saita su ba a .env — ba a aika email ba.');
    return { skipped: true };
  }

  return transporter.sendMail({
    from: `"Sani Yahaya Memorial School" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    replyTo,
  });
}

module.exports = { sendMail };
