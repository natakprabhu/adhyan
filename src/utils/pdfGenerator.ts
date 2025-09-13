import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

// ----------------------------
// Types
// ----------------------------
interface InvoiceData {
  bookingId: string;
  userName: string;
  userEmail: string;
  amount: number; // Final paid amount
  seatNumber: number;
  bookingType: string;
  slot?: string;
  startDate: string;
  endDate: string;
  transactionId: string;
  paymentDate: string;
  status: string;
}

// ----------------------------
// Utils
// ----------------------------
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ----------------------------
// Generate PDF
// ----------------------------
const generateInvoicePDF = (
  invoiceData: InvoiceData,
  originalPrice: number,
  discountPercentage?: number
): void => {
  const pdf = new jsPDF();

  // Colors
  const primaryColor = [33, 37, 41]; // dark gray
  const accentColor = [0, 102, 204]; // blue

  // Logo
  const logo = "/lovable-uploads/082b41c8-f84f-44f0-9084-137a3e9cbfe2.png";
  pdf.addImage(logo, "PNG", 150, 15, 40, 20);

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...primaryColor);
  pdf.text("INVOICE", 20, 30);

  // Line separator
  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(0.5);
  pdf.line(20, 35, 190, 35);

  // Company Info
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Adhyan Library", 20, 45);
  pdf.text("60/19, Ground Floor,", 20, 51);
  pdf.text("Old Rajinder Nagar, Delhi - 110060", 20, 57);
  pdf.text("Phone: 8076514304", 20, 63);

  pdf.setTextColor(...primaryColor);
  pdf.text("Invoice #: " + invoiceData.transactionId, 20, 75);
  pdf.text("Date: " + formatDate(invoiceData.paymentDate), 20, 81);

  // Customer Info
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Bill To:", 20, 95);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(...primaryColor);
  pdf.text(invoiceData.userName, 20, 105);
  pdf.text(invoiceData.userEmail, 20, 111);

  // Booking Details box
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...accentColor);
  pdf.text("Booking Details", 20, 130);

  pdf.setDrawColor(200, 200, 200);
  pdf.rect(18, 135, 174, 40); // border box

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...primaryColor);
  let y = 145;
  pdf.text(`Seat Number: ${invoiceData.seatNumber}`, 25, y);
  pdf.text(`Booking Type: ${invoiceData.bookingType}`, 100, y);

  y += 8;
  if (invoiceData.slot) {
    pdf.text(`Slot: ${invoiceData.slot}`, 25, y);
  }
  pdf.text(
    `Period: ${formatDate(invoiceData.startDate)} to ${formatDate(invoiceData.endDate)}`,
    100,
    y
  );

  y += 8;
  pdf.text(`Status: ${invoiceData.status}`, 25, y);

  // Payment Info box
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...accentColor);
  pdf.text("Payment Information", 20, 190);

  pdf.setDrawColor(200, 200, 200);
  pdf.rect(18, 195, 174, 40);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(...primaryColor);

  y = 205;

  if (invoiceData.amount < originalPrice) {
    // Original Price strike
    pdf.text(`Original Price: ₹${originalPrice}`, 25, y);
    pdf.setDrawColor(200, 0, 0);
    pdf.line(24, y - 2, 70, y - 2);

    y += 8;
    pdf.setTextColor(200, 0, 0);
    pdf.text(`Discounted Price: ₹${invoiceData.amount}`, 25, y);

    if (discountPercentage) {
      y += 8;
      pdf.text(`You saved ${discountPercentage}%`, 25, y);
    }
    pdf.setTextColor(...primaryColor);
  } else {
    pdf.text(`Amount Paid: Rs. ${invoiceData.amount}`, 25, y);
  }

  y += 8;
  pdf.text(`Payment Date: ${formatDate(invoiceData.paymentDate)}`, 25, y);

  // Footer
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Thank you for your business!", 20, 280);
  pdf.text("This is a computer-generated invoice.", 20, 286);

  // Save
  pdf.save(`invoice-${invoiceData.transactionId}.pdf`);
};

// ----------------------------
// Fetch Booking & Generate Invoice
// ----------------------------
const fetchBookingAndGenerateInvoice = async (invoiceData: InvoiceData) => {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("monthly_cost, duration_months")
    .eq("id", invoiceData.bookingId)
    .single();

  if (error || !booking) {
    console.error("Error fetching booking:", error?.message);
    return;
  }

  const originalPrice = booking.monthly_cost * booking.duration_months;

  const discountPercentage =
    invoiceData.amount < originalPrice
      ? Math.round(((originalPrice - invoiceData.amount) / originalPrice) * 100)
      : undefined;

  generateInvoicePDF(invoiceData, originalPrice, discountPercentage);
};

// ----------------------------
// Exports
// ----------------------------
export { generateInvoicePDF, fetchBookingAndGenerateInvoice };
