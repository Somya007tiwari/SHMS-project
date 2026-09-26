module.exports = {
  ROLES: {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    PATIENT: 'patient'
  },
  APPOINTMENT_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  BILL_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    PARTIALLY_PAID: 'partially_paid',
    CANCELLED: 'cancelled'
  },
  NOTIFICATION_TYPES: {
    APPOINTMENT_BOOKED: 'appointment_booked',
    APPOINTMENT_APPROVED: 'appointment_approved',
    APPOINTMENT_REJECTED: 'appointment_rejected',
    APPOINTMENT_CANCELLED: 'appointment_cancelled',
    APPOINTMENT_COMPLETED: 'appointment_completed',
    PRESCRIPTION_GENERATED: 'prescription_generated',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    REPORT_UPLOADED: 'report_uploaded',
    SYSTEM: 'system'
  },
  LAB_TEST_TYPES: [
    'blood_test', 'xray', 'mri', 'ct_scan', 'ultrasound', 'ecg', 'urine_test', 'other'
  ],
  DAYS_OF_WEEK: [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ],
  BLOOD_GROUPS: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
  DEFAULT_SLOT_DURATION: 30,
  DEFAULT_TAX_PERCENTAGE: 18,
  MAX_FILE_SIZE_MB: 10
};
