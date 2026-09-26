const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#1a73e8',
  secondary: '#0d47a1',
  text: '#333333',
  lightText: '#666666',
  border: '#e0e0e0',
  background: '#f8f9fe',
  success: '#2e7d32',
  white: '#ffffff'
};

const drawHeader = (doc, hospitalName = 'Smart Hospital Management System') => {
  // Header background
  doc.rect(0, 0, doc.page.width, 100).fill(COLORS.primary);

  // Hospital name
  doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.white)
    .text('🏥 ' + hospitalName, 40, 30, { align: 'left' });

  doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.8)')
    .text('Your Health, Our Priority', 40, 58);

  doc.moveTo(0, 100).lineTo(doc.page.width, 100).stroke(COLORS.border);
  doc.y = 120;
};

const drawSectionTitle = (doc, title) => {
  doc.moveDown(0.5);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.primary).text(title);
  doc.moveTo(40, doc.y + 2).lineTo(doc.page.width - 40, doc.y + 2).stroke(COLORS.primary);
  doc.moveDown(0.5);
};

const drawInfoRow = (doc, label, value, x = 40, y = null) => {
  const rowY = y || doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.lightText).text(label + ':', x, rowY, { continued: true, width: 130 });
  doc.font('Helvetica').fillColor(COLORS.text).text(' ' + (value || 'N/A'));
};

const drawFooter = (doc) => {
  const pageHeight = doc.page.height;
  doc.y = pageHeight - 80;
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke(COLORS.border);
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.lightText)
    .text('⚠️ This is a computer-generated document. Always follow your doctor\'s instructions. Do not self-medicate.', 40, doc.y, { align: 'center' })
    .text(`Generated on: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })} | Smart Hospital Management System`, { align: 'center' });
};

