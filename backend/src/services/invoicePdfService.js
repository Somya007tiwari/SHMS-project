const PDFDocument = require('pdfkit');

class InvoicePdfService {
  static generatePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', buffer => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', err => reject(err));

        // ─── Header ──────────────────────────────────────────────────────────
        doc.fillColor('#1a73e8')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text('SMART HOSPITAL MANAGEMENT SYSTEM', 40, 40);

        doc.fillColor('#555555')
           .fontSize(10)
           .font('Helvetica')
           .text('123 Healthcare Blvd, Medical District, Mumbai 400001', 40, 65)
           .text('Phone: +91-9876543210 | Email: info@smarthospital.com', 40, 78);

        doc.moveTo(40, 96).lineTo(555, 96).strokeColor('#e0e0e0').lineWidth(1).stroke();

        // ─── Invoice Meta Box ───────────────────────────────────────────────
        doc.fillColor('#000000')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('INVOICE', 40, 110);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`Invoice No: ${invoice.invoice_number}`, 40, 132)
           .text(`Date: ${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-IN') : 'N/A'}`, 40, 146)
           .text(`Status: ${(invoice.status || 'pending').toUpperCase()}`, 40, 160);

        // ─── Patient & Doctor Info ─────────────────────────────────────────
        doc.font('Helvetica-Bold').fontSize(11).text('PATIENT DETAILS', 300, 110);
        doc.font('Helvetica').fontSize(10)
           .text(`Name: ${invoice.patient_name || 'N/A'}`, 300, 126)
           .text(`Email: ${invoice.patient_email || 'N/A'}`, 300, 140)
           .text(`Phone: ${invoice.patient_phone || 'N/A'}`, 300, 154);

        if (invoice.doctor_name) {
          doc.font('Helvetica-Bold').fontSize(11).text('ATTENDING DOCTOR', 300, 175);
          doc.font('Helvetica').fontSize(10)
             .text(`Dr. ${invoice.doctor_name}`, 300, 190)
             .text(`Specialization: ${invoice.doctor_specialization || 'General'}`, 300, 204);
        }

        doc.moveTo(40, 225).lineTo(555, 225).strokeColor('#e0e0e0').stroke();

        // ─── Items Table Header ─────────────────────────────────────────────
        let y = 240;
        doc.fillColor('#f4f6f8').rect(40, y, 515, 22).fill();
        doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9);

        doc.text('#', 45, y + 6, { width: 20 });
        doc.text('Item Description', 70, y + 6, { width: 210 });
        doc.text('Type', 285, y + 6, { width: 75 });
        doc.text('Qty', 365, y + 6, { width: 35, align: 'right' });
        doc.text('Unit Price', 405, y + 6, { width: 65, align: 'right' });
        doc.text('Amount', 475, y + 6, { width: 75, align: 'right' });

        y += 28;

        // ─── Items Table Rows ───────────────────────────────────────────────
        doc.font('Helvetica').fontSize(9).fillColor('#222222');
        const items = invoice.items || [];

        items.forEach((item, index) => {
          if (y > 700) {
            doc.addPage();
            y = 40;
          }

          const desc = item.description || 'Medical Service';
          const itemType = (item.item_type || 'other').toUpperCase();
          const qty = item.quantity || 1;
          const unitPrice = parseFloat(item.unit_price || 0).toFixed(2);
          const amount = parseFloat(item.amount || 0).toFixed(2);

          doc.text(`${index + 1}`, 45, y, { width: 20 });
          doc.text(desc, 70, y, { width: 210 });
          doc.text(itemType, 285, y, { width: 75 });
          doc.text(`${qty}`, 365, y, { width: 35, align: 'right' });
          doc.text(`Rs. ${unitPrice}`, 405, y, { width: 65, align: 'right' });
          doc.text(`Rs. ${amount}`, 475, y, { width: 75, align: 'right' });

          y += 18;
        });

        doc.moveTo(40, y + 5).lineTo(555, y + 5).strokeColor('#eeeeee').stroke();
        y += 15;

        // ─── Summary / Totals ───────────────────────────────────────────────
        if (y > 680) {
          doc.addPage();
          y = 40;
        }

        const subtotal = parseFloat(invoice.subtotal || 0).toFixed(2);
        const discount = parseFloat(invoice.discount_amount || 0).toFixed(2);
        const tax = parseFloat(invoice.tax_amount || 0).toFixed(2);
        const total = parseFloat(invoice.total_amount || 0).toFixed(2);
        const paid = parseFloat(invoice.paid_amount || 0).toFixed(2);
        const balance = parseFloat(invoice.balance || 0).toFixed(2);

        doc.font('Helvetica').fontSize(9).fillColor('#444444');

        doc.text('Subtotal:', 380, y, { width: 90, align: 'right' });
        doc.text(`Rs. ${subtotal}`, 475, y, { width: 75, align: 'right' });
        y += 14;

        if (parseFloat(discount) > 0) {
          doc.text('Discount:', 380, y, { width: 90, align: 'right' });
          doc.text(`- Rs. ${discount}`, 475, y, { width: 75, align: 'right' });
          y += 14;
        }

        if (parseFloat(tax) > 0) {
          doc.text('Tax:', 380, y, { width: 90, align: 'right' });
          doc.text(`Rs. ${tax}`, 475, y, { width: 75, align: 'right' });
          y += 14;
        }

        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
        doc.text('Total Amount:', 360, y, { width: 110, align: 'right' });
        doc.text(`Rs. ${total}`, 475, y, { width: 75, align: 'right' });
        y += 18;

        doc.font('Helvetica').fontSize(9).fillColor('#2e7d32');
        doc.text('Paid Amount:', 380, y, { width: 90, align: 'right' });
        doc.text(`Rs. ${paid}`, 475, y, { width: 75, align: 'right' });
        y += 14;

        doc.font('Helvetica-Bold').fontSize(10).fillColor(balance > 0 ? '#c62828' : '#2e7d32');
        doc.text('Balance Due:', 380, y, { width: 90, align: 'right' });
        doc.text(`Rs. ${balance}`, 475, y, { width: 75, align: 'right' });
        y += 30;

        // ─── Footer ─────────────────────────────────────────────────────────
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#888888')
           .text('This is a computer generated invoice.', 40, 750, { align: 'center', width: 515 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = InvoicePdfService;
