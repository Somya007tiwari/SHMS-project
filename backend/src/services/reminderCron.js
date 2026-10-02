const cron = require('node-cron');
const { query } = require('../config/database');
const notificationService = require('./notificationService');
const emailService = require('./emailService');

let cronTask = null;

const checkAndSendReminders = async () => {
  try {
    // 1. Fetch appointments for 24-hour reminders
    const res24h = await query(
      `SELECT a.id, a.appointment_date, a.appointment_time,
              pu.id as patient_user_id, pu.email as patient_email,
              pu.first_name || ' ' || pu.last_name as patient_name,
              du.first_name || ' ' || du.last_name as doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       WHERE a.status = 'approved'
         AND (a.reminder_24h_sent IS FALSE OR a.reminder_24h_sent IS NULL)
         AND (a.appointment_date || ' ' || a.appointment_time)::timestamp 
             BETWEEN (NOW() + INTERVAL '23 hours') AND (NOW() + INTERVAL '25 hours')`
    );

    for (const app of res24h.rows) {
      const dateStr = String(app.appointment_date).substring(0, 10);
      const timeStr = String(app.appointment_time).substring(0, 5);

      Promise.all([
        notificationService.appointmentReminder({
          patientUserId: app.patient_user_id,
          doctorName: app.doctor_name,
          date: dateStr,
          time: timeStr,
          hours: 24,
          appointmentId: app.id
        }),
        emailService.sendAppointmentReminder({
          email: app.patient_email,
          patientName: app.patient_name,
          doctorName: app.doctor_name,
          date: dateStr,
          time: timeStr,
          hours: 24
        })
      ]).catch((err) => console.error(`[Cron] Error sending 24h reminder for ${app.id}:`, err.message));

      await query(`UPDATE appointments SET reminder_24h_sent = TRUE WHERE id = $1`, [app.id]);
    }

    // 2. Fetch appointments for 1-hour reminders
    const res1h = await query(
      `SELECT a.id, a.appointment_date, a.appointment_time,
              pu.id as patient_user_id, pu.email as patient_email,
              pu.first_name || ' ' || pu.last_name as patient_name,
              du.first_name || ' ' || du.last_name as doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors doc ON a.doctor_id = doc.id
       JOIN users du ON doc.user_id = du.id
       WHERE a.status = 'approved'
         AND (a.reminder_1h_sent IS FALSE OR a.reminder_1h_sent IS NULL)
         AND (a.appointment_date || ' ' || a.appointment_time)::timestamp 
             BETWEEN NOW() AND (NOW() + INTERVAL '1 hour 30 minutes')`
    );

    for (const app of res1h.rows) {
      const dateStr = String(app.appointment_date).substring(0, 10);
      const timeStr = String(app.appointment_time).substring(0, 5);

      Promise.all([
        notificationService.appointmentReminder({
          patientUserId: app.patient_user_id,
          doctorName: app.doctor_name,
          date: dateStr,
          time: timeStr,
          hours: 1,
          appointmentId: app.id
        }),
        emailService.sendAppointmentReminder({
          email: app.patient_email,
          patientName: app.patient_name,
          doctorName: app.doctor_name,
          date: dateStr,
          time: timeStr,
          hours: 1
        })
      ]).catch((err) => console.error(`[Cron] Error sending 1h reminder for ${app.id}:`, err.message));

      await query(`UPDATE appointments SET reminder_1h_sent = TRUE WHERE id = $1`, [app.id]);
    }
  } catch (err) {
    console.error('[Cron] Error in checkAndSendReminders:', err.message);
  }
};

const startReminderCron = () => {
  if (process.env.ENABLE_CRON === 'false') {
    console.log('[Cron] Reminder cron is disabled via ENABLE_CRON=false');
    return;
  }

  if (cronTask) {
    return; // Already started
  }

  console.log('[Cron] Starting appointment reminder cron service (every 15 mins)...');
  
  // Run once on startup after 10s delay to catch any pending reminders
  setTimeout(() => {
    checkAndSendReminders();
  }, 10000);

  // Schedule every 15 minutes
  cronTask = cron.schedule('*/15 * * * *', () => {
    checkAndSendReminders();
  });
};

module.exports = {
  startReminderCron,
  checkAndSendReminders
};
