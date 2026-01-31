import PDFDocument from "pdfkit";

/**
 * ✅ GENERATE INVOICE PDF
 * @param {Object} order - The order document from DB
 * @returns {Promise<Buffer>} - Returns PDF buffer
 */
export const generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    // --- 1. HEADER ---
    doc
      .fillColor("#444444")
      .fontSize(20)
      .text("STORE APP INVOICE", 50, 57)
      .fontSize(10)
      .text(`Order Number: ${order.orderNumber}`, 200, 65, { align: "right" })
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 200, 80, { align: "right" })
      .moveDown();

    // --- 2. CUSTOMER INFO ---
    doc
      .fillColor("#000000")
      .fontSize(12)
      .text("Bill To:", 50, 120)
      .fontSize(10)
      .text(order.shippingAddress.fullName, 50, 135)
      .text(order.shippingAddress.street, 50, 150)
      .text(`${order.shippingAddress.city} - ${order.shippingAddress.pincode}`, 50, 165)
      .text(`Phone: ${order.shippingAddress.phone}`, 50, 180);

    // --- 3. ITEMS TABLE ---
    const tableTop = 230;
    doc.font("Helvetica-Bold");
    generateTableRow(doc, tableTop, "Item", "Qty", "Unit Price", "Total");
    generateHr(doc, tableTop + 20);
    doc.font("Helvetica");

    let i = 0;
    order.items.forEach((item) => {
      const y = tableTop + 30 + i * 25;
      generateTableRow(
        doc,
        y,
        item.name,
        item.quantity,
        `INR ${item.price}`,
        `INR ${item.price * item.quantity}`
      );
      generateHr(doc, y + 20);
      i++;
    });

    // --- 4. SUMMARY ---
    const subtotalPosition = tableTop + 40 + i * 25;
    doc.font("Helvetica-Bold");
    
    doc.text("Subtotal:", 350, subtotalPosition);
    doc.font("Helvetica").text(`INR ${order.totalAmount - (order.tax || 0)}`, 450, subtotalPosition, { align: "right" });

    doc.font("Helvetica-Bold").text("Tax (GST):", 350, subtotalPosition + 20);
    doc.font("Helvetica").text(`INR ${order.tax || 0}`, 450, subtotalPosition + 20, { align: "right" });

    doc.font("Helvetica-Bold").text("Total Amount:", 350, subtotalPosition + 40);
    doc.fillColor("#2563eb")
       .fontSize(14)
       .text(`INR ${order.totalAmount}`, 450, subtotalPosition + 38, { align: "right" });

    // --- 5. FOOTER ---
    doc
      .fillColor("#aaaaaa")
      .fontSize(10)
      .text("Thank you for your business!", 50, 750, { align: "center", width: 500 });

    doc.end();
  });
};

// Helper Functions
function generateTableRow(doc, y, item, qty, price, total) {
  doc
    .fontSize(10)
    .text(item, 50, y, { width: 250, lineBreak: false })
    .text(qty, 300, y)
    .text(price, 350, y, { width: 90, align: "right" })
    .text(total, 450, y, { align: "right" });
}

function generateHr(doc, y) {
  doc
    .strokeColor("#eeeeee")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}