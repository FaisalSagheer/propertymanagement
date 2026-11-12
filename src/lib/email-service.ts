/**
 * PropertyPro - Email Service
 * Comprehensive email service for tenant invitations, notifications, and password resets
 */

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import nodemailer from "nodemailer";
import { IUser } from "@/types";
import { formatCurrency } from "@/lib/utils/formatting";

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email template interface
interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email service class
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private appName: string;
  private appUrl: string;
  private configured: boolean;

  constructor() {
    // Initialize email configuration from environment variables
    const config: EmailConfig = {
      host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SERVER_USER || "",
        pass: process.env.EMAIL_SERVER_PASSWORD || "",
      },
    };

    this.fromEmail =
      process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER || "";
    this.appName = process.env.APP_NAME || "PropertyPro";
    this.appUrl = process.env.APP_URL || "http://localhost:3000";

    // Placeholders shipped in .env.example. Treated as "not configured" rather
    // than attempted, because Gmail answers them with EAUTH 535 and the real
    // cause — nobody filled the values in — gets lost in the stack trace.
    const PLACEHOLDERS = [
      "your-email@gmail.com",
      "your-app-password",
      "your-password",
    ];
    const isPlaceholder = (value: string) =>
      !value || PLACEHOLDERS.includes(value.trim().toLowerCase());

    this.configured =
      !isPlaceholder(config.auth.user) && !isPlaceholder(config.auth.pass);

    if (!this.configured) {
      console.warn(
        "⚠️  Email service is NOT configured — no mail will be sent.\n" +
          "    Set real values for EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD in .env.local.\n" +
          "    For Gmail this must be a 16-character App Password, not the account password."
      );
    }

    // Create transporter using nodemailer
    this.transporter = nodemailer.createTransport(config);
  }

  /** Whether real credentials are present. False means sends are skipped. */
  isConfigured(): boolean {
    return this.configured;
  }

  // Verify email service connection
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email service connection failed:", error);
      return false;
    }
  }

  // Send email with template
  private async sendEmail(
    to: string,
    template: EmailTemplate,
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>
  ): Promise<boolean> {
    // Fail fast and legibly instead of spending a socket timeout to reach an
    // EAUTH the caller cannot act on.
    if (!this.configured) {
      console.error(
        `Email NOT sent to ${to} ("${template.subject}") — email service is not configured. ` +
          `Set EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD in .env.local.`
      );
      return false;
    }

    try {
      const mailOptions = {
        from: `${this.appName} <${this.fromEmail}>`,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      return true;
    } catch (error: any) {
      console.error("Failed to send email:", error);

      // Provide specific guidance for Gmail authentication errors
      if (error.code === "EAUTH" && error.responseCode === 535) {
        console.error(`
🚨 Gmail Authentication Error - Please check:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password (not your regular Gmail password)
3. Use the App Password in EMAIL_SERVER_PASSWORD
4. Ensure EMAIL_SERVER_USER is your full Gmail address

Current config:
- User: ${process.env.EMAIL_SERVER_USER}
- Host: ${process.env.EMAIL_SERVER_HOST}
- Port: ${process.env.EMAIL_SERVER_PORT}

📖 Guide: https://support.google.com/accounts/answer/185833
        `);
      }

      throw error; // Re-throw to let the API handle the error response
    }
  }

  // Generate base email template
  private generateBaseTemplate(
    title: string,
    content: string,
    actionButton?: {
      text: string;
      url: string;
    }
  ): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .content {
            margin-bottom: 30px;
            color: #4b5563;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .security-notice {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin: 20px 0;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">${this.appName}</div>
            <h1 class="title">${title}</h1>
          </div>
          
          <div class="content">
            ${content}
          </div>
          
          ${
            actionButton
              ? `
            <div style="text-align: center;">
              <a href="${actionButton.url}" class="button">${actionButton.text}</a>
            </div>
          `
              : ""
          }
          
          <div class="footer">
            <p>This email was sent from ${
              this.appName
            } Property Management System.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} ${
      this.appName
    }. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate plain text version
    const text = `
${this.appName}

${title}

${content
  .replace(/<[^>]*>/g, "")
  .replace(/\s+/g, " ")
  .trim()}

${actionButton ? `${actionButton.text}: ${actionButton.url}` : ""}

---
This email was sent from ${this.appName} Property Management System.
If you have any questions, please contact our support team.
© ${new Date().getFullYear()} ${this.appName}. All rights reserved.
    `.trim();

    return {
      subject: title,
      html,
      text,
    };
  }

  // Send tenant invitation email
  async sendTenantInvitation(
    tenantEmail: string,
    tenantName: string,
    invitationToken: string,
    invitedBy: string
  ): Promise<boolean> {
    const invitationUrl = `${this.appUrl}/auth/setup-password?token=${invitationToken}`;

    const content = `
      <p>Hello <strong>${tenantName}</strong>,</p>

      <p>You have been invited to join ${this.appName} as a tenant by <strong>${invitedBy}</strong>.</p>

      <p>To complete your account setup and access your tenant portal, please click the button below to set up your password:</p>

      <div class="security-notice">
        <strong>Security Notice:</strong> This invitation link will expire in 24 hours for your security.
        If you don't complete the setup within this time, please contact your property manager for a new invitation.
      </div>

      <p>Once you've set up your password, you'll be able to:</p>
      <ul>
        <li>Access your tenant dashboard</li>
        <li>View lease information and documents</li>
        <li>Submit maintenance requests</li>
        <li>Make rent payments online</li>
        <li>Communicate with your property manager</li>
      </ul>

      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

      <p>Welcome to ${this.appName}!</p>
    `;

    const template = this.generateBaseTemplate(
      "Welcome to PropertyPro - Complete Your Account Setup",
      content,
      {
        text: "Set Up My Password",
        url: invitationUrl,
      }
    );

    return this.sendEmail(tenantEmail, template);
  }

  // Send password reset email
  async sendPasswordReset(
    userEmail: string,
    userName: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${resetToken}`;

    const content = `
      <p>Hello <strong>${userName}</strong>,</p>

      <p>We received a request to reset your password for your ${this.appName} account.</p>

      <p>If you requested this password reset, please click the button below to create a new password:</p>

      <div class="security-notice">
        <strong>Security Notice:</strong> This password reset link will expire in 1 hour for your security.
        If you don't reset your password within this time, you'll need to request a new reset link.
      </div>

      <p><strong>If you didn't request this password reset:</strong></p>
      <ul>
        <li>You can safely ignore this email</li>
        <li>Your password will remain unchanged</li>
        <li>Consider changing your password if you suspect unauthorized access</li>
      </ul>

      <p>For security reasons, we recommend using a strong password that includes:</p>
      <ul>
        <li>At least ${MIN_PASSWORD_LENGTH} characters (a short sentence you can remember works well)</li>
        <li>A mix of uppercase and lowercase letters</li>
        <li>Numbers and special characters</li>
      </ul>
    `;

    const template = this.generateBaseTemplate(
      "Reset Your PropertyPro Password",
      content,
      {
        text: "Reset My Password",
        url: resetUrl,
      }
    );

    return this.sendEmail(userEmail, template);
  }

  /**
   * Welcome a customer who has just bought a subscription and needs to choose
   * their first password.
   *
   * Deliberately not sendPasswordReset: that email says "we received a request
   * to reset your password", which is wrong and alarming for someone who has
   * never had one. Same token type and endpoint, different message.
   */
  async sendManagerWelcome(
    userEmail: string,
    userName: string,
    resetToken: string,
    planName: string
  ): Promise<boolean> {
    const setupUrl = `${this.appUrl}/auth/reset-password?token=${resetToken}`;

    const content = `
      <p>Hello <strong>${userName}</strong>,</p>

      <p>Thank you for subscribing to ${this.appName} on the <strong>${planName}</strong> plan. Your manager account is ready.</p>

      <p>To get started, choose a password for your account:</p>

      <div class="security-notice">
        <strong>This link is unique to you and expires in 7 days.</strong>
        If it expires before you use it, you can request a new one from the sign-in page.
      </div>

      <p>Once you're in, you can:</p>
      <ul>
        <li>Add your properties and units</li>
        <li>Record tenants and leases</li>
        <li>Set up rent invoicing and track payments</li>
        <li>Keep compliance certificates in one place</li>
      </ul>

      <p>If you didn't sign up for ${this.appName}, please contact us and ignore this email — no password will be set until this link is used.</p>
    `;

    const template = this.generateBaseTemplate(
      `Welcome to ${this.appName} — set your password`,
      content,
      {
        text: "Set My Password",
        url: setupUrl,
      }
    );

    return this.sendEmail(userEmail, template);
  }

  // Send account activation confirmation
  async sendAccountActivated(
    userEmail: string,
    userName: string
  ): Promise<boolean> {
    const loginUrl = `${this.appUrl}/auth/signin`;

    const content = `
      <p>Hello <strong>${userName}</strong>,</p>

      <p>Great news! Your ${this.appName} account has been successfully activated.</p>

      <p>You can now log in to your tenant portal and access all available features:</p>

      <ul>
        <li><strong>Dashboard:</strong> View your account overview and important notifications</li>
        <li><strong>Lease Management:</strong> Access your lease documents and information</li>
        <li><strong>Maintenance Requests:</strong> Submit and track maintenance requests</li>
        <li><strong>Payment Portal:</strong> Make rent payments and view payment history</li>
        <li><strong>Communication:</strong> Message your property manager directly</li>
        <li><strong>Profile Settings:</strong> Update your contact information and preferences</li>
      </ul>

      <p>If you have any questions about using the platform or need assistance, our support team is here to help.</p>

      <p>Welcome to ${this.appName}!</p>
    `;

    const template = this.generateBaseTemplate(
      "Your PropertyPro Account is Ready!",
      content,
      {
        text: "Access My Portal",
        url: loginUrl,
      }
    );

    return this.sendEmail(userEmail, template);
  }

  // Send general notification email
  async sendNotification(
    userEmail: string,
    userName: string,
    subject: string,
    message: string,
    actionButton?: {
      text: string;
      url: string;
    }
  ): Promise<boolean> {
    const content = `
      <p>Hello <strong>${userName}</strong>,</p>

      <div style="margin: 20px 0;">
        ${message.replace(/\n/g, "<br>")}
      </div>
    `;

    const template = this.generateBaseTemplate(subject, content, actionButton);
    return this.sendEmail(userEmail, template);
  }

  // Send email with custom template and attachments (public method)
  async sendEmailWithAttachments(
    to: string,
    template: EmailTemplate,
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>
  ): Promise<boolean> {
    return this.sendEmail(to, template, attachments);
  }

  // ============================================================================
  // CALENDAR EVENT EMAIL METHODS
  // ============================================================================

  // Send event invitation email
  async sendEventInvitation(
    attendeeEmail: string,
    attendeeName: string,
    event: {
      title: string;
      description?: string;
      startDate: Date;
      endDate?: Date;
      location?: string;
      organizer: string;
      type: string;
      allDay?: boolean;
    },
    invitationToken?: string
  ): Promise<boolean> {
    const eventDate = event.startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const eventTime = event.allDay
      ? "All day"
      : `${event.startDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}${
          event.endDate
            ? ` - ${event.endDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}`
            : ""
        }`;

    const rsvpUrl = invitationToken
      ? `${this.appUrl}/calendar/rsvp?token=${invitationToken}`
      : null;

    const content = `
      <p>Hello <strong>${attendeeName}</strong>,</p>

      <p>You have been invited to the following event:</p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">${
          event.title
        }</h3>

        <div style="margin-bottom: 10px;">
          <strong>📅 Date:</strong> ${eventDate}
        </div>

        <div style="margin-bottom: 10px;">
          <strong>🕐 Time:</strong> ${eventTime}
        </div>

        ${
          event.location
            ? `
        <div style="margin-bottom: 10px;">
          <strong>📍 Location:</strong> ${event.location}
        </div>
        `
            : ""
        }

        <div style="margin-bottom: 10px;">
          <strong>👤 Organizer:</strong> ${event.organizer}
        </div>

        <div style="margin-bottom: 10px;">
          <strong>📋 Type:</strong> ${event.type.replace(/_/g, " ")}
        </div>

        ${
          event.description
            ? `
        <div style="margin-top: 15px;">
          <strong>Description:</strong>
          <p style="margin: 5px 0 0 0; color: #64748b;">${event.description}</p>
        </div>
        `
            : ""
        }
      </div>

      ${
        rsvpUrl
          ? `
      <p>Please respond to this invitation:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${rsvpUrl}&response=accepted" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 5px;">Accept</a>
        <a href="${rsvpUrl}&response=declined" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 5px;">Decline</a>
        <a href="${rsvpUrl}&response=tentative" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 5px;">Maybe</a>
      </div>
      `
          : ""
      }

      <p>If you have any questions about this event, please contact the organizer.</p>
    `;

    const template = this.generateBaseTemplate(
      `Event Invitation: ${event.title}`,
      content,
      rsvpUrl
        ? {
            text: "View Event Details",
            url: rsvpUrl,
          }
        : undefined
    );

    return this.sendEmail(attendeeEmail, template);
  }

  // Send event reminder email
  async sendEventReminder(
    attendeeEmail: string,
    attendeeName: string,
    event: {
      title: string;
      description?: string;
      startDate: Date;
      endDate?: Date;
      location?: string;
      type: string;
      allDay?: boolean;
    },
    reminderType: "1_hour" | "1_day" | "1_week" = "1_hour"
  ): Promise<boolean> {
    const eventDate = event.startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const eventTime = event.allDay
      ? "All day"
      : event.startDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

    const reminderText = {
      "1_hour": "in 1 hour",
      "1_day": "tomorrow",
      "1_week": "in 1 week",
    }[reminderType];

    const content = `
      <p>Hello <strong>${attendeeName}</strong>,</p>

      <p>This is a reminder that you have an upcoming event <strong>${reminderText}</strong>:</p>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">⏰ ${
          event.title
        }</h3>

        <div style="margin-bottom: 10px;">
          <strong>📅 Date:</strong> ${eventDate}
        </div>

        <div style="margin-bottom: 10px;">
          <strong>🕐 Time:</strong> ${eventTime}
        </div>

        ${
          event.location
            ? `
        <div style="margin-bottom: 10px;">
          <strong>📍 Location:</strong> ${event.location}
        </div>
        `
            : ""
        }

        ${
          event.description
            ? `
        <div style="margin-top: 15px;">
          <strong>Description:</strong>
          <p style="margin: 5px 0 0 0; color: #92400e;">${event.description}</p>
        </div>
        `
            : ""
        }
      </div>

      <p>Please make sure you're prepared for this event. If you need to make any changes, please contact the organizer as soon as possible.</p>
    `;

    const template = this.generateBaseTemplate(
      `Reminder: ${event.title} ${reminderText}`,
      content
    );

    return this.sendEmail(attendeeEmail, template);
  }

  // Send event cancellation email
  async sendEventCancellation(
    attendeeEmail: string,
    attendeeName: string,
    event: {
      title: string;
      startDate: Date;
      location?: string;
      organizer: string;
      reason?: string;
    }
  ): Promise<boolean> {
    const eventDate = event.startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const content = `
      <p>Hello <strong>${attendeeName}</strong>,</p>

      <p>We regret to inform you that the following event has been <strong>cancelled</strong>:</p>

      <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 18px;">❌ ${
          event.title
        }</h3>

        <div style="margin-bottom: 10px;">
          <strong>📅 Original Date:</strong> ${eventDate}
        </div>

        ${
          event.location
            ? `
        <div style="margin-bottom: 10px;">
          <strong>📍 Location:</strong> ${event.location}
        </div>
        `
            : ""
        }

        <div style="margin-bottom: 10px;">
          <strong>👤 Organizer:</strong> ${event.organizer}
        </div>

        ${
          event.reason
            ? `
        <div style="margin-top: 15px;">
          <strong>Reason for cancellation:</strong>
          <p style="margin: 5px 0 0 0; color: #dc2626;">${event.reason}</p>
        </div>
        `
            : ""
        }
      </div>

      <p>We apologize for any inconvenience this may cause. If you have any questions, please contact the organizer.</p>
    `;

    const template = this.generateBaseTemplate(
      `Event Cancelled: ${event.title}`,
      content
    );

    return this.sendEmail(attendeeEmail, template);
  }

  // Send event update email
  async sendEventUpdate(
    attendeeEmail: string,
    attendeeName: string,
    event: {
      title: string;
      startDate: Date;
      endDate?: Date;
      location?: string;
      organizer: string;
      allDay?: boolean;
    },
    changes: string[]
  ): Promise<boolean> {
    const eventDate = event.startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const eventTime = event.allDay
      ? "All day"
      : event.startDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

    const content = `
      <p>Hello <strong>${attendeeName}</strong>,</p>

      <p>The following event has been <strong>updated</strong>:</p>

      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 18px;">📝 ${
          event.title
        }</h3>

        <div style="margin-bottom: 10px;">
          <strong>📅 Date:</strong> ${eventDate}
        </div>

        <div style="margin-bottom: 10px;">
          <strong>🕐 Time:</strong> ${eventTime}
        </div>

        ${
          event.location
            ? `
        <div style="margin-bottom: 10px;">
          <strong>📍 Location:</strong> ${event.location}
        </div>
        `
            : ""
        }

        <div style="margin-top: 15px;">
          <strong>Changes made:</strong>
          <ul style="margin: 5px 0 0 20px; color: #0369a1;">
            ${changes.map((change) => `<li>${change}</li>`).join("")}
          </ul>
        </div>
      </div>

      <p>Please update your calendar accordingly. If you have any questions about these changes, please contact the organizer.</p>
    `;

    const template = this.generateBaseTemplate(
      `Event Updated: ${event.title}`,
      content
    );

    return this.sendEmail(attendeeEmail, template);
  }

  // Send RSVP confirmation email
  async sendRSVPConfirmation(
    attendeeEmail: string,
    attendeeName: string,
    event: {
      title: string;
      startDate: Date;
      location?: string;
    },
    response: "accepted" | "declined" | "tentative"
  ): Promise<boolean> {
    const responseText = {
      accepted: "accepted",
      declined: "declined",
      tentative: "tentatively accepted",
    }[response];

    const responseColor = {
      accepted: "#10b981",
      declined: "#ef4444",
      tentative: "#f59e0b",
    }[response];

    const content = `
      <p>Hello <strong>${attendeeName}</strong>,</p>

      <p>Thank you for your response. You have <strong style="color: ${responseColor};">${responseText}</strong> the invitation to:</p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">${
          event.title
        }</h3>

        <div style="margin-bottom: 10px;">
          <strong>📅 Date:</strong> ${event.startDate.toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          )}
        </div>

        ${
          event.location
            ? `
        <div style="margin-bottom: 10px;">
          <strong>📍 Location:</strong> ${event.location}
        </div>
        `
            : ""
        }
      </div>

      ${
        response === "accepted"
          ? `
      <p>We look forward to seeing you at the event!</p>
      `
          : response === "declined"
          ? `
      <p>We're sorry you won't be able to attend. If your plans change, please let the organizer know.</p>
      `
          : `
      <p>Please confirm your attendance as soon as possible.</p>
      `
      }
    `;

    const template = this.generateBaseTemplate(
      `RSVP Confirmation: ${event.title}`,
      content
    );

    return this.sendEmail(attendeeEmail, template);
  }

  // Send payment reminder email
  async sendPaymentReminder(
    tenantEmail: string,
    tenantName: string,
    propertyName: string,
    rentAmount: number,
    dueDate: Date,
    daysOverdue: number = 0
  ): Promise<boolean> {
    const paymentUrl = `${this.appUrl}/dashboard/payments/pay-rent`;
    const isOverdue = daysOverdue > 0;

    const content = `
      <p>Hello <strong>${tenantName}</strong>,</p>

      ${
        isOverdue
          ? `<div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin: 20px 0; color: #dc2626;">
             <strong>⚠️ Overdue Payment Notice</strong><br>
             Your rent payment is ${daysOverdue} day${
              daysOverdue > 1 ? "s" : ""
            } overdue.
           </div>`
          : `<p>This is a friendly reminder that your rent payment is due soon.</p>`
      }

      <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName}</p>
        <p style="margin: 5px 0;"><strong>Amount Due:</strong> ${formatCurrency(
          rentAmount
        )}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
        ${
          isOverdue
            ? `<p style="margin: 5px 0; color: #dc2626;"><strong>Days Overdue:</strong> ${daysOverdue}</p>`
            : ""
        }
      </div>

      <p>You can make your payment securely through your tenant portal using the button below.</p>

      ${
        isOverdue
          ? `<p style="color: #dc2626;"><strong>Important:</strong> Please make your payment as soon as possible to avoid any late fees or further action.</p>`
          : `<p>Thank you for being a valued tenant!</p>`
      }
    `;

    const template = this.generateBaseTemplate(
      isOverdue
        ? "Overdue Rent Payment - Action Required"
        : "Rent Payment Reminder",
      content,
      {
        text: "Pay Rent Now",
        url: paymentUrl,
      }
    );

    return this.sendEmail(tenantEmail, template);
  }

  // Send lease expiry reminder
  async sendLeaseExpiryReminder(
    tenantEmail: string,
    tenantName: string,
    propertyName: string,
    expiryDate: Date,
    daysUntilExpiry: number
  ): Promise<boolean> {
    const renewalUrl = `${this.appUrl}/dashboard/leases/my-lease`;

    const content = `
      <p>Hello <strong>${tenantName}</strong>,</p>

      <p>We wanted to remind you that your lease for <strong>${propertyName}</strong> is approaching its expiration date.</p>

      <div style="background-color: ${
        daysUntilExpiry <= 30 ? "#fef3c7" : "#f0f9ff"
      }; border: 1px solid ${
      daysUntilExpiry <= 30 ? "#f59e0b" : "#0ea5e9"
    }; border-radius: 6px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">Lease Information</h3>
        <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName}</p>
        <p style="margin: 5px 0;"><strong>Lease Expires:</strong> ${expiryDate.toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Days Remaining:</strong> ${daysUntilExpiry}</p>
      </div>

      ${
        daysUntilExpiry <= 30
          ? `<p style="color: #92400e;"><strong>Action Required:</strong> Your lease expires in ${daysUntilExpiry} days. Please contact your property manager to discuss renewal options.</p>`
          : `<p>Please start considering your renewal options and contact your property manager if you have any questions.</p>`
      }

      <p>To review your current lease details or contact your property manager, please visit your tenant portal.</p>
    `;

    const template = this.generateBaseTemplate(
      `Lease Expiry Reminder - ${daysUntilExpiry} Days Remaining`,
      content,
      {
        text: "View Lease Details",
        url: renewalUrl,
      }
    );

    return this.sendEmail(tenantEmail, template);
  }

  // Send lease expiry reminder to landlord (property owner/manager)
  async sendLeaseExpiryReminderToLandlord(
    landlordEmail: string,
    landlordName: string,
    propertyName: string,
    tenantName: string,
    expiryDate: Date,
    daysUntilExpiry: number,
    leaseId?: string
  ): Promise<boolean> {
    const leaseUrl = leaseId
      ? `${this.appUrl}/dashboard/leases/${leaseId}`
      : `${this.appUrl}/dashboard/leases`;

    const content = `
      <p>Hello <strong>${landlordName}</strong>,</p>

      <p>This is an automated reminder that a lease agreement for one of your properties is approaching its expiration date.</p>

      <div style="background-color: ${
        daysUntilExpiry <= 30 ? "#fef3c7" : "#f0f9ff"
      }; border: 1px solid ${
      daysUntilExpiry <= 30 ? "#f59e0b" : "#0ea5e9"
    }; border-radius: 6px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">Lease Expiry Details</h3>
        <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName}</p>
        <p style="margin: 5px 0;"><strong>Tenant:</strong> ${tenantName}</p>
        <p style="margin: 5px 0;"><strong>Lease Expires:</strong> ${expiryDate.toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Days Remaining:</strong> ${daysUntilExpiry}</p>
      </div>

      ${
        daysUntilExpiry <= 30
          ? `<div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 16px; margin: 20px 0; color: #dc2626;">
               <strong>⚠️ Action Required</strong><br>
               This lease expires in ${daysUntilExpiry} days. Please take the following actions:
               <ul style="margin: 10px 0; padding-left: 20px;">
                 <li>Contact the tenant to discuss renewal options</li>
                 <li>Prepare a new lease agreement if renewal is desired</li>
                 <li>Plan for property turnover if tenant is moving out</li>
                 <li>Schedule property inspection if needed</li>
               </ul>
             </div>`
          : `<p>You have sufficient time to plan ahead. Consider reaching out to the tenant to discuss their renewal intentions.</p>`
      }

      <p><strong>Recommended Actions:</strong></p>
      <ul style="line-height: 1.8;">
        <li>Review the current lease terms and tenant payment history</li>
        <li>Determine if you want to offer a lease renewal</li>
        <li>Consider any rent adjustments for the new term</li>
        <li>Communicate with the tenant about their plans</li>
        ${
          daysUntilExpiry <= 30
            ? "<li><strong>Act promptly to avoid vacancy periods</strong></li>"
            : ""
        }
      </ul>

      <p>Click the button below to view the full lease details and take action.</p>
    `;

    const template = this.generateBaseTemplate(
      `Lease Expiring Soon - ${propertyName} (${daysUntilExpiry} Days)`,
      content,
      {
        text: "View Lease Details",
        url: leaseUrl,
      }
    );

    return this.sendEmail(landlordEmail, template);
  }

  // Send maintenance update notification
  async sendMaintenanceUpdate(
    userEmail: string,
    userName: string,
    requestId: string,
    propertyName: string,
    status: string,
    description: string,
    notes?: string
  ): Promise<boolean> {
    const maintenanceUrl = `${this.appUrl}/dashboard/maintenance/${requestId}`;

    const statusColors = {
      submitted: "#3b82f6",
      in_progress: "#f59e0b",
      completed: "#10b981",
      cancelled: "#ef4444",
    };

    const statusColor =
      statusColors[status as keyof typeof statusColors] || "#6b7280";

    const content = `
      <p>Hello <strong>${userName}</strong>,</p>

      <p>Your maintenance request has been updated.</p>

      <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1f2937;">Request Details</h3>
        <p style="margin: 5px 0;"><strong>Request ID:</strong> #${requestId}</p>
        <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName}</p>
        <p style="margin: 5px 0;"><strong>Description:</strong> ${description}</p>
        <p style="margin: 5px 0;">
          <strong>Status:</strong>
          <span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
            ${status.replace("_", " ")}
          </span>
        </p>
        ${
          notes
            ? `<p style="margin: 15px 0 5px 0;"><strong>Notes:</strong> ${notes}</p>`
            : ""
        }
      </div>

      <p>You can view the full details and track the progress of your request using the button below.</p>
    `;

    const template = this.generateBaseTemplate(
      `Maintenance Request Update - #${requestId}`,
      content,
      {
        text: "View Request Details",
        url: maintenanceUrl,
      }
    );

    return this.sendEmail(userEmail, template);
  }

  // Send test email to verify configuration
  async sendTestEmail(recipientEmail: string): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `${this.appName} - Email Service Test`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Email Service Test</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
              This is a test email to verify that your ${
                this.appName
              } email service is working correctly.
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #28a745; font-weight: bold;">✅ Email service is working!</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This email was sent from ${
              this.appName
            } at ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: `
        ${this.appName} - Email Service Test

        This is a test email to verify that your ${
          this.appName
        } email service is working correctly.

        ✅ Email service is working!

        This email was sent from ${
          this.appName
        } at ${new Date().toLocaleString()}
      `,
    };

    return this.sendEmail(recipientEmail, template);
  }
}

// Create singleton instance
export const emailService = new EmailService();
