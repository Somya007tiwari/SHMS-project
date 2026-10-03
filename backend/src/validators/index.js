const { z } = require('zod');

// Password policy: At least 8 characters with at least one letter and one number
const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

// Auth validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address'),
    password: passwordPolicy,
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    phone: z.string().trim().optional(),
    role: z.enum(['patient', 'doctor', 'admin']).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address')
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordPolicy
  })
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordPolicy
  })
});

// Sensitive writes validation schemas
const createDoctorSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address'),
    password: passwordPolicy,
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    specialization: z.string().trim().min(1, 'Specialization is required'),
    qualification: z.string().trim().optional(),
    experienceYears: z.coerce.number().min(0).optional(),
    consultationFee: z.coerce.number().min(0).optional(),
    departmentId: z.string().uuid('Invalid department ID').optional().nullable(),
    phone: z.string().trim().optional(),
    bio: z.string().trim().optional()
  })
});

const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid('Invalid doctor ID').optional(),
    patientId: z.string().uuid('Invalid patient ID').optional(),
    appointmentDate: z.string().min(1, 'Appointment date is required'),
    appointmentTime: z.string().min(1, 'Appointment time is required'),
    reason: z.string().trim().optional(),
    symptoms: z.string().trim().optional(),
    departmentId: z.string().uuid('Invalid department ID').optional()
  })
});

const createPrescriptionSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('Invalid patient ID').optional(),
    appointmentId: z.string().uuid('Invalid appointment ID').optional(),
    medicines: z.array(
      z.object({
        name: z.string().trim().min(1, 'Medicine name is required'),
        dosage: z.string().trim().optional(),
        frequency: z.string().trim().optional(),
        duration: z.string().trim().optional(),
        instructions: z.string().trim().optional()
      })
    ).optional(),
    notes: z.string().trim().optional()
  })
});

const createInvoiceSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('Invalid patient ID').optional(),
    consultationCharge: z.coerce.number().min(0).optional(),
    labCharges: z.coerce.number().min(0).optional(),
    medicationCharges: z.coerce.number().min(0).optional(),
    otherCharges: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    notes: z.string().trim().optional()
  })
});

const addPaymentSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive('Amount must be positive'),
    paymentMethod: z.enum(['cash', 'card', 'upi', 'insurance', 'online'], {
      errorMap: () => ({ message: 'Invalid payment method' })
    }),
    transactionId: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
});

const createLabOrderSchema = z.object({
  body: z.object({
    patientId: z.string().uuid('Invalid patient ID').optional(),
    testId: z.string().uuid('Invalid test ID').optional(),
    notes: z.string().trim().optional()
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createDoctorSchema,
  createAppointmentSchema,
  createPrescriptionSchema,
  createInvoiceSchema,
  addPaymentSchema,
  createLabOrderSchema
};
