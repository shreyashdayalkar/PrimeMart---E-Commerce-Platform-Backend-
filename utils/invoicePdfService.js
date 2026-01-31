import puppeteer from "puppeteer";

/**
 * ✅ GENERATE INVOICE PDF BUFFER
 * Converts HTML string to a PDF Buffer using Puppeteer
 * @param {string} invoiceHtml - The complete HTML string from template
 * @returns {Promise<Buffer>} - PDF Data Buffer
 */
export const generateInvoicePdfBuffer = async (invoiceHtml) => {
  let browser;
  try {
    // 1. Launch Puppeteer
    // 'args' included to prevent common Windows/Linux permission crashes
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // 2. Set the HTML content
    // waitUntil: "networkidle0" ensures images/styles are loaded before printing
    await page.setContent(invoiceHtml, { 
      waitUntil: "networkidle0" 
    });

    // 3. Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // Crucial for rendering your PrimeMart colors
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    return pdfBuffer;
  } catch (error) {
    console.error("Puppeteer PDF Generation Error:", error.message);
    throw new Error("Failed to generate PDF buffer");
  } finally {
    // 4. Always close the browser to prevent memory leaks
    if (browser) {
      await browser.close();
    }
  }
};