import nodemailer from 'nodemailer';
import { config } from '../config';

/**
 * Nodemailer transporter configured from environment variables.
 * Requirements: 1.10
 */
export const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
});

/**
 * Send an HTML email.
 */
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  await transporter.sendMail({ from: config.EMAIL_FROM, to, subject, html });
}
