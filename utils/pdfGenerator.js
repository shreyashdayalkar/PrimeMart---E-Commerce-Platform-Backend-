import puppeteer from "puppeteer";
import { getInvoiceHTML } from "./invoiceTemplate.js";

/**
 * ✅ GENERATE INVOICE PDF USING PUPPETEER
 * Optimized for professional A4 Tax Invoice layout with precise margins.
 * @param {Object} order - The order document from DB
 * @returns {Promise<Buffer>} - Returns PDF buffer
 */
export const generateInvoicePDF = async (order) => {
  let browser;
  try {
    // 1. Launch a headless browser with optimized arguments
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--font-render-hinting=none" // Ensures cleaner text rendering for high-quality printing
      ],
    });

    const page = await browser.newPage();

    // 2. Get the HTML content from the professional tax template
    const htmlContent = getInvoiceHTML(order);

    // 3. Set the content of the page
    // ✅ networkidle0 is vital: it waits until there are no more than 0 network connections for 500ms.
    // This ensures all styles and layout calculations are completed before rendering.
    await page.setContent(htmlContent, { 
      waitUntil: "networkidle0",
      timeout: 30000 
    });

    // 4. Generate the PDF Buffer with exact specifications to fix alignment/cut issues
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // ✅ Ensures background colors, borders, and shading render correctly
      margin: {
        top: "12mm",    // Increased margin to prevent header clipping
        right: "12mm",   // Ensures right-side content is within printable area
        bottom: "12mm",  // Prevents footer from cutting off
        left: "12mm",    // Standard professional left gutter
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true, // ✅ Tells Puppeteer to respect the @page size defined in CSS
    });

    return pdfBuffer;
  } catch (error) {
    console.error("Puppeteer PDF Generation Error:", error.message);
    throw new Error(`PDF Generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};