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
   * Send team invitation email
   * @param {string} email - Invitee's email address
   * @param {object} invitationData - Invitation details
   * @param {string} invitationData.teamName - Team name
   * @param {string} invitationData.inviterName - Name of person sending invitation (optional)
   * @param {string} invitationData.inviterEmail - Email of person sending invitation
   * @param {string} invitationData.role - Role being assigned (candidate, mentor, etc.)
   * @param {string} invitationData.invitationToken - Invitation token
   * @returns {Promise<void>}
   */
  async sendTeamInvitation(email, invitationData) {
    const { teamName, inviterName, inviterEmail, role, invitationToken } = invitationData;
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const acceptUrl = `${appUrl}/collaboration/teams/accept-invite?token=${invitationToken}`;
    
    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== TEAM INVITATION EMAIL ==========');
      console.log(`To: ${email}`);
      console.log('Subject: Team Invitation - ATS Tracker');
      console.log(`\nYou've been invited to join the team: ${teamName}`);
      if (inviterName) {
        console.log(`Invited by: ${inviterName} (${inviterEmail})`);
      } else {
        console.log(`Invited by: ${inviterEmail}`);
      }
      console.log(`Role: ${role}`);
      console.log('\nClick the link below to accept the invitation:');
      console.log(acceptUrl);
      console.log('\nThis invitation will expire in 7 days.');
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
      subject: `Team Invitation: ${teamName} - ATS Tracker`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6A94EE;">You've Been Invited to Join a Team</h2>
          <p>You've been invited to join the team <strong>${teamName}</strong> on ATS Tracker.</p>
          
          <div style="background: #F3F4F6; border-left: 4px solid #6A94EE; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #1F2937; font-size: 16px; margin: 8px 0;"><strong>Team:</strong> ${teamName}</p>
            ${inviterName 
              ? `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Invited by:</strong> ${inviterName} (${inviterEmail})</p>`
              : `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Invited by:</strong> ${inviterEmail}</p>`
            }
            <p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Role:</strong> ${role}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" 
               style="background: linear-gradient(to right, #6A94EE, #916BE3); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">
            This invitation will expire in 7 days. If you don't have an account yet, you'll be prompted to create one when you accept.
          </p>
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Team invitation email sent to:', email);
    } catch (error) {
      console.error('❌ Error sending team invitation email:', error);
      // Don't throw - invitation is still created even if email fails
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
   * Send referral request notification email to contact
   * @param {string} contactEmail - Contact's email address
   * @param {Object} referralDetails - Referral request details
   * @returns {Promise<void>}
   */
  async sendReferralRequestNotification(contactEmail, referralDetails) {
    const {
      contactName,
      requesterName,
      jobTitle,
      jobCompany,
      jobLocation,
      personalizedMessage,
    } = referralDetails;

    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== REFERRAL REQUEST EMAIL ==========');
      console.log(`To: ${contactEmail}`);
      console.log(`Subject: Referral Request: ${jobTitle} at ${jobCompany}`);
      console.log(`\nDear ${contactName || 'Contact'},`);
      console.log(`\n${requesterName || 'A colleague'} has requested a referral for the following position:`);
      console.log(`\nPosition: ${jobTitle}`);
      console.log(`Company: ${jobCompany}`);
      if (jobLocation) {
        console.log(`Location: ${jobLocation}`);
      }
      if (personalizedMessage) {
        console.log(`\nMessage:\n${personalizedMessage}`);
      }
      console.log('\n============================================\n');
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
      to: contactEmail,
      subject: `Referral Request: ${jobTitle} at ${jobCompany}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3351FD;">Referral Request</h2>
          <p>Dear ${contactName || 'Contact'},</p>
          
          <p>${requesterName || 'A colleague'} has requested a referral for the following position:</p>
          
          <div style="background: #F3F4F6; border-left: 4px solid #3351FD; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1F2937; margin-top: 0; font-size: 20px;">${jobTitle}</h3>
            <p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Company:</strong> ${jobCompany}</p>
            ${jobLocation ? `<p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Location:</strong> ${jobLocation}</p>` : ''}
          </div>
          
          ${personalizedMessage ? `
          <div style="background: #FFFFFF; border: 1px solid #E5E7EB; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #1F2937; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${personalizedMessage.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/network/referrals?tab=write" 
               style="background: linear-gradient(to right, #3351FD, #2a43d4); 
                      color: white; 
                      padding: 14px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: 600;
                      font-size: 16px;">
              Write Referral Template
            </a>
          </div>
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            This is an automated notification from ATS Tracker. Please respond directly to ${requesterName || 'the requester'} to proceed with the referral.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Referral request email sent to:', contactEmail);
    } catch (error) {
      console.error('❌ Error sending referral request email:', error);
      
      // Check for Gmail quota/rate limit errors
      const errorMessage = error?.message || error?.response || String(error);
      const isQuotaError = 
        errorMessage?.toLowerCase().includes('quota') ||
        errorMessage?.toLowerCase().includes('daily sending limit') ||
        errorMessage?.toLowerCase().includes('rate limit') ||
        error?.responseCode === 550 ||
        error?.code === 'EAUTH' ||
        error?.code === 'EENVELOPE';
      
      if (isQuotaError) {
        const quotaError = new Error('Gmail daily sending quota exceeded. Please try again tomorrow or use a different email account.');
        quotaError.code = 'EMAIL_QUOTA_EXCEEDED';
        throw quotaError;
      }
      
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

  /**
   * Send gratitude message email to contact
   * @param {string} contactEmail - Contact's email address
   * @param {Object} gratitudeDetails - Gratitude message details
   * @returns {Promise<void>}
   */
  async sendGratitudeMessage(contactEmail, gratitudeDetails) {
    const {
      contactName,
      requesterName,
      jobTitle,
      jobCompany,
      message,
    } = gratitudeDetails;

    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== GRATITUDE MESSAGE EMAIL ==========');
      console.log(`To: ${contactEmail}`);
      console.log(`Subject: Thank You for Your Referral`);
      console.log(`\nDear ${contactName || 'Contact'},`);
      console.log(`\n${message}`);
      console.log('\n============================================\n');
      return;
    }

    // Production mode - use nodemailer
    if (!this.transporter) {
      console.error('❌ Email service not initialized');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@atstracker.com',
      to: contactEmail,
      subject: `Thank You for Your Referral${jobTitle ? `: ${jobTitle} at ${jobCompany}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3351FD;">Thank You for Your Referral</h2>
          <p>Dear ${contactName || 'Contact'},</p>
          
          <div style="background: #FFFFFF; border: 1px solid #E5E7EB; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #1F2937; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          ${jobTitle ? `
          <div style="background: #F3F4F6; border-left: 4px solid #3351FD; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="color: #4B5563; font-size: 14px; margin: 0;"><strong>Position:</strong> ${jobTitle}</p>
            ${jobCompany ? `<p style="color: #4B5563; font-size: 14px; margin: 8px 0 0 0;"><strong>Company:</strong> ${jobCompany}</p>` : ''}
          </div>
          ` : ''}
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            Best regards,<br>
            ${requesterName || 'A colleague'}
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Gratitude message email sent to:', contactEmail);
    } catch (error) {
      console.error('❌ Error sending gratitude message email:', error);
      
      // Check for Gmail quota/rate limit errors
      const errorMessage = error?.message || error?.response || String(error);
      const isQuotaError = 
        errorMessage?.toLowerCase().includes('quota') ||
        errorMessage?.toLowerCase().includes('daily sending limit') ||
        errorMessage?.toLowerCase().includes('rate limit') ||
        error?.responseCode === 550 ||
        error?.code === 'EAUTH' ||
        error?.code === 'EENVELOPE';
      
      if (isQuotaError) {
        const quotaError = new Error('Gmail daily sending quota exceeded. Please try again tomorrow or use a different email account.');
        quotaError.code = 'EMAIL_QUOTA_EXCEEDED';
        throw quotaError;
      }
      
      throw error;
    }
  }

  /**
   * Send referral letter notification email to requester
   * @param {string} requesterEmail - Requester's email address
   * @param {Object} referralDetails - Referral letter details
   * @returns {Promise<void>}
   */
  async sendReferralLetterNotification(requesterEmail, referralDetails) {
    const {
      writerName,
      jobTitle,
      jobCompany,
      referralLetter,
    } = referralDetails;

    // Development mode - log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========== REFERRAL LETTER EMAIL ==========');
      console.log(`To: ${requesterEmail}`);
      console.log(`Subject: Referral Letter for ${jobTitle} at ${jobCompany}`);
      console.log(`\nDear ${requesterEmail},`);
      console.log(`\n${writerName || 'Your contact'} has provided a referral letter for the following position:`);
      console.log(`\nPosition: ${jobTitle}`);
      console.log(`Company: ${jobCompany}`);
      if (referralLetter) {
        console.log(`\nReferral Letter:\n${referralLetter}`);
      }
      console.log('\n============================================\n');
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
      to: requesterEmail,
      subject: `Referral Letter: ${jobTitle} at ${jobCompany}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3351FD;">Referral Letter Received</h2>
          <p>Dear ${requesterEmail},</p>
          
          <p>${writerName || 'Your contact'} has provided a referral letter for the following position:</p>
          
          <div style="background: #F3F4F6; border-left: 4px solid #3351FD; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1F2937; margin-top: 0; font-size: 20px;">${jobTitle}</h3>
            <p style="color: #4B5563; font-size: 16px; margin: 8px 0;"><strong>Company:</strong> ${jobCompany}</p>
          </div>
          
          ${referralLetter ? `
          <div style="background: #FFFFFF; border: 1px solid #E5E7EB; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1F2937; margin-top: 0; font-size: 18px;">Referral Letter</h3>
            <p style="color: #1F2937; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${referralLetter.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/network/referrals" 
               style="background: linear-gradient(to right, #3351FD, #2a43d4); 
                      color: white; 
                      padding: 14px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block;
                      font-weight: 600;
                      font-size: 16px;">
              View in ATS Tracker
            </a>
          </div>
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 12px;">
            This is an automated notification from ATS Tracker. Thank you for using our platform.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Referral letter email sent to:', requesterEmail);
    } catch (error) {
      console.error('❌ Error sending referral letter email:', error);
      throw error;
    }
  }
}

export default new EmailService();