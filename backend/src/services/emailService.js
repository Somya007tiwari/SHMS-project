const { transporter } = require('../config/email');

const FROM = process.env.EMAIL_FROM || 'Smart Hospital <noreply@smarthospital.com>';

const emailStyles = `
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fe; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); padding: 32px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
  .body { padding: 32px; color: #333; }
  .body h2 { color: #1a73e8; margin-top: 0; font-size: 20px; }
  .info-box { background: #f0f4ff; border-left: 4px solid #1a73e8; padding: 16px; border-radius: 4px; margin: 20px 0; }
  .info-row { display: flex; margin: 8px 0; }
  .info-label { font-weight: 600; color: #555; min-width: 140px; }
  .info-value { color: #333; }
  .btn { display: inline-block; background: linear-gradient(135deg, #1a73e8, #0d47a1); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; font-size: 15px; }
  .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 13px; }
  .status-approved { background: #e8f5e9; color: #2e7d32; }
  .status-rejected { background: #ffebee; color: #c62828; }
  .footer { background: #f8f9fc; padding: 20px 32px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
  .disclaimer { background: #fff3e0; border: 1px solid #ffcc02; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 12px; color: #856404; }
`;

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${emailStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Smart Hospital Management System</h1>
      <p>Your Health, Our Priority</p>
    </div>
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} Smart Hospital Management System. All rights reserved.</p>
      <p>This is an automated email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>
`;

const isPlaceholderEmail = !process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email') || process.env.EMAIL_USER.includes('your-email') || process.env.EMAIL_USER === 'placeholder';

const checkEmailConfig = () => {
  if (isPlaceholderEmail) {
    console.warn('⚠️ [Email Service Warning] EMAIL_USER is missing or placeholder in .env. Real email sending is skipped; in-app notifications will continue working.');
  }
};

const sendEmail = async ({ to, subject, html }) => {
  if (isPlaceholderEmail) {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    return { messageId: 'mock-' + Date.now() };
  }

  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    return info;
  } catch (error) {
    console.error('Email send error:', error.message);
    // Don't throw - email failures shouldn't break the request
    return null;
  }
};

const emailService = {
  async sendWelcome({ email, name, role }) {
    return sendEmail({
      to: email,
      subject: '🎉 Welcome to Smart Hospital Management System',
      html: baseTemplate(`
        <div class="body">
          <h2>Welcome, ${name}!</h2>
          <p>Your account has been successfully created as a <strong>${role}</strong>.</p>
          <p>You can now access our comprehensive healthcare management platform.</p>
          <a href="${process.env.FRONTEND_URL}/login" class="btn">Login to Your Account</a>
          <div class="disclaimer">
            If you did not create this account, please contact our support team immediately.
          </div>
        </div>
      `)
    });
  },

  async sendPasswordReset({ email, name, resetUrl, expiresIn = '1 hour' }) {
    return sendEmail({
      to: email,
      subject: '🔐 Password Reset Request',
      html: baseTemplate(`
        <div class="body">
          <h2>Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" class="btn">Reset Password</a>
          <p style="color:#888;font-size:13px;">This link will expire in <strong>${expiresIn}</strong>.</p>
          <div class="disclaimer">
            If you did not request a password reset, please ignore this email. Your password will remain unchanged.
          </div>
        </div>
      `)
    });
  },

  async sendAppointmentConfirmation({ email, patientName, doctorName, department, date, time, reason }) {
    return sendEmail({
      to: email,
      subject: '📅 Appointment Booked Successfully',
      html: baseTemplate(`
        <div class="body">
          <h2>Appointment Confirmed!</h2>
          <p>Hi ${patientName}, your appointment has been booked successfully.</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">Doctor:</span><span class="info-value">Dr. ${doctorName}</span></div>
            <div class="info-row"><span class="info-label">Department:</span><span class="info-value">${department || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${date}</span></div>
            <div class="info-row"><span class="info-label">Time:</span><span class="info-value">${time}</span></div>
            <div class="info-row"><span class="info-label">Reason:</span><span class="info-value">${reason || 'General Consultation'}</span></div>
          </div>
          <p style="color:#888;font-size:13px;">Your appointment is <strong>pending approval</strong> from the doctor.</p>
          <a href="${process.env.FRONTEND_URL}/patient/appointments" class="btn">View Appointments</a>
        </div>
      `)
    });
  },

  async sendAppointmentStatusUpdate({ email, patientName, doctorName, date, time, status, rejectionReason }) {
    const isApproved = status === 'approved';
    return sendEmail({
      to: email,
      subject: `🔔 Appointment ${isApproved ? 'Approved' : 'Rejected'}`,
      html: baseTemplate(`
        <div class="body">
          <h2>Appointment Status Update</h2>
          <p>Hi ${patientName},</p>
          <p>Your appointment with Dr. ${doctorName} on ${date} at ${time} has been:</p>
          <p><span class="status-badge ${isApproved ? 'status-approved' : 'status-rejected'}">
            ${isApproved ? '✅ Approved' : '❌ Rejected'}
          </span></p>
          ${rejectionReason ? `<div class="info-box"><strong>Reason:</strong> ${rejectionReason}</div>` : ''}
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/appointments" class="btn">View Appointments</a>
        </div>
      `)
    });
  },

  async sendAppointmentCancelled({ email, name, otherPartyName, date, time, isDoctor }) {
    return sendEmail({
      to: email,
      subject: '🚫 Appointment Cancelled',
      html: baseTemplate(`
        <div class="body">
          <h2>Appointment Cancelled</h2>
          <p>Hi ${name},</p>
          <p>The appointment scheduled on <strong>${date} at ${time}</strong> with ${isDoctor ? 'Patient ' : 'Dr. '}${otherPartyName} has been cancelled.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/${isDoctor ? 'doctor' : 'patient'}/appointments" class="btn">View Appointments</a>
        </div>
      `)
    });
  },

  async sendAppointmentRescheduled({ email, name, doctorName, newDate, newTime }) {
    return sendEmail({
      to: email,
      subject: '🔄 Appointment Rescheduled',
      html: baseTemplate(`
        <div class="body">
          <h2>Appointment Rescheduled</h2>
          <p>Hi ${name},</p>
          <p>Your appointment with Dr. ${doctorName} has been rescheduled to:</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">New Date:</span><span class="info-value">${newDate}</span></div>
            <div class="info-row"><span class="info-label">New Time:</span><span class="info-value">${newTime}</span></div>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/appointments" class="btn">View Appointment</a>
        </div>
      `)
    });
  },

  async sendDoctorLeaveAffected({ email, patientName, doctorName, leaveStartDate, leaveEndDate, date, time }) {
    return sendEmail({
      to: email,
      subject: '🗓️ Action Required: Doctor on Leave',
      html: baseTemplate(`
        <div class="body">
          <h2>Doctor Leave Notification</h2>
          <p>Hi ${patientName},</p>
          <p>Dr. ${doctorName} will be on leave from <strong>${leaveStartDate} to ${leaveEndDate}</strong>.</p>
          <p>Your appointment scheduled for <strong>${date} at ${time}</strong> needs to be rescheduled.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/appointments" class="btn">Reschedule Appointment Now</a>
        </div>
      `)
    });
  },

  async sendAppointmentReminder({ email, patientName, doctorName, date, time, hours, roomNumber }) {
    return sendEmail({
      to: email,
      subject: `⏰ Reminder: Upcoming Appointment in ${hours === 1 ? '1 Hour' : '24 Hours'}`,
      html: baseTemplate(`
        <div class="body">
          <h2>Upcoming Consultation Reminder</h2>
          <p>Hi ${patientName},</p>
          <p>This is a friendly reminder that you have an upcoming consultation in <strong>${hours === 1 ? '1 hour' : '24 hours'}</strong>.</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">Doctor:</span><span class="info-value">Dr. ${doctorName}</span></div>
            <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${date}</span></div>
            <div class="info-row"><span class="info-label">Time:</span><span class="info-value">${time}</span></div>
            ${roomNumber ? `<div class="info-row"><span class="info-label">Room:</span><span class="info-value">Room ${roomNumber}</span></div>` : ''}
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/appointments" class="btn">View Appointment Details</a>
        </div>
      `)
    });
  },

  async sendPrescriptionReady({ email, patientName, doctorName, prescriptionId }) {
    return sendEmail({
      to: email,
      subject: '💊 Prescription Ready for Download',
      html: baseTemplate(`
        <div class="body">
          <h2>Your Prescription is Ready</h2>
          <p>Hi ${patientName},</p>
          <p>Dr. ${doctorName} has created a prescription for you. You can download it from your patient portal.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/prescriptions/${prescriptionId}" class="btn">View Prescription</a>
          <div class="disclaimer">
            Always follow your doctor's instructions. Do not self-medicate.
          </div>
        </div>
      `)
    });
  },

  async sendPaymentConfirmation({ email, patientName, billNumber, amount, paymentMethod }) {
    return sendEmail({
      to: email,
      subject: '✅ Payment Confirmed',
      html: baseTemplate(`
        <div class="body">
          <h2>Payment Successful</h2>
          <p>Hi ${patientName},</p>
          <p>Your payment has been processed successfully.</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">Bill Number:</span><span class="info-value">${billNumber}</span></div>
            <div class="info-row"><span class="info-label">Amount Paid:</span><span class="info-value">₹${amount}</span></div>
            <div class="info-row"><span class="info-label">Payment Method:</span><span class="info-value">${paymentMethod}</span></div>
            <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${new Date().toLocaleDateString('en-IN')}</span></div>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/billing" class="btn">View Invoice</a>
        </div>
      `)
    });
  },
  checkEmailConfig
};

module.exports = emailService;
