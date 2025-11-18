import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------
   Types
------------------------------------------------------ */
interface InvoiceData {
  bookingId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  amount: number;
  seatNumber: number | string;
  bookingType: string;
  slot?: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  status: string;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/* ------------------------------------------------------
   Generate Custom Invoice Number
------------------------------------------------------ */
const generateInvoiceNumber = (phone: string) => {
  //const rand = Math.floor(Math.random() * (999 - 500 + 1)) + 500;
  const year = new Date().getFullYear();
  const month = ("0" + (new Date().getMonth() + 1)).slice(-2);
  const last4 = phone?.slice(-4) ?? "0000";

  return `adhyan/${year}/${month}/${last4}`;
};

/* ------------------------------------------------------
   Main PDF Generator (Full Beautified)
------------------------------------------------------ */
const generateInvoicePDF = (
  invoice: InvoiceData,
  originalPrice: number,
  discountPercentage?: number
) => {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;
  let y = 40;

  // create watermark invoice number
  const invoiceNumber = generateInvoiceNumber(invoice.userPhone);

  /* ------------------------------------------------------
       Header + Logo
  ------------------------------------------------------ */
  const logo = "/lovable-uploads/082b41c8-f84f-44f0-9084-137a3e9cbfe2.png";
  pdf.addImage(logo, "PNG", pageWidth - 140, y, 100, 40);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("TAX INVOICE", margin, y + 25);

  y += 60;

  /* ------------------------------------------------------
       Company Details
  ------------------------------------------------------ */
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Adhyan Library", margin, y);

  pdf.setFont("helvetica", "normal");
  pdf.text("60/19, Ground Floor,", margin, y + 15);
  pdf.text("Old Rajinder Nagar, Delhi - 110060", margin, y + 30);
  pdf.text("Phone: 8076514304", margin, y + 45);

  pdf.setFont("helvetica", "bold");
  pdf.text(`Invoice No: ${invoiceNumber}`, pageWidth - 220, y);
  pdf.text(`Invoice Date: ${formatDate(invoice.paymentDate)}`, pageWidth - 220, y + 20);

  y += 80;

  /* ------------------------------------------------------
       Bill To Box
  ------------------------------------------------------ */
  pdf.setFillColor(242, 242, 242);
  pdf.rect(margin, y - 20, pageWidth - margin * 2, 70, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Bill To:", margin + 10, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(invoice.userName, margin + 10, y + 22);
  pdf.text(invoice.userPhone, margin + 10, y + 40);

  y += 90;

  /* ------------------------------------------------------
       Seat Type Formatter
  ------------------------------------------------------ */
  const seatTypeFormatted =
    invoice.bookingType === "limited"
      ? `Limited Hours – ${
          invoice.slot === "morning"
            ? "Morning (6 AM – 3 PM)"
            : "Evening (3 PM – 12 AM)"
        }`
      : invoice.bookingType === "floating"
      ? "Floating Seat"
      : "Fixed Seat";

  /* ------------------------------------------------------
       Booking Details Table
  ------------------------------------------------------ */
  autoTable(pdf, {
    startY: y,
    headStyles: { fillColor: [0, 102, 204], textColor: 255 },
    bodyStyles: { fontSize: 11 },
    margin: { left: margin, right: margin },
    head: [["Details", "Information"]],
    body: [
      ["Seat Type", `${invoice.bookingType}`],
      ["Seat Number", `${invoice.seatNumber}`],
      ["Validity", `${formatDate(invoice.startDate)} to ${formatDate(invoice.endDate)}`],
      ["Payment Status", invoice.status.toUpperCase()],
    ],
  });

  y = pdf.lastAutoTable.finalY + 40;

  /* ------------------------------------------------------
       Payment Breakdown Table
  ------------------------------------------------------ */
  const paymentRows: any[] = [];

  if (invoice.amount < originalPrice) {
    paymentRows.push(["Original Price", `Rs.${originalPrice}`]);
    paymentRows.push(["Discount Applied", `${discountPercentage}%`]);
  }

  paymentRows.push(["Final Amount Paid", `Rs. ${invoice.amount}`]);
  paymentRows.push(["Payment Date", formatDate(invoice.paymentDate)]);

  autoTable(pdf, {
    startY: y,
    headStyles: { fillColor: [33, 37, 41], textColor: 255 },
    bodyStyles: { fontSize: 11 },
    margin: { left: margin, right: margin },
    head: [["Payment Info", ""]],
    body: paymentRows,
  });

  y = pdf.lastAutoTable.finalY + 40;

  /* ------------------------------------------------------
       Footer
  ------------------------------------------------------ */
  pdf.setFontSize(14);
  pdf.setTextColor(70);
  pdf.text(
    "Thank you for choosing Adhyan Library. We wish you success in your learning journey.",
    margin,
    y
  );
  pdf.setFontSize(9);
  pdf.text(
    "This invoice was generated automatically and is valid without a signature.",
    margin,
    y + 15
  );

  /* ------------------------------------------------------
       WATERMARK: PAID
  ------------------------------------------------------ */
  // pdf.setFont("helvetica", "bold");
  // pdf.setFontSize(100);
  // pdf.setTextColor(200, 0, 0, 0.12); // light red, transparent

  // pdf.saveGraphicsState();
  // pdf.rotate(-30, { origin: [pageWidth / 2, 400] });
  // pdf.text("PAID", pageWidth / 2 - 150, 400, { align: "center" });
  // pdf.restoreGraphicsState();

  /* ------------------------------------------------------
       Save File
  ------------------------------------------------------ */
  pdf.save(`invoice-${invoiceNumber}.pdf`);
};

/* ------------------------------------------------------
   Fetch Booking → Generate PDF
------------------------------------------------------ */
const fetchBookingAndGenerateInvoice = async (invoiceData: InvoiceData) => {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("monthly_cost, duration_months")
    .eq("id", invoiceData.bookingId)
    .single();

  if (error) {
    console.error("Error fetching booking:", error);
    return;
  }

  const originalPrice = booking.monthly_cost * booking.duration_months;

  const discountPercentage =
    invoiceData.amount < originalPrice
      ? Math.round(((originalPrice - invoiceData.amount) / originalPrice) * 100)
      : undefined;

  generateInvoicePDF(invoiceData, originalPrice, discountPercentage);
};

export { generateInvoicePDF, fetchBookingAndGenerateInvoice };
