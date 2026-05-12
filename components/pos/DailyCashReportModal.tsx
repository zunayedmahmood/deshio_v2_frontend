'use client';

import React, { useState } from 'react';
import { X, FileText, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import { jsPDF } from 'jspdf';

interface DailyCashReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  darkMode?: boolean;
}

const DailyCashReportModal: React.FC<DailyCashReportModalProps> = ({
  isOpen,
  onClose,
  storeId,
  storeName,
  darkMode = false,
}) => {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const generateReport = async () => {
    if (!storeId) return;

    setLoading(true);
    try {
      const response = await axiosInstance.get(`/reporting/daily-sales?store_id=${storeId}`);
      if (response.data.success) {
        const data = response.data.data;
        
        if (format === 'csv') {
          downloadCSV(data);
        } else {
          downloadPDF(data);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error generating daily report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: any) => {
    const headers = [
      'Order Number',
      'Customer Name',
      'Customer Phone',
      'Item Name',
      'Barcode',
      'Qty',
      'Sold Price',
      'Item Subtotal',
      'Cash',
      'bKash',
      'Bank',
      'Card',
      'Installments',
      'Order Total'
    ];

    const rows: any[] = [];
    
    // Add Store Details as header rows
    rows.push(['Store Name', data.branch.name]);
    rows.push(['Store Address', data.branch.address]);
    rows.push(['Store Phone', data.branch.phone]);
    rows.push(['Report Date', data.date]);
    rows.push([]); // Empty row
    rows.push(headers);

    data.orders.forEach((order: any) => {
      order.items.forEach((item: any, index: number) => {
        const isFirstItem = index === 0;
        rows.push([
          isFirstItem ? order.order_number : '',
          isFirstItem ? order.customer.name : '',
          isFirstItem ? order.customer.phone : '',
          item.name,
          item.barcode,
          item.qty,
          Number(item.price).toFixed(2),
          Number(item.subtotal).toFixed(2),
          isFirstItem ? Number(order.payments.cash).toFixed(2) : '0.00',
          isFirstItem ? Number(order.payments.bkash).toFixed(2) : '0.00',
          isFirstItem ? Number(order.payments.bank).toFixed(2) : '0.00',
          isFirstItem ? Number(order.payments.card).toFixed(2) : '0.00',
          isFirstItem ? Number(order.payments.installments).toFixed(2) : '0.00',
          isFirstItem ? Number(order.total).toFixed(2) : ''
        ]);
      });
    });

    // Helper to escape CSV cells
    const escapeCSV = (cell: any) => {
      if (cell === null || cell === undefined) return '';
      const stringCell = String(cell);
      if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
        return `"${stringCell.replace(/"/g, '""')}"`;
      }
      return stringCell;
    };

    const csvContent = rows.map(e => e.map(escapeCSV).join(',')).join('\n');

    // Add BOM for Excel UTF-8 support
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-sales-${data.branch.name}-${data.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = (data: any) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4 for more columns
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('DESHIO', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text('Daily Detailed Sales Report', pageWidth / 2, 22, { align: 'center' });
    
    // Store Info
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.text(`Store: ${data.branch.name}`, 15, 32);
    doc.text(`Address: ${data.branch.address}`, 15, 37);
    doc.text(`Date: ${data.date}`, pageWidth - 15, 32, { align: 'right' });
    
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(15, 42, pageWidth - 15, 42);
    
    // Table Headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    
    let y = 50;
    const cols = {
      order: 15,
      customer: 45,
      items: 85,
      qty: 145,
      price: 155,
      cash: 175,
      bkash: 195,
      bank: 215,
      card: 235,
      inst: 255,
      total: 275
    };

    doc.text('Order #', cols.order, y);
    doc.text('Customer', cols.customer, y);
    doc.text('Items', cols.items, y);
    doc.text('Qty', cols.qty, y);
    doc.text('Price', cols.price, y);
    doc.text('Cash', cols.cash, y);
    doc.text('bKash', cols.bkash, y);
    doc.text('Bank', cols.bank, y);
    doc.text('Card', cols.card, y);
    doc.text('Inst.', cols.inst, y);
    doc.text('Total', cols.total, y);
    
    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    data.orders.forEach((order: any) => {
      // Check if we need a new page
      if (y > 180) {
        doc.addPage();
        y = 20;
      }

      const orderStartY = y;
      doc.text(order.order_number, cols.order, y);
      doc.text(order.customer.name.substring(0, 20), cols.customer, y);
      
      order.items.forEach((item: any, idx: number) => {
        if (y > 190) {
           doc.addPage();
           y = 20;
        }
        doc.text(`${item.name.substring(0, 30)} (${item.barcode})`, cols.items, y);
        doc.text(String(item.qty), cols.qty, y);
        doc.text(Number(item.price).toFixed(2), cols.price, y);
        y += 5;
      });

      // Payments on the first line of the order
      doc.text(Number(order.payments.cash).toFixed(2), cols.cash, orderStartY);
      doc.text(Number(order.payments.bkash).toFixed(2), cols.bkash, orderStartY);
      doc.text(Number(order.payments.bank).toFixed(2), cols.bank, orderStartY);
      doc.text(Number(order.payments.card).toFixed(2), cols.card, orderStartY);
      doc.text(Number(order.payments.installments).toFixed(2), cols.inst, orderStartY);
      doc.setFont('helvetica', 'bold');
      doc.text(Number(order.total).toFixed(2), cols.total, orderStartY);
      doc.setFont('helvetica', 'normal');

      y += 2;
      doc.setDrawColor(243, 244, 246);
      doc.line(15, y, pageWidth - 15, y);
      y += 5;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated by Deshio POS System on ${new Date().toLocaleString()}`, pageWidth / 2, 200, { align: 'center' });
    
    doc.save(`daily-sales-${data.branch.name}-${data.date}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-2xl border p-6 animate-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Generate Daily Cash Report
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Generate a summary of all POS transactions for today in <strong>{storeName}</strong>.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setFormat('csv')}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              format === 'csv'
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${format === 'csv' ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'}`}>
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>CSV Spreadsheet</span>
          </button>

          <button
            onClick={() => setFormat('pdf')}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              format === 'pdf'
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className={`p-2 rounded-lg ${format === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}`}>
              <FileText className="w-6 h-6" />
            </div>
            <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>PDF Document</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={generateReport}
            disabled={loading || !storeId}
            className="w-full h-12 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          
          <button
            onClick={onClose}
            className={`w-full h-11 text-sm font-medium ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyCashReportModal;
