import jsPDF from 'jspdf';

interface InvoiceData {
  bookingId: string;
  userName: string;
  userEmail: string;
  amount: number;
  seatNumber: number;
  bookingType: string;
  slot?: string;
  startDate: string;
  endDate: string;
  transactionId: string;
  paymentDate: string;
  status: string;
}

export const generateInvoicePDF = (invoiceData: InvoiceData): void => {
  const pdf = new jsPDF();
  
  // Set font
  pdf.setFont('helvetica');
  
  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(40, 40, 40);
  pdf.text('INVOICE', 20, 30);
  
  // Company Info
  pdf.setFontSize(12);
  pdf.text('Workspace Booking System', 20, 50);
  pdf.text('Invoice #: ' + invoiceData.transactionId, 20, 60);
  pdf.text('Date: ' + new Date(invoiceData.paymentDate).toLocaleDateString(), 20, 70);
  
  // Customer Info
  pdf.setFontSize(14);
  pdf.text('Bill To:', 20, 90);
  pdf.setFontSize(12);
  pdf.text(invoiceData.userName, 20, 100);
  pdf.text(invoiceData.userEmail, 20, 110);
  
  // Booking Details
  pdf.setFontSize(14);
  pdf.text('Booking Details:', 20, 130);
  pdf.setFontSize(12);
  pdf.text(`Seat Number: ${invoiceData.seatNumber}`, 20, 140);
  pdf.text(`Booking Type: ${invoiceData.bookingType}`, 20, 150);
  
  if (invoiceData.slot) {
    pdf.text(`Slot: ${invoiceData.slot}`, 20, 160);
  }
  
  pdf.text(`Period: ${invoiceData.startDate} to ${invoiceData.endDate}`, 20, 170);
  pdf.text(`Status: ${invoiceData.status}`, 20, 180);
  
  // Amount
  pdf.setFontSize(14);
  pdf.text('Payment Information:', 20, 200);
  pdf.setFontSize(12);
  pdf.text(`Amount Paid: ₹${invoiceData.amount}`, 20, 210);
  pdf.text(`Payment Date: ${new Date(invoiceData.paymentDate).toLocaleDateString()}`, 20, 220);
  
  // Footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Thank you for your business!', 20, 260);
  pdf.text('This is a computer-generated invoice.', 20, 270);
  
  // Save the PDF
  pdf.save(`invoice-${invoiceData.transactionId}.pdf`);
};