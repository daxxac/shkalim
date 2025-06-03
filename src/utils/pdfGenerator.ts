import jsPDF from 'jspdf';
import autoTable, { Styles, HAlignType } from 'jspdf-autotable';
import type { ProcessedExportData } from '../services/exportService';
import type { Category, Transaction } from '../types/finance';
import { TFunction } from 'i18next'; // For translations

// Placeholder for theme colors - to be defined based on useTheme hook
export interface ThemeColors {
  textColor: string;
  headerColor: string;
  accentColor: string;
  // Add more as needed
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { // Use user's default locale
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return dateString; // Fallback to original string if date is invalid
  }
};

const formatCurrency = (amount: number, currencySymbol: string = '₪') => {
  // Basic currency formatting, can be expanded (e.g., using Intl.NumberFormat)
  const plusMinus = amount >= 0 ? '+' : '-';
  return `${plusMinus}${currencySymbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};


export const exportToPdf = async (
  data: ProcessedExportData,
  themeColors: ThemeColors,
  logoSrc: string,
  categories: Category[],
  t: TFunction,
  dateFilter: { start?: Date, end?: Date },
  corporateGoldColor: string = '#B08D57' // Added corporate gold color
) => {
  const doc = new jsPDF();

  let FONT_FAMILY_NAME = 'NotoSansCustom'; // Define a family name
  const FONT_REGULAR_FILENAME = 'NotoSans-Regular.ttf';
  const FONT_BOLD_FILENAME = 'NotoSans-Bold.ttf';
  let fontLoadSuccess = false;

  console.debug('Initial font list:', doc.getFontList());

  try {
    // Load Regular font
    const fontRegularPath = `/fonts/${FONT_REGULAR_FILENAME}`;
    console.debug(`Attempting to fetch font from: ${fontRegularPath}`);
    const fontRegularFile = await fetch(fontRegularPath).then(res => {
      if (!res.ok) throw new Error(`Failed to fetch ${FONT_REGULAR_FILENAME}: ${res.statusText}`);
      return res.arrayBuffer();
    });
    let regularBinary = '';
    const regularBytes = new Uint8Array(fontRegularFile);
    for (let i = 0; i < regularBytes.byteLength; i++) regularBinary += String.fromCharCode(regularBytes[i]);
    const fontRegularBase64 = btoa(regularBinary);
    doc.addFileToVFS(FONT_REGULAR_FILENAME, fontRegularBase64);
    doc.addFont(FONT_REGULAR_FILENAME, FONT_FAMILY_NAME, 'normal');
    console.debug(`${FONT_FAMILY_NAME} 'normal' (from ${FONT_REGULAR_FILENAME}) registered.`);

    // Load Bold font
    const fontBoldPath = `/fonts/${FONT_BOLD_FILENAME}`;
    console.debug(`Attempting to fetch font from: ${fontBoldPath}`);
    const fontBoldFile = await fetch(fontBoldPath).then(res => {
      if (!res.ok) throw new Error(`Failed to fetch ${FONT_BOLD_FILENAME}: ${res.statusText}`);
      return res.arrayBuffer();
    });
    let boldBinary = '';
    const boldBytes = new Uint8Array(fontBoldFile);
    for (let i = 0; i < boldBytes.byteLength; i++) boldBinary += String.fromCharCode(boldBytes[i]);
    const fontBoldBase64 = btoa(boldBinary);
    doc.addFileToVFS(FONT_BOLD_FILENAME, fontBoldBase64);
    doc.addFont(FONT_BOLD_FILENAME, FONT_FAMILY_NAME, 'bold');
    console.debug(`${FONT_FAMILY_NAME} 'bold' (from ${FONT_BOLD_FILENAME}) registered.`);
    
    fontLoadSuccess = true;
    console.debug('Font list after registration:', doc.getFontList());
     // Test if font is available
    if (!doc.getFontList()[FONT_FAMILY_NAME]) {
        console.error(`Font family ${FONT_FAMILY_NAME} not found in font list after registration!`);
        throw new Error(`Font family ${FONT_FAMILY_NAME} failed to register.`);
    }

  } catch (fontError) {
    console.error(`Failed to load/register custom fonts, falling back to helvetica:`, fontError);
    FONT_FAMILY_NAME = 'helvetica'; // Fallback if any font loading fails
  }
  
  const currentFont = FONT_FAMILY_NAME;
  console.debug(`Using font family: ${currentFont}`);
  doc.setFont(currentFont, 'normal'); // Set default document font and style
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  let currentY = 20; // Initial Y position

  // 1. Add Logo
  if (logoSrc) {
    try {
      // Assuming the logo is an image file (png, jpg)
      // For SVGs or other types, different handling might be needed.
      // jsPDF supports addImage with various formats.
      // We'll add it as a PNG. If it's already a data URL, it might work directly.
      // For simplicity, assuming a simple image path that can be fetched or is already loaded.
      // This part might need adjustment based on how logo is handled (e.g., preloading it).
      
      // For now, let's assume logoSrc is a path that can be used in an Image element
      // or directly if jsPDF supports it. A common approach is to load it via an Image object first.
      const img = new Image();
      img.src = logoSrc;
      
      // Wait for image to load to get its dimensions
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const aspectRatio = img.width / img.height;
      const logoWidth = 30;
      const logoHeight = aspectRatio > 0 ? logoWidth / aspectRatio : 15; // Maintain aspect ratio, fallback height
      
      doc.addImage(img, 'PNG', 15, currentY - 10, logoWidth, logoHeight);
    } catch (e) {
      console.error("Error adding logo to PDF:", e);
    }
  }
  currentY += 10; // Adjust Y after logo attempt

  // 2. Add Title
  let reportTitle = t('export.pdf.title', 'Financial Report');
  if (dateFilter.start || dateFilter.end) {
    const startStr = dateFilter.start ? formatDate(dateFilter.start.toISOString()) : '';
    const endStr = dateFilter.end ? formatDate(dateFilter.end.toISOString()) : '';
    if (startStr && endStr) {
      reportTitle += ` (${t('export.pdf.periodFromTo', { defaultValue: 'from {{start}} to {{end}}', start: startStr, end: endStr })})`;
    } else if (startStr) {
      reportTitle += ` (${t('export.pdf.periodFrom', { defaultValue: 'from {{start}}', start: startStr })})`;
    } else if (endStr) {
      reportTitle += ` (${t('export.pdf.periodTo', { defaultValue: 'to {{end}}', end: endStr })})`;
    }
  }
  doc.setFont(currentFont, 'normal'); // Ensure style is normal for title
  doc.setFontSize(18);
  doc.setTextColor('#000000');
  doc.text(reportTitle, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // 3. Add Statistics Summary
  doc.setFont(currentFont, 'normal'); // Ensure style is normal for stats
  doc.setFontSize(12);
  doc.setTextColor('#333333');
  const stats = data.statistics;
  const statItems = [
    `${t('export.stats.totalIncome', 'Total Income')}: ${formatCurrency(stats.totalIncome)}`,
    `${t('export.stats.totalExpenses', 'Total Expenses')}: ${formatCurrency(stats.totalExpenses)}`,
    `${t('export.stats.netBalance', 'Net Balance')}: ${formatCurrency(stats.netBalance)}`,
    `${t('export.stats.numTransactions', 'Number of Transactions')}: ${stats.numTransactions}`,
  ];
  statItems.forEach(item => {
    doc.text(item, 15, currentY);
    currentY += 7;
  });
  currentY += 5; // Extra space before table

  // 4. Add Transaction Table
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return t('categories.uncategorized', 'Uncategorized');
    const category = categories.find(c => c.id === categoryId);
    // Attempt to translate category name if a pattern like 'categories.food' exists
    return category ? t(`categories.${category.id}`, category.name) : t('categories.unknown', 'Unknown');
  };

  // Calculate width for the description column
  const dateColWidth = 25;
  const amountColWidth = 30;
  const categoryColWidth = 35;
  const bankColWidth = 25;
  // Standard jsPDF margins are often around 10-15mm or corresponding points.
  // Let's assume roughly 15 units on each side for table margins within the page.
  const pageMargin = 15;
  const availableTableWidth = pageWidth - (2 * pageMargin);
  const descriptionColCalculatedWidth = availableTableWidth - dateColWidth - amountColWidth - categoryColWidth - bankColWidth;

  const tableColumnStyles: { [key: string]: Partial<Styles> } = {
    '0': { cellWidth: dateColWidth }, // Date
    '1': { cellWidth: descriptionColCalculatedWidth > 0 ? descriptionColCalculatedWidth : 50 }, // Description
    '2': { cellWidth: amountColWidth, halign: 'right' as HAlignType }, // Amount
    '3': { cellWidth: categoryColWidth }, // Category
    '4': { cellWidth: bankColWidth }  // Bank
  };
  
  const head = [[
    t('export.table.date', 'Date'),
    t('export.table.description', 'Description'),
    t('export.table.amount', 'Amount'),
    t('export.table.category', 'Category'),
    t('export.table.bank', 'Bank')
  ]];
  console.debug('Table head content:', JSON.stringify(head));

  const body = data.filteredTransactions.map(t => [
    formatDate(t.date),
    t.description,
    formatCurrency(t.amount),
    getCategoryName(t.category),
    t.bank || '-',
  ]);
  if (body.length > 0) {
    console.debug('Sample table body row content:', JSON.stringify(body[0]));
  }


  autoTable(doc, {
    startY: currentY,
    head: head,
    body: body,
    theme: 'striped',
    headStyles: {
      fillColor: corporateGoldColor,
      textColor: '#000000',
      font: currentFont, // Use the family name
      fontStyle: 'bold' // Specify bold style for headers
    },
    styles: {
      font: currentFont, // Use the family name for general table
      fontStyle: 'normal', // Specify normal style for body
      cellPadding: 2,
      fontSize: 8
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: tableColumnStyles,
    didDrawPage: (hookData) => {
      // doc.setFont(currentFont, 'normal');
      // doc.setFontSize(10);
      // doc.text('Page ' + hookData.pageNumber, pageWidth - 20, pageHeight - 10);
    }
  });

  doc.save(t('export.pdf.filename', 'financial_report.pdf'));
};