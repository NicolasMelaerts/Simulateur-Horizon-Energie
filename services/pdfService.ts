import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SimulationResult, UserInput } from '../types';

const COLORS = {
  green: [34, 197, 94] as [number, number, number],
  darkGreen: [21, 128, 61] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  lightGray: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const fmt = (n: number): string => {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const drawLine = (pdf: jsPDF, y: number, x1: number = 20, x2: number = 190) => {
  pdf.setDrawColor(...COLORS.lightGray);
  pdf.setLineWidth(0.3);
  pdf.line(x1, y, x2, y);
};

const drawKeyValue = (pdf: jsPDF, label: string, value: string, x: number, y: number, valueColor?: [number, number, number]) => {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.gray);
  pdf.text(label, x, y);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...(valueColor || COLORS.dark));
  pdf.text(value, x, y + 5);
};

export const generateStructuredPdf = async (
  result: SimulationResult,
  userInput: UserInput,
  aiAnalysis: string | null,
  clientData?: { firstName: string; lastName: string }
): Promise<Uint8Array> => {
  // ==========================================
  // 1. GENERER LA PAGE DES RESULTATS (Page 3)
  // ==========================================
  const jsPdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidthMm = jsPdfDoc.internal.pageSize.getWidth();
  
  let y = 20;
  
  jsPdfDoc.setFont('helvetica', 'bold');
  jsPdfDoc.setFontSize(16);
  jsPdfDoc.setTextColor(...COLORS.dark);
  jsPdfDoc.text('Résultats de la simulation', 20, y);
  y += 15;

  jsPdfDoc.setFontSize(10);
  jsPdfDoc.setFont('helvetica', 'normal');
  jsPdfDoc.setTextColor(...COLORS.gray);
  jsPdfDoc.text(`Adresse du projet : ${userInput.address}`, 20, y);
  y += 10;
  
  // Bloc de base (ROI, etc.)
  jsPdfDoc.setFillColor(...COLORS.dark);
  jsPdfDoc.roundedRect(20, y, pageWidthMm - 40, 32, 3, 3, 'F');

  const metricsY = y + 10;
  const colW = (pageWidthMm - 40) / 4;

  jsPdfDoc.setFont('helvetica', 'normal');
  jsPdfDoc.setFontSize(7);
  jsPdfDoc.setTextColor(148, 163, 184);
  jsPdfDoc.text('RETOUR SUR INVESTISSEMENT', 20 + colW * 0 + colW / 2, metricsY, { align: 'center' });
  jsPdfDoc.setFont('helvetica', 'bold');
  jsPdfDoc.setFontSize(18);
  jsPdfDoc.setTextColor(...COLORS.green);
  jsPdfDoc.text(`${result.paybackPeriod} ans`, 20 + colW * 0 + colW / 2, metricsY + 10, { align: 'center' });

  jsPdfDoc.setFont('helvetica', 'normal');
  jsPdfDoc.setFontSize(7);
  jsPdfDoc.setTextColor(148, 163, 184);
  jsPdfDoc.text('GAIN MENSUEL MOYEN', 20 + colW * 1 + colW / 2, metricsY, { align: 'center' });
  jsPdfDoc.setFont('helvetica', 'bold');
  jsPdfDoc.setFontSize(18);
  jsPdfDoc.setTextColor(...COLORS.white);
  jsPdfDoc.text(`+${fmt(result.monthlyGain)} EUR`, 20 + colW * 1 + colW / 2, metricsY + 10, { align: 'center' });

  jsPdfDoc.setFont('helvetica', 'normal');
  jsPdfDoc.setFontSize(7);
  jsPdfDoc.setTextColor(148, 163, 184);
  jsPdfDoc.text('AUTONOMIE', 20 + colW * 2 + colW / 2, metricsY, { align: 'center' });
  jsPdfDoc.setFont('helvetica', 'bold');
  jsPdfDoc.setFontSize(18);
  jsPdfDoc.setTextColor(...COLORS.green);
  jsPdfDoc.text(`${result.autonomyPercentage}%`, 20 + colW * 2 + colW / 2, metricsY + 10, { align: 'center' });

  jsPdfDoc.setFont('helvetica', 'normal');
  jsPdfDoc.setFontSize(7);
  jsPdfDoc.setTextColor(148, 163, 184);
  jsPdfDoc.text('INVESTISSEMENT (HTVA)', 20 + colW * 3 + colW / 2, metricsY, { align: 'center' });
  jsPdfDoc.setFont('helvetica', 'bold');
  jsPdfDoc.setFontSize(18);
  jsPdfDoc.setTextColor(...COLORS.white);
  jsPdfDoc.text(`${fmt(result.totalInvestment)} EUR`, 20 + colW * 3 + colW / 2, metricsY + 10, { align: 'center' });

  y += 40;

  jsPdfDoc.setFont('helvetica', 'bold');
  jsPdfDoc.setFontSize(12);
  jsPdfDoc.setTextColor(...COLORS.dark);
  jsPdfDoc.text('Votre equipement', 20, y);
  y += 8;

  const kitCol = (pageWidthMm - 40) / 3;
  drawKeyValue(jsPdfDoc, 'Panneaux solaires', `${result.numberOfPanels} panneaux - ${result.systemSizeKwp} kWc`, 20, y, COLORS.dark);
  drawKeyValue(jsPdfDoc, 'Batterie', `${result.batteryCapacityKwh} kWh Haute Densite`, 20 + kitCol, y, COLORS.dark);
  drawKeyValue(jsPdfDoc, 'Onduleur', `${result.inverterKva} kVA Intelligent`, 20 + kitCol * 2, y, COLORS.dark);

  y += 16;
  drawLine(jsPdfDoc, y);
  y += 8;

  jsPdfDoc.setFont('helvetica', 'bold');
  jsPdfDoc.setFontSize(12);
  jsPdfDoc.setTextColor(...COLORS.dark);
  jsPdfDoc.text('Bilan financier', 20, y);
  y += 8;

  const finCol = (pageWidthMm - 40) / 3;
  drawKeyValue(jsPdfDoc, 'Investissement Panneaux', `${fmt(result.capexPanels)} EUR`, 20, y);
  drawKeyValue(jsPdfDoc, 'Investissement Batterie', `${fmt(result.capexBattery)} EUR`, 20, y + 14);
  drawKeyValue(jsPdfDoc, 'Total (HTVA)', `${fmt(result.totalInvestment)} EUR`, 20, y + 28, COLORS.darkGreen);

  drawKeyValue(jsPdfDoc, 'Economie (autoconsommation)', `+${fmt(result.annualSavings)} EUR/an`, 20 + finCol, y, COLORS.darkGreen);
  drawKeyValue(jsPdfDoc, 'Revente (injection)', `+${fmt(result.annualSales)} EUR/an`, 20 + finCol, y + 14);
  drawKeyValue(jsPdfDoc, 'Gain annuel total', `+${fmt(result.totalAnnualGain)} EUR/an`, 20 + finCol, y + 28, COLORS.darkGreen);

  drawKeyValue(jsPdfDoc, 'Production annuelle', `${fmt(result.estimatedAnnualProduction)} kWh`, 20 + finCol * 2, y);
  drawKeyValue(jsPdfDoc, 'Electricite economisee', `${fmt(result.selfConsumedEnergy)} kWh`, 20 + finCol * 2, y + 14);
  drawKeyValue(jsPdfDoc, 'Autoconsommation', `${result.selfConsumptionRate}%`, 20 + finCol * 2, y + 28, COLORS.darkGreen);

  y += 40;
  drawLine(jsPdfDoc, y);
  y += 8;

  if (aiAnalysis) {
    jsPdfDoc.setFont('helvetica', 'bold');
    jsPdfDoc.setFontSize(12);
    jsPdfDoc.setTextColor(...COLORS.dark);
    jsPdfDoc.text('Analyse Expert Horizon Energie', 20, y);
    y += 6;

    const cleanText = aiAnalysis
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,3}\s?/g, '')
      .replace(/\n{2,}/g, '\n');

    jsPdfDoc.setFont('helvetica', 'normal');
    jsPdfDoc.setFontSize(9);
    jsPdfDoc.setTextColor(...COLORS.gray);
    const lines = jsPdfDoc.splitTextToSize(cleanText, pageWidthMm - 40);
    for (const line of lines) {
      if (y > 270) {
        jsPdfDoc.addPage();
        y = 20;
      }
      jsPdfDoc.text(line, 20, y);
      y += 4.5;
    }
  }

  const jsPdfBytes = jsPdfDoc.output('arraybuffer');

  // ==========================================
  // 2. FUSION AVEC LE TEMPLATE DE BASE (pdf-lib)
  // ==========================================
  let templateBytes: ArrayBuffer;
  try {
    const templateRes = await fetch('/Template-Devis.pdf');
    if (!templateRes.ok) throw new Error("Template not found");
    templateBytes = await templateRes.arrayBuffer();
  } catch (error) {
    console.error("Impossible de charger /Template-Devis.pdf", error);
    return new Uint8Array(jsPdfBytes);
  }

  const pdfDoc = await PDFDocument.load(templateBytes);
  const resultsPdfDoc = await PDFDocument.load(jsPdfBytes);

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setMonth(validUntil.getMonth() + 1);
  const validStr = `${String(validUntil.getDate()).padStart(2, '0')}/${String(validUntil.getMonth() + 1).padStart(2, '0')}/${validUntil.getFullYear()}`;
  const refDevis = `HE-${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  const clientName = clientData?.firstName && clientData?.lastName 
    ? `${clientData.firstName} ${clientData.lastName}`
    : 'Client - Horizon Energie';
  const clientAddress = userInput.address || '';

  const pages = pdfDoc.getPages();
  
  // A. Remplacer la page 3 (Index 2)
  if (pages.length >= 3) {
    const [copiedPage] = await pdfDoc.copyPages(resultsPdfDoc, [0]);
    pdfDoc.removePage(2);
    pdfDoc.insertPage(2, copiedPage);
  } else {
    const [copiedPage] = await pdfDoc.copyPages(resultsPdfDoc, [0]);
    pdfDoc.addPage(copiedPage);
  }

  const updatedPages = pdfDoc.getPages();

  // B. Ecrire sur la Page de Garde (Index 0)
  if (updatedPages.length > 0) {
    const coverPage = updatedPages[0];
    const { width, height } = coverPage.getSize();
    
    // Coordonnées typiques au centre pour le nom, devis, validité
    const centerY = height / 2; 

    const drawCenteredText = (page: any, text: string, yPos: number, font: any, size: number, color: any) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: yPos,
        size,
        font,
        color
      });
    };

    // Couleur Verte Horizon Energie
    const greenColor = rgb(0.13, 0.77, 0.37);

    // Nom et prénom au dessus de l'adresse (monté de ~1cm = 28 points)
    drawCenteredText(coverPage, clientName, centerY + 73, helveticaBold, 15, greenColor);
    if (clientAddress) {
      // Espace de 1cm (~28 points) entre le nom et l'adresse
      drawCenteredText(coverPage, clientAddress, centerY + 30, helveticaBold, 15, greenColor);
    }
  }

  // C. Ecrire le footer sur toutes les pages
  const deptName = "Horizon Energie SRL";
  const deptVat = "BE0544930261";
  const footerColor = rgb(0.4, 0.4, 0.4);

  updatedPages.forEach((page) => {
    const { width } = page.getSize();
    const margin = 45;
    const footerY = 35; // Position Y depuis le bas de la page

    // Info de droite uniquement
    const vatWidth = helveticaFont.widthOfTextAtSize(deptVat, 8);
    const nameWidth = helveticaBold.widthOfTextAtSize(deptName, 8);
    const rightAlign = width - margin - Math.max(vatWidth, nameWidth);

    page.drawText(deptName, { x: rightAlign, y: footerY, size: 8, font: helveticaBold, color: footerColor });
    page.drawText(deptVat, { x: rightAlign, y: footerY - 12, size: 8, font: helveticaFont, color: footerColor });
  });

  const finalPdfBytes = await pdfDoc.save();
  return finalPdfBytes;
};

export const downloadPdf = (pdfBytes: Uint8Array, filename: string) => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const getPdfBase64 = async (pdfBytes: Uint8Array) => {
  let binary = '';
  const len = pdfBytes.byteLength;
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
  }
  return 'data:application/pdf;base64,' + window.btoa(binary);
};
