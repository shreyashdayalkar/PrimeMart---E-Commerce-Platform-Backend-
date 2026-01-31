import nodemailer from "nodemailer";

/**
 * ✅ REUSABLE EMAIL HELPER WITH ATTACHMENTS
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML content of the email
 * @param {Buffer} invoicePdfBuffer - (Optional) PDF Buffer to attach
 * @param {string} filename - (Optional) Name of the attached file
 */
export const sendInvoiceEmail = async ({ to, subject, html, invoicePdfBuffer, filename = "invoice.pdf" }) => {
  try {
    // 1. Create Transporter (Update with your SMTP settings)
    const transporter = nodemailer.createTransport({
      service: "gmail", // Or your preferred provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Define Email Options
    const mailOptions = {
      from: `"Store App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: invoicePdfBuffer
        ? [
            {
              filename: filename,
              content: invoicePdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : [],
    };

    // 3. Send Email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Nodemailer Error:", error.message);
    throw new Error("Failed to send invoice email.");
  }
};

export default sendInvoiceEmail;