import nodemailer from 'nodemailer';
import { env } from '../config/environment';
import { logger } from '../logger/winston';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  private async send(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      logger.info('Email sent', { messageId: info.messageId, to: options.to });
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to, subject: options.subject });
      // Don't throw — email failures should not crash the API
    }
  }

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    await this.send({
      to,
      subject: 'Verify your JanSeva AI account',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            
            <div style="background: linear-gradient(135deg, #FF8C00 0%, #138808 100%); padding: 32px; text-align: center;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" width="60" style="margin-bottom: 16px;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">JANSEVA AI</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Government of India · Citizen Grievance Portal</p>
            </div>

            <div style="padding: 40px 32px;">
              <h2 style="color: #1a1a2e; margin: 0 0 16px;">Hello, ${name}!</h2>
              <p style="color: #555; line-height: 1.6;">Thank you for registering with <strong>JanSeva AI</strong> — the official AI-powered citizen grievance platform. Please verify your email address to activate your account.</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" style="background: #FF8C00; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                  ✉ Verify My Email
                </a>
              </div>

              <p style="color: #888; font-size: 13px;">This link expires in <strong>${env.EMAIL_VERIFY_TOKEN_EXPIRES_HOURS} hours</strong>. If you did not create this account, please ignore this email.</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #aaa; font-size: 12px; text-align: center;">
                🔒 JanSeva AI — Your Voice. Our Action.<br>
                Ministry of Housing and Urban Affairs · Government of India
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${name},\n\nVerify your JanSeva AI account:\n${verifyUrl}\n\nThis link expires in ${env.EMAIL_VERIFY_TOKEN_EXPIRES_HOURS} hours.`,
    });
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.send({
      to,
      subject: 'Reset your JanSeva AI password',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            
            <div style="background: linear-gradient(135deg, #FF8C00 0%, #138808 100%); padding: 32px; text-align: center;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" width="60" style="margin-bottom: 16px;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">JANSEVA AI</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Government of India · Citizen Grievance Portal</p>
            </div>

            <div style="padding: 40px 32px;">
              <h2 style="color: #1a1a2e; margin: 0 0 16px;">Password Reset Request</h2>
              <p style="color: #555; line-height: 1.6;">Hello <strong>${name}</strong>, we received a request to reset your JanSeva AI password. Click the button below to reset it.</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background: #138808; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                  🔑 Reset My Password
                </a>
              </div>

              <div style="background: #fff8e6; border: 1px solid #ffd166; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #856404; margin: 0; font-size: 13px;"><strong>⚠️ Security Notice:</strong> This link expires in <strong>${env.PASSWORD_RESET_TOKEN_EXPIRES_HOURS} hours</strong>. If you did not request a password reset, please ignore this email — your account remains secure.</p>
              </div>

              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #aaa; font-size: 12px; text-align: center;">
                🔒 JanSeva AI — Your Voice. Our Action.<br>
                Ministry of Housing and Urban Affairs · Government of India
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${name},\n\nReset your JanSeva AI password:\n${resetUrl}\n\nThis link expires in ${env.PASSWORD_RESET_TOKEN_EXPIRES_HOURS} hours.`,
    });
  }

  async sendComplaintUpdate(
    to: string,
    name: string,
    complaintId: string,
    status: string,
    message: string,
  ): Promise<void> {
    const trackUrl = `${env.FRONTEND_URL}/complaint?id=${complaintId}`;

    await this.send({
      to,
      subject: `Complaint ${complaintId} — Status Updated`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #FF8C00 0%, #138808 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">JANSEVA AI — Complaint Update</h1>
            </div>
            <div style="padding: 32px;">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Your complaint <strong>${complaintId}</strong> has been updated.</p>
              <div style="background: #f8f9fa; border-left: 4px solid #FF8C00; padding: 16px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; font-weight: 600;">Status: ${status}</p>
                <p style="margin: 8px 0 0; color: #555;">${message}</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${trackUrl}" style="background: #FF8C00; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Track Complaint</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to JanSeva AI — Your account is ready!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #FF8C00 0%, #138808 100%); padding: 32px; text-align: center;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" width="60" style="margin-bottom: 16px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome, ${name}!</h1>
            </div>
            <div style="padding: 40px 32px;">
              <p style="color: #555;">Your JanSeva AI account has been verified and is now active. You can now:</p>
              <ul style="color: #555; line-height: 2;">
                <li>Report civic complaints by voice, text, or photo</li>
                <li>Track real-time status of your complaints</li>
                <li>Chat with our AI assistant for help</li>
                <li>Verify resolutions and provide feedback</li>
              </ul>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${env.FRONTEND_URL}/dashboard" style="background: #138808; color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Get Started →</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  async sendOtpCode(to: string, name: string, code: string): Promise<void> {
    await this.send({
      to,
      subject: `${code} — Your JanSeva AI Verification Code`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; background: #f4f7ff; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #FF8C00 0%, #138808 100%); padding: 28px; text-align: center;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem of India" width="50" style="margin-bottom: 12px;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">JANSEVA AI</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Government of India · Citizen Grievance Portal</p>
            </div>
            <div style="padding: 36px 32px; text-align: center;">
              <h2 style="color: #1a1a2e; margin: 0 0 8px; font-size: 20px;">Hello, ${name}!</h2>
              <p style="color: #555; line-height: 1.6; margin: 0 0 28px;">Use the code below to verify your email address. This code expires in <strong>15 minutes</strong>.</p>
              <div style="background: #f8f9fa; border: 2px dashed #FF8C00; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
                <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
                <p style="margin: 0; font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #1a1a2e; font-family: 'Courier New', monospace;">${code}</p>
              </div>
              <p style="color: #aaa; font-size: 12px;">Do not share this code with anyone. JanSeva AI will never ask for your OTP.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #aaa; font-size: 11px;">🔒 JanSeva AI — Your Voice. Our Action.<br>Ministry of Housing and Urban Affairs · Government of India</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${name},\n\nYour JanSeva AI verification code is: ${code}\n\nThis code expires in 15 minutes. Do not share it with anyone.`,
    });
  }
}

export const emailService = new EmailService();
