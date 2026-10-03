const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');
const QRCode = require('qrcode');

const generatePrescriptionPDF = async (prescription, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  const filename = `prescription-${prescription.prescription_number || 'details'}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // 1. Header (Hospital Banner)
  doc
    .rect(40, 40, 515, 65)
    .fill('#1E3A5F');

  doc
    .fillColor('#FFFFFF')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('SMART HOSPITAL MANAGEMENT SYSTEM', 55, 55);

  doc
    .fontSize(9)
    .font('Helvetica')
    .text('Healthcare Excellence & Digital Care', 55, 78);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`PRESCRIPTION: ${prescription.prescription_number}`, 380, 55, { align: 'right' })
    .text(`Date: ${dayjs(prescription.created_at).format('MMM D, YYYY')}`, 380, 75, { align: 'right' });

  // 2. Doctor Info & Patient Info Grid
  let y = 120;

  // Doctor Box (Left)
  doc
    .rect(40, y, 250, 85)
    .strokeColor('#E2E8F0')
    .stroke();

  doc
    .fillColor('#1E3A5F')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(`Dr. ${prescription.doctor_name || 'N/A'}`, 50, y + 10);

  doc
    .fillColor('#475569')
    .fontSize(9)
    .font('Helvetica')
    .text(`Specialization: ${prescription.specialization || 'General Practice'}`, 50, y + 26)
    .text(`Qualification: ${prescription.qualification || 'MBBS'}`, 50, y + 39)
    .text(`Reg. No: ${prescription.registration_number || 'REG-MED-10023'}`, 50, y + 52)
    .text(`Room: ${prescription.room_number || 'Room 101'}`, 50, y + 65);

  // Patient Box (Right)
  doc
    .rect(305, y, 250, 85)
    .strokeColor('#E2E8F0')
    .stroke();

  let ageStr = 'N/A';
  if (prescription.date_of_birth) {
    const years = dayjs().diff(dayjs(prescription.date_of_birth), 'year');
    ageStr = `${years} yrs`;
  }

  doc
    .fillColor('#0F172A')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(`Patient: ${prescription.patient_name || 'N/A'}`, 315, y + 10);

  doc
    .fillColor('#475569')
    .fontSize(9)
    .font('Helvetica')
    .text(`Gender / Age: ${(prescription.gender || 'N/A').toUpperCase()} / ${ageStr}`, 315, y + 26)
    .text(`Blood Group: ${prescription.blood_group || 'N/A'}`, 315, y + 39)
    .text(`Phone: ${prescription.patient_phone || 'N/A'}`, 315, y + 52)
    .text(`Email: ${prescription.patient_email || 'N/A'}`, 315, y + 65);

  y += 100;

  // 3. Diagnosis & Allergy Section
  doc
    .fillColor('#1E3A5F')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('DIAGNOSIS:', 40, y);

  doc
    .fillColor('#0F172A')
    .fontSize(10)
    .font('Helvetica')
    .text(prescription.diagnosis || 'Clinical evaluation', 120, y);

  if (prescription.allergies) {
    y += 18;
    doc
      .fillColor('#D97706')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Known Allergies:', 40, y);

    doc
      .fillColor('#92400E')
      .fontSize(9)
      .font('Helvetica')
      .text(prescription.allergies, 120, y);
  }

  y += 25;

  // 4. Rx Symbol & Medicines Table Header
  doc
    .fillColor('#1E3A5F')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Rx (Prescribed Medicines)', 40, y);

  y += 22;

  // Table Headers
  doc
    .rect(40, y, 515, 22)
    .fill('#3B82F6');

  doc
    .fillColor('#FFFFFF')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('#', 45, y + 6)
    .text('Medicine Name', 65, y + 6)
    .text('Dosage', 210, y + 6)
    .text('Frequency', 280, y + 6)
    .text('Duration', 350, y + 6)
    .text('Timing', 410, y + 6)
    .text('Instructions', 470, y + 6);

  y += 22;

  // Medicines Rows
  const items = prescription.items || [];
  doc.font('Helvetica').fontSize(9);

  items.forEach((item, index) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }

    const rowBg = index % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    doc
      .rect(40, y, 515, 24)
      .fill(rowBg);

    doc
      .fillColor('#334155')
      .text(`${index + 1}`, 45, y + 7)
      .font('Helvetica-Bold')
      .text(item.medicine_name, 65, y + 7, { width: 140, height: 16, ellipsis: true })
      .font('Helvetica')
      .text(item.dosage, 210, y + 7, { width: 65, ellipsis: true })
      .text(item.frequency, 280, y + 7, { width: 65, ellipsis: true })
      .text(`${item.duration_days} days`, 350, y + 7, { width: 55, ellipsis: true })
      .text(item.timing || 'After food', 410, y + 7, { width: 55, ellipsis: true })
      .text(item.instructions || '-', 470, y + 7, { width: 80, ellipsis: true });

    y += 24;
  });

  y += 15;

  // 5. Advice & Follow Up
  if (y > 700) {
    doc.addPage();
    y = 50;
  }

  if (prescription.advice) {
    doc
      .fillColor('#1E3A5F')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Doctor\'s Advice / Special Instructions:', 40, y);

    y += 14;

    doc
      .fillColor('#334155')
      .fontSize(9)
      .font('Helvetica')
      .text(prescription.advice, 40, y, { width: 515 });

    y += doc.heightOfString(prescription.advice, { width: 515 }) + 10;
  }

  if (prescription.follow_up_date) {
    doc
      .fillColor('#1D4ED8')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Follow-up Visit Date: ${dayjs(prescription.follow_up_date).format('MMMM D, YYYY')}`, 40, y);

    y += 25;
  }

  // 6. Doctor Signature & Verification QR Block
  if (y > 700) {
    doc.addPage();
    y = 50;
  } else {
    y = Math.max(y + 20, 675);
  }

  // QR Code on bottom left
  if (prescription.verification_code) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verifyUrl = `${frontendUrl}/verify/${prescription.verification_code}`;
      const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 70, margin: 1 });
      doc.image(qrBuffer, 45, y - 35, { width: 55 });
      doc
        .fillColor('#64748B')
        .fontSize(7)
        .font('Helvetica')
        .text('Scan to Verify', 45, y + 23, { width: 55, align: 'center' });
    } catch (err) {
      console.error('QR code generation error:', err.message);
    }
  }

  // Doctor Signature Image on bottom right
  if (prescription.signature_url) {
    try {
      let sigPath = null;
      if (prescription.signature_url.includes('/uploads/')) {
        const rel = prescription.signature_url.split('/uploads/')[1];
        sigPath = path.join(__dirname, '../../uploads', rel);
      }
      if (sigPath && fs.existsSync(sigPath)) {
        doc.image(sigPath, 425, y - 35, { fit: [80, 30], align: 'center' });
      }
    } catch (err) {
      console.error('Signature embed error:', err.message);
    }
  }

  doc
    .strokeColor('#CBD5E1')
    .lineWidth(1)
    .moveTo(380, y)
    .lineTo(550, y)
    .stroke();

  doc
    .fillColor('#1E3A5F')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`Dr. ${prescription.doctor_name || 'Medical Officer'}`, 380, y + 5, { align: 'center', width: 170 })
    .fillColor('#64748B')
    .fontSize(8)
    .font('Helvetica')
    .text('Authorized Signature & Stamp', 380, y + 18, { align: 'center', width: 170 });

  // 7. Footer
  doc
    .rect(40, 765, 515, 25)
    .fill('#F1F5F9');

  doc
    .fillColor('#64748B')
    .fontSize(8)
    .font('Helvetica')
    .text('This prescription is computer generated. Take medicines only as advised by your doctor.', 45, 773, { align: 'center', width: 505 });

  doc.end();
};

module.exports = { generatePrescriptionPDF };