const pdfService = {
  generatePrescription(prescription) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        drawHeader(doc);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.secondary)
          .text('PRESCRIPTION', 40, doc.y, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor(COLORS.lightText)
          .text(`Prescription ID: ${prescription.id}`, { align: 'center' });
        doc.moveDown(1);

        // Patient & Doctor Info
        drawSectionTitle(doc, 'Patient Information');
        const startY = doc.y;
        drawInfoRow(doc, 'Name', `${prescription.patient_name}`, 40);
        drawInfoRow(doc, 'Gender', prescription.gender, 40);
        drawInfoRow(doc, 'Date of Birth', prescription.date_of_birth ? new Date(prescription.date_of_birth).toLocaleDateString('en-IN') : null, 40);
        drawInfoRow(doc, 'Blood Group', prescription.blood_group, 40);
        if (prescription.allergies && prescription.allergies.length > 0) {
          drawInfoRow(doc, 'Allergies', prescription.allergies.join(', '), 40);
        }

        drawSectionTitle(doc, 'Prescribed By');
        drawInfoRow(doc, 'Doctor', `Dr. ${prescription.doctor_name}`, 40);
        drawInfoRow(doc, 'Specialization', prescription.specialization, 40);
        drawInfoRow(doc, 'Department', prescription.department_name, 40);
        drawInfoRow(doc, 'Registration No.', prescription.registration_number, 40);
        drawInfoRow(doc, 'Date', new Date(prescription.created_at).toLocaleDateString('en-IN'), 40);
        if (prescription.valid_until) {
          drawInfoRow(doc, 'Valid Until', new Date(prescription.valid_until).toLocaleDateString('en-IN'), 40);
        }

        // Medicines Table
        drawSectionTitle(doc, 'Prescribed Medicines');
        doc.moveDown(0.3);

        if (prescription.medicines && prescription.medicines.length > 0) {
          // Table header
          const tableTop = doc.y;
          const colWidths = [30, 150, 90, 100, 80, 80];
          const cols = [40, 70, 220, 310, 410, 490];
          const headers = ['#', 'Medicine Name', 'Dosage', 'Frequency', 'Duration', 'Qty'];

          doc.rect(40, tableTop, doc.page.width - 80, 22).fill('#e3f2fd');
          headers.forEach((h, i) => {
            doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.secondary)
              .text(h, cols[i], tableTop + 6, { width: colWidths[i] });
          });

          doc.y = tableTop + 22;

          prescription.medicines.forEach((med, idx) => {
            const rowY = doc.y;
            if (idx % 2 === 0) doc.rect(40, rowY, doc.page.width - 80, 22).fill('#f8f9fe');

            const values = [
              String(idx + 1),
              med.name,
              med.dosage || '-',
              med.frequency || '-',
              med.duration || '-',
              String(med.quantity || '-')
            ];
            values.forEach((v, i) => {
              doc.fontSize(9).font('Helvetica').fillColor(COLORS.text)
                .text(v, cols[i], rowY + 6, { width: colWidths[i] });
            });
            doc.y = rowY + 22;
          });
        } else {
          doc.fontSize(10).fillColor(COLORS.lightText).text('No medicines prescribed.', { italic: true });
        }

        // Notes
        if (prescription.notes) {
          doc.moveDown(1);
          drawSectionTitle(doc, 'Doctor\'s Notes');
          doc.fontSize(10).font('Helvetica').fillColor(COLORS.text).text(prescription.notes, 40, doc.y, {
            width: doc.page.width - 80
          });
        }

        // Doctor signature area
        doc.moveDown(2);
        doc.moveTo(doc.page.width - 180, doc.y).lineTo(doc.page.width - 40, doc.y).stroke(COLORS.text);
        doc.fontSize(10).text(`Dr. ${prescription.doctor_name}`, doc.page.width - 180, doc.y + 5, { width: 140, align: 'center' });
        doc.fontSize(9).fillColor(COLORS.lightText).text('Authorized Signature', doc.page.width - 180, doc.y + 3, { width: 140, align: 'center' });

        drawFooter(doc);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  generateInvoice(bill) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        drawHeader(doc);

        doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.secondary)
          .text('INVOICE', 40, doc.y, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).font('Helvetica').fillColor(COLORS.lightText)
          .text(`Bill No: ${bill.bill_number}`, { align: 'center' });
        doc.moveDown(1);

        drawSectionTitle(doc, 'Bill To');
        drawInfoRow(doc, 'Patient Name', bill.patient_name);
        drawInfoRow(doc, 'Email', bill.patient_email);
        drawInfoRow(doc, 'Phone', bill.patient_phone);
        drawInfoRow(doc, 'Invoice Date', new Date(bill.created_at).toLocaleDateString('en-IN'));
        if (bill.due_date) drawInfoRow(doc, 'Due Date', new Date(bill.due_date).toLocaleDateString('en-IN'));

        drawSectionTitle(doc, 'Charges Breakdown');
        const charges = [
          ['Consultation Charge', bill.consultation_charge],
          ['Lab Charges', bill.lab_charges],
          ['Medication Charges', bill.medication_charges],
          ['Other Charges', bill.other_charges],
        ];

        charges.forEach(([label, amount]) => {
          if (parseFloat(amount) > 0) {
            const rowY = doc.y;
            doc.fontSize(10).font('Helvetica').fillColor(COLORS.text).text(label, 40, rowY, { width: 300 });
            doc.text(`₹${parseFloat(amount).toFixed(2)}`, 350, rowY, { width: 150, align: 'right' });
            doc.moveDown(0.4);
          }
        });

        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke(COLORS.border);
        doc.moveDown(0.3);

        if (parseFloat(bill.discount) > 0) {
          const dY = doc.y;
          doc.fontSize(10).fillColor(COLORS.success).text('Discount', 40, dY);
          doc.text(`-₹${parseFloat(bill.discount).toFixed(2)}`, 350, dY, { width: 150, align: 'right' });
          doc.moveDown(0.4);
        }

        const taxY = doc.y;
        doc.fontSize(10).fillColor(COLORS.lightText).text(`Tax (GST ${bill.tax_percentage}%)`, 40, taxY);
        doc.text(`₹${parseFloat(bill.tax_amount).toFixed(2)}`, 350, taxY, { width: 150, align: 'right' });
        doc.moveDown(0.4);

        doc.rect(40, doc.y, doc.page.width - 80, 30).fill('#e3f2fd');
        const totalY = doc.y + 8;
        doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.secondary)
          .text('TOTAL AMOUNT', 50, totalY);
        doc.text(`₹${parseFloat(bill.total_amount).toFixed(2)}`, 350, totalY, { width: 145, align: 'right' });
        doc.moveDown(2.5);

        const statusColor = bill.status === 'paid' ? COLORS.success : '#c62828';
        doc.fontSize(12).font('Helvetica-Bold').fillColor(statusColor)
          .text(`Status: ${bill.status.toUpperCase()}`, { align: 'center' });

        drawFooter(doc);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
};

module.exports = pdfService;
