/**
 * Email Service for sending notifications
 * Development: Logs to console
 * Production: Uses nodemailer with SMTP
 */

import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    // Only initialize in production
    if (process.env.NODE_ENV === 'production') {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: true, // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false // For self-signed certificates
          }
        });

        // Verify connection configuration
        await this.transporter.verify();
        console.log('✅ Email service initialized successfully');
      } catch (error) {
        console.error('❌ Email service initialization failed:', error);
        this.transporter = null;
      }
    }
  }

  /**
   * Send account deletion confirmation email
   * @param {string} email - User's email address
   * @returns {Promise<void>}
   */
  async sendAccountDeletionConfirmation(email) {
    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== ACCOUNT DELETION EMAIL ==========');
      console.log(`To: ${email}`);
      console.log('Subject: Account Deletion Confirmation - ATS Tracker');
      console.log('\nYour ATS Tracker account has been permanently deleted.');
      console.log('All your personal data has been removed from our systems.');
      console.log('\nIf you did not request this deletion, please contact support immediately.');
      console.log('\nThank you for using ATS Tracker.');
      console.log('============================================\n');
      return;
    }

    // Production mode - use nodemailer
    if (!this.transporter) {
      console.error('❌ Email service not initialized');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@atstracker.com',
      to: email,
      subject: 'Account Deletion Confirmation - ATS Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Your Account Has Been Deleted</h2>
          <p>This email confirms that your ATS Tracker account has been permanently deleted.</p>
          <p>All your personal data, including:</p>
          <ul>
            <li>Profile information</li>
            <li>Employment history</li>
            <li>Education records</li>
            <li>Skills and certifications</li>
            <li>Projects</li>
          </ul>
          <p>...has been removed from our systems.</p>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #DC2626; font-weight: bold;">
            If you did not request this deletion, please contact our support team immediately.
          </p>
          <p style="color: #6B7280; font-size: 12px;">
            Thank you for using ATS Tracker.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Account deletion email sent to:', email);
    } catch (error) {
      console.error('❌ Error sending deletion email:', error);
      // Don't throw - deletion still successful even if email fails
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User's email address
   * @param {string} resetToken - Password reset token
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== PASSWORD RESET EMAIL ==========');
      console.log(`To: ${email}`);
      console.log('Subject: Password Reset Request - ATS Tracker');
      console.log('\nYou requested a password reset for your ATS Tracker account.');
      console.log('\nClick the link below to reset your password:');
      console.log(resetUrl);
      console.log('\nThis link will expire in 1 hour for security reasons.');
      console.log('\nIf you did not request this password reset, please ignore this email.');
      console.log('\nThank you for using ATS Tracker.');
      console.log('==========================================\n');
      return;
    }

    // Production mode - use nodemailer
    if (!this.transporter) {
      console.error('❌ Email service not initialized');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@atstracker.com',
      to: email,
      subject: 'Password Reset Request - ATS Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A94EE;">Password Reset Request</h2>
          <p>You requested a password reset for your ATS Tracker account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(to right, #6A94EE, #916BE3); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6B7280; font-size: 14px;">
            This link will expire in 1 hour for security reasons.
          </p>
          <p style="color: #6B7280; font-size: 14px;">
            If you did not request this password reset, please ignore this email.
          </p>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            Thank you for using ATS Tracker.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent to:', email);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }
  }

  /**
   * Send application deadline reminder email
   * @param {string} email - User's email address
   * @param {object} jobDetails - Job opportunity details
   * @param {string} jobDetails.title - Job title
   * @param {string} jobDetails.company - Company name
   * @param {string} jobDetails.applicationDeadline - Application deadline date
   * @param {string} jobDetails.location - Job location
   * @param {string} jobDetails.jobPostingUrl - Job posting URL (optional)
   * @returns {Promise<void>}
   */
  async sendDeadlineReminder(email, jobDetails) {
    const { title, company, applicationDeadline, location, jobPostingUrl } = jobDetails;
    
    // Format deadline date
    const deadlineDate = new Date(applicationDeadline);
    const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // Calculate days remaining
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(applicationDeadline);
    deadline.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    
    let daysRemainingText = '';
    if (daysRemaining < 0) {
      daysRemainingText = `<p style="color: #DC2626; font-weight: bold; font-size: 16px;">⚠️ This deadline has passed (${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago)</p>`;
    } else if (daysRemaining === 0) {
      daysRemainingText = '<p style="color: #DC2626; font-weight: bold; font-size: 16px;">🚨 Deadline is today!</p>';
    } else if (daysRemaining === 1) {
      daysRemainingText = '<p style="color: #DC2626; font-weight: bold; font-size: 16px;">⚠️ Deadline is tomorrow!</p>';
    } else {
      daysRemainingText = `<p style="color: #F59E0B; font-weight: bold; font-size: 16px;">⏰ ${daysRemaining} days remaining</p>`;
    }
    
    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== DEADLINE REMINDER EMAIL ==========');
      console.log(`To: ${email}`);
      console.log('Subject: Application Deadline Reminder - ATS Tracker');
      console.log(`\nJob: ${title} at ${company}`);
      console.log(`Location: ${location || 'Not specified'}`);
      console.log(`Deadline: ${formattedDeadline}`);
      console.log(`Days Remaining: ${daysRemaining}`);
      if (jobPostingUrl) {
        console.log(`Job Posting: ${jobPostingUrl}`);
      }
      console.log('\nThis is a reminder about your upcoming application deadline.');
      console.log('============================================\n');
      return;
    }

    // Production mode - use nodemailer
    if (!this.transporter) {
      console.error('❌ Email service not initialized');
      return;
    }

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@atstracker.com',
      to: email,
      subject: `Application Deadline Reminder: ${title} at ${company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A94EE;">Application Deadline Reminder</h2>
          <p>This is a reminder about your upcoming job application deadline.</p>
          
          <div style="background: #F3F4F6; border-left: 4px solid #6A94EE; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1F2937; margin-top: 0; font-size: 20px;">${title}</h3>
            <p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Company:</strong> ${company}</p>
            ${location ? `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Location:</strong> ${location}</p>` : ''}
            <p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Application Deadline:</strong> ${formattedDeadline}</p>
            ${daysRemainingText}
          </div>
          
          ${jobPostingUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${jobPostingUrl}" 
               target="_blank"
               style="background: linear-gradient(to right, #6A94EE, #916BE3); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;">
              View Job Posting
            </a>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/job-opportunities" 
               style="background: #F3F4F6; 
                      color: #4B5563; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      border: 1px solid #D1D5DB;">
              View in ATS Tracker
            </a>
          </div>
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            This is an automated reminder from ATS Tracker. Good luck with your application!
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Deadline reminder email sent to:', email);
    } catch (error) {
      console.error('❌ Error sending deadline reminder email:', error);
      throw error;
    }
  }

  /**
   * Send interview reminder email
   * @param {string} email - User's email address
   * @param {object} reminderData - Reminder data
   * @param {string} reminderData.userName - User's name
   * @param {string} reminderData.reminderType - '24_hours' or '2_hours'
   * @param {object} reminderData.interview - Interview details
   * @returns {Promise<void>}
   */
  async sendInterviewReminder(email, reminderData) {
    const { userName, reminderType, interview } = reminderData;
    
    const interviewTime = new Date(interview.scheduledAt);
    const formattedTime = interviewTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const timeUntil = reminderType === '24_hours' 
      ? '24 hours' 
      : '2 hours';

    const reminderTitle = reminderType === '24_hours'
      ? '📅 Interview Tomorrow'
      : '⏰ Interview in 2 Hours';

    // Build location/contact info
    let locationInfo = '';
    if (interview.location) {
      locationInfo = `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Location:</strong> ${interview.location}</p>`;
    } else if (interview.videoLink) {
      locationInfo = `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Video Link:</strong> <a href="${interview.videoLink}" style="color: #6A94EE;">${interview.videoLink}</a></p>`;
    } else if (interview.phoneNumber) {
      locationInfo = `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Phone:</strong> ${interview.phoneNumber}</p>`;
    }

    // Build interviewer info
    let interviewerInfo = '';
    if (interview.interviewerName) {
      interviewerInfo = `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Interviewer:</strong> ${interview.interviewerName}`;
      if (interview.interviewerEmail) {
        interviewerInfo += ` (${interview.interviewerEmail})`;
      }
      interviewerInfo += '</p>';
    }

    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== INTERVIEW REMINDER EMAIL ==========');
      console.log(`To: ${email}`);
      console.log(`Subject: ${reminderTitle}: ${interview.title || 'Interview'} at ${interview.company}`);
      console.log(`\nHi ${userName || email},`);
      console.log(`\nYour interview is in ${timeUntil}:`);
      console.log(`\n${interview.title || 'Interview'} at ${interview.company}`);
      console.log(`Time: ${formattedTime}`);
      if (locationInfo) console.log(`\n${locationInfo.replace(/<[^>]*>/g, '')}`);
      if (interviewerInfo) console.log(interviewerInfo.replace(/<[^>]*>/g, ''));
      console.log('\nGood luck with your interview!');
      console.log('============================================\n');
      return;
    }

    // Production mode - use nodemailer
    if (!this.transporter) {
      console.error('❌ Email service not initialized');
      return;
    }

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@atstracker.com',
      to: email,
      subject: `${reminderTitle}: ${interview.title || 'Interview'} at ${interview.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A94EE;">${reminderTitle}</h2>
          <p>Hi ${userName || 'there'},</p>
          <p>This is a reminder that your interview is in <strong>${timeUntil}</strong>.</p>
          
          <div style="background: #F3F4F6; border-left: 4px solid #6A94EE; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1F2937; margin-top: 0; font-size: 20px;">${interview.title || 'Interview'}</h3>
            <p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Company:</strong> ${interview.company}</p>
            <p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Time:</strong> ${formattedTime}</p>
            ${locationInfo}
            ${interviewerInfo}
          </div>
          
          ${reminderType === '24_hours' ? `
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #92400E; margin: 0; font-size: 14px;"><strong>💡 Preparation Tip:</strong> Make sure to review your preparation checklist and have everything ready!</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/interview-scheduling" 
               style="background: linear-gradient(to right, #6A94EE, #916BE3); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;">
              View Interview Details
            </a>
          </div>
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px; text-align: center;">
            Good luck with your interview! 💼
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Interview reminder email sent to: ${email} (${reminderType})`);
    } catch (error) {
      console.error('❌ Error sending interview reminder email:', error);
      throw error;
    }
  }

  /**
   * Send thank-you note email
   * @param {object} emailData - Email data
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.recipientName - Recipient name
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.body - Email body (text)
   * @param {string} emailData.senderEmail - Sender email (for reply-to)
   * @returns {Promise<void>}
   */
  async sendThankYouNoteEmail(emailData) {
    const { to, recipientName, subject, body, senderEmail } = emailData;
    
    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== THANK-YOU NOTE EMAIL ==========');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`\n${body}`);
      console.log('\n==========================================\n');
      return;
    }

    // Production mode - use nodemailer
    if (!this.transporter) {
      console.error('❌ Email service not initialized');
      return;
    }

    // Convert plain text body to HTML with line breaks
    const htmlBody = body.replace(/\n/g, '<br>');

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@atstracker.com',
      to: to,
      replyTo: senderEmail,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="white-space: pre-line; color: #1F2937; line-height: 1.6;">
            ${htmlBody}
          </div>
        </div>
      `,
      text: body, // Plain text version
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Thank-you note email sent to: ${to}`);
    } catch (error) {
      console.error('❌ Error sending thank-you note email:', error);
      throw error;
    }
  }
}

export default new EmailService();