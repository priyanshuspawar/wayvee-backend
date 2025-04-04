import nodemailer from "nodemailer";
import handlebars from "handlebars";
import { readFile } from "fs/promises";
import { join } from "path";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASS,
  },
  logger: true,
});

const loadTemplate = async (
  templateName: string,
  context: Record<string, string>
) => {
  try {
    const templatePath = join(
      process.cwd() + "/src/views",
      `${templateName}.hbs`
    );
    const templateSource = await readFile(templatePath, "utf-8");
    const compiledTemplate = handlebars.compile(templateSource);
    return compiledTemplate(context);
  } catch (error) {
    console.error("error loading email template", error);
    throw new Error("Email template loading failed");
  }
};

export const sendMailOtp = async (mail: string, otp: string) => {
  const htmlContent = await loadTemplate("otp_email", { otp });
  await transporter.sendMail({
    from: "werelev.ai@gmail.com",
    to: mail,
    subject: "Wayvee verification code",
    html: htmlContent,
  });
  console.log("otp email sent successfully");
};
