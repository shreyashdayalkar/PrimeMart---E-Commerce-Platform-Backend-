/**
 * ✅ GENERATE TAX INVOICE HTML STRING
 * Professional A4 Layout with Seller Block, HSN, Taxable Value, and GST Breakup
 * Fixed: Right-side cut issues by enforcing printable area constraints.
 */
export const getInvoiceHTML = (order) => {
  const date = new Date(order.createdAt).toLocaleDateString("en-IN");
  
  // ✅ Branding & Legal Seller Info
  const SELLER_INFO = {
    name: "PrimeMart Retail Pvt Ltd",
    address: "Warehouse Block C-12, Sector 44",
    city: "Amravati",
    state: "Maharashtra",
    pincode: "444606",
    gstin: "06AAAPM0000A1Z5",
    phone: "+91 90******86",
    email: "support@primemart.com"
  };

  // Fallbacks for Customer Info
  const customerName = order?.shippingAddress?.fullName || order?.user?.name || "Customer";
  const customerPhone = order?.shippingAddress?.phone || order?.user?.mobile || order?.user?.shippingAddress?.phone || "N/A";
  const street = order.shippingAddress?.street || "Address Not Provided";
  const city = order.shippingAddress?.city || "";
  const state = order.shippingAddress?.state || "N/A";
  const pincode = order.shippingAddress?.pincode || "";

  // ✅ REQUIRED CHANGE: Payment Status Logic
  const isPaid = order.paymentStatus?.toLowerCase() === "paid" || order.isPaid === true;
  const paymentBadge = isPaid 
    ? `<span style="color: #15803d; font-weight: bold;">PAID</span>` 
    : `<span style="color: #b91c1c; font-weight: bold;">${(order.paymentStatus || "Pending").toUpperCase()}</span>`;

  // GST Configuration (Default 18% split into 9+9)
  const CGST_RATE = 9;
  const SGST_RATE = 9;
  const TOTAL_GST_RATE = CGST_RATE + SGST_RATE;

  const itemsRows = order.items.map((item, index) => {
    const qty = item.quantity || 1;
    const rateWithTax = item.price || 0;
    const lineTotal = rateWithTax * qty;
    
    const taxableValue = lineTotal / (1 + TOTAL_GST_RATE / 100);
    const unitTaxableRate = taxableValue / qty;
    
    const cgstAmount = taxableValue * (CGST_RATE / 100);
    const sgstAmount = taxableValue * (SGST_RATE / 100);

    return `
      <tr>
        <td style="text-align: center; border: 1px solid #000;">${index + 1}</td>
        <td style="text-align: left; border: 1px solid #000; padding: 5px;">
          ${item.name || "Product"}<br>
          <small style="color: #666;">SKU: ${item.productId?.toString().slice(-6).toUpperCase() || 'N/A'}</small>
        </td>
        <td style="text-align: center; border: 1px solid #000;">${item.hsn || '9983'}</td>
        <td style="text-align: center; border: 1px solid #000;">${qty}</td>
        <td style="text-align: right; border: 1px solid #000; padding-right: 5px;">${unitTaxableRate.toFixed(2)}</td>
        <td style="text-align: right; border: 1px solid #000; padding-right: 5px;">${taxableValue.toFixed(2)}</td>
        <td style="text-align: right; border: 1px solid #000; padding-right: 5px;">
          <small>${CGST_RATE}%</small><br>${cgstAmount.toFixed(2)}
        </td>
        <td style="text-align: right; border: 1px solid #000; padding-right: 5px;">
          <small>${SGST_RATE}%</small><br>${sgstAmount.toFixed(2)}
        </td>
        <td style="text-align: right; border: 1px solid #000; padding-right: 5px; font-weight: bold;">
          ${lineTotal.toFixed(2)}
        </td>
      </tr>
    `;
  }).join("");

  const totalAmount = order.totalAmount || 0;
  const totalTax = order.tax || 0;
  const totalTaxable = totalAmount - totalTax;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tax Invoice - ${order.orderNumber}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; background: #fff; }
        .invoice-container { width: 100%; max-width: 190mm; margin: auto; overflow: hidden; }
        .tax-invoice-title { font-size: 16px; font-weight: bold; text-align: center; border: 1px solid #000; padding: 4px; margin-bottom: 12px; text-transform: uppercase; background: #f2f2f2; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; word-break: break-word; }
        .header-table td { vertical-align: top; padding-bottom: 10px; }
        .section-table { border: 1px solid #000; margin-bottom: 10px; }
        .section-table td { width: 50%; vertical-align: top; padding: 8px; border: 1px solid #000; line-height: 1.4; }
        .items-table th { background: #f2f2f2; border: 1px solid #000; padding: 5px; text-transform: uppercase; font-size: 9px; }
        .items-table td { padding: 4px; border: 1px solid #000; }
        .totals-table { border: 1px solid #000; border-top: none; }
        .totals-table td { padding: 4px 8px; border-right: 1px solid #000; }
        .terms { margin-top: 15px; font-size: 8.5px; line-height: 1.3; border: 1px solid #000; padding: 8px; }
        .footer { text-align: center; margin-top: 10px; font-size: 9px; color: #444; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="tax-invoice-title">Tax Invoice</div>
        
        <table class="header-table">
          <tr>
            <td style="width: 50%;">
              <h2 style="margin: 0; color: #2563eb; font-size: 20px;">${SELLER_INFO.name}</h2>
              <p style="margin: 3px 0;">
                ${SELLER_INFO.address}<br>
                ${SELLER_INFO.city}, ${SELLER_INFO.state} - ${SELLER_INFO.pincode}<br>
                <strong>GSTIN:</strong> ${SELLER_INFO.gstin}<br>
                <strong>Phone:</strong> ${SELLER_INFO.phone}
              </p>
            </td>
            <td style="width: 50%; text-align: right;">
              <p style="margin: 1px 0;"><strong>Invoice No:</strong> ${order.invoiceNumber || 'N/A'}</p>
              <p style="margin: 1px 0;"><strong>Invoice Date:</strong> ${date}</p>
              <p style="margin: 1px 0;"><strong>Order ID:</strong> ${order.orderNumber || order._id}</p>
              <p style="margin: 1px 0;"><strong>Payment Status:</strong> ${paymentBadge}</p>
            </td>
          </tr>
        </table>

        <table class="section-table">
          <tr>
            <td>
              <strong style="text-decoration: underline;">BILL TO / SHIP TO:</strong><br>
              <span style="font-size: 11px; font-weight: bold;">${customerName}</span><br>
              ${street}<br>
              ${city}, ${state} - ${pincode}<br>
              <strong>Phone:</strong> ${customerPhone}
            </td>
            <td>
              <strong style="text-decoration: underline;">ORDER INFO:</strong><br>
              <strong>Payment Method:</strong> ${(order.paymentMethod || "COD").toUpperCase()}<br>
              <strong>Delivery Status:</strong> <span style="text-transform: uppercase;">${order.status}</span><br>
              <strong>Dispatch Center:</strong> North Hub Delhi<br>
              <strong>Support:</strong> ${SELLER_INFO.email}
            </td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 8%;">#</th>
              <th rowspan="2" style="width: 25%;">Item Description</th>
              <th rowspan="2" style="width: 10%;">HSN</th>
              <th rowspan="2" style="width: 8%;">Qty</th>
              <th rowspan="2" style="width: 10%;">Rate</th>
              <th rowspan="2" style="width: 12%;">Taxable<br>Value</th>
              <th colspan="1" style="width: 10%;">CGST</th>
              <th colspan="1" style="width: 10%;">SGST</th>
              <th rowspan="2" style="width: 12%;">Total</th>
            </tr>
            <tr>
              <th>Amt</th>
              <th>Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="width: 55%;" rowspan="4">
              <strong>Total in Words:</strong><br>
              Indian Rupees Only<br><br>
              <div style="font-size: 8px; font-style: italic;">
                * This is a computer generated invoice and requires no physical signature.
              </div>
            </td>
            <td style="width: 28%;">Total Taxable Value:</td>
            <td style="width: 17%; text-align: right; border-right: none;">₹${totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Total CGST (9%):</td>
            <td style="text-align: right; border-right: none;">₹${(totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td>Total SGST (9%):</td>
            <td style="text-align: right; border-right: none;">₹${(totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background: #f2f2f2; font-weight: bold; font-size: 12px;">
            <td style="border-top: 1px solid #000;">GRAND TOTAL:</td>
            <td style="text-align: right; border-top: 1px solid #000; border-right: none;">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <div class="terms">
          <strong>Terms & Conditions:</strong>
          <ul style="margin: 2px 0; padding-left: 12px;">
            <li>Warranty as per manufacturer's policy.</li>
            <li>Returns subject to website policy within 7 days of delivery.</li>
            <li>All disputes are subject to Gurgaon jurisdiction only.</li>
          </ul>
        </div>

        <div class="footer">
          Thank you for shopping at ${SELLER_INFO.name}!
        </div>
      </div>
    </body>
    </html>
  `;
};