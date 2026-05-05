import jsPDF from 'jspdf';
import { SimulationResult, UserInput } from '../types';

const COLORS = {
  green: [34, 197, 94] as [number, number, number],
  darkGreen: [21, 128, 61] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  lightGray: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// Safe number formatter for jsPDF (no special unicode chars)
const fmt = (n: number): string => {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

let logoBase64: string | null = null;

const loadLogo = async (): Promise<string | null> => {
  if (logoBase64) return logoBase64;
  try {
    const response = await fetch('./logo-horizon-dark.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
        resolve(logoBase64);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
  aiAnalysis: string | null
): Promise<jsPDF> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 15;

  // === HEADER WITH LOGO ===
  const logo = await loadLogo();
  if (logo) {
    const logoW = 45;
    const logoH = logoW * (267 / 499);
    pdf.addImage(logo, 'PNG', 20, y, logoW, logoH);
    y += logoH + 2;
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(...COLORS.dark);
    pdf.text('Horizon Energie', 20, y + 8);
    y += 14;
  }

  // Tagline
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.gray);
  pdf.text('Votre energie, notre defi.', 20, y);

  // Date top right
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.gray);
  pdf.text(dateStr, pageWidth - 20, 20, { align: 'right' });

  y += 8;
  drawLine(pdf, y);
  y += 8;

  // === TITLE ===
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.dark);
  pdf.text('Rapport de Simulation Photovoltaique', 20, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.gray);
  pdf.text(`Adresse : ${userInput.address}`, 20, y);
  y += 10;

  // === KEY METRICS (hero) ===
  pdf.setFillColor(...COLORS.dark);
  pdf.roundedRect(20, y, pageWidth - 40, 32, 3, 3, 'F');

  const metricsY = y + 10;
  const colW = (pageWidth - 40) / 4;

  // ROI
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text('RETOUR SUR INVESTISSEMENT', 20 + colW * 0 + colW / 2, metricsY, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.green);
  pdf.text(`${result.paybackPeriod} ans`, 20 + colW * 0 + colW / 2, metricsY + 10, { align: 'center' });

  // Gain mensuel
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text('GAIN MENSUEL MOYEN', 20 + colW * 1 + colW / 2, metricsY, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.white);
  pdf.text(`+${fmt(result.monthlyGain)} EUR`, 20 + colW * 1 + colW / 2, metricsY + 10, { align: 'center' });

  // Autonomie
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text('AUTONOMIE', 20 + colW * 2 + colW / 2, metricsY, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.green);
  pdf.text(`${result.autonomyPercentage}%`, 20 + colW * 2 + colW / 2, metricsY + 10, { align: 'center' });

  // Investissement
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text('INVESTISSEMENT (HTVA)', 20 + colW * 3 + colW / 2, metricsY, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.white);
  pdf.text(`${fmt(result.totalInvestment)} EUR`, 20 + colW * 3 + colW / 2, metricsY + 10, { align: 'center' });

  y += 40;

  // === VOTRE KIT PHOTOVOLTAIQUE ===
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.dark);
  pdf.text('Votre kit photovoltaique hybride', 20, y);
  y += 8;

  const kitCol = (pageWidth - 40) / 3;
  drawKeyValue(pdf, 'Panneaux solaires', `${result.numberOfPanels} panneaux - ${result.systemSizeKwp} kWc`, 20, y, COLORS.dark);
  drawKeyValue(pdf, 'Batterie', `${result.batteryCapacityKwh} kWh Haute Densite`, 20 + kitCol, y, COLORS.dark);
  drawKeyValue(pdf, 'Onduleur', `${result.inverterKva} kVA Intelligent`, 20 + kitCol * 2, y, COLORS.dark);

  y += 16;
  drawLine(pdf, y);
  y += 8;

  // === BILAN FINANCIER ===
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.dark);
  pdf.text('Bilan financier', 20, y);
  y += 8;

  const finCol = (pageWidth - 40) / 3;

  // Col 1 - Investissement
  drawKeyValue(pdf, 'Photovoltaique', `${fmt(result.capexPanels)} EUR`, 20, y);
  drawKeyValue(pdf, 'Batterie', `${fmt(result.capexBattery)} EUR`, 20, y + 14);
  drawKeyValue(pdf, 'Total (HTVA)', `${fmt(result.totalInvestment)} EUR`, 20, y + 28, COLORS.darkGreen);

  // Col 2 - Gains annuels
  drawKeyValue(pdf, 'Economie (autoconsommation)', `+${fmt(result.annualSavings)} EUR/an`, 20 + finCol, y, COLORS.darkGreen);
  drawKeyValue(pdf, 'Revente (injection)', `+${fmt(result.annualSales)} EUR/an`, 20 + finCol, y + 14);
  drawKeyValue(pdf, 'Gain annuel total', `+${fmt(result.totalAnnualGain)} EUR/an`, 20 + finCol, y + 28, COLORS.darkGreen);

  // Col 3 - Performance
  drawKeyValue(pdf, 'Production annuelle', `${fmt(result.estimatedAnnualProduction)} kWh`, 20 + finCol * 2, y);
  drawKeyValue(pdf, 'Electricite economisee', `${fmt(result.selfConsumedEnergy)} kWh`, 20 + finCol * 2, y + 14);
  drawKeyValue(pdf, 'Autoconsommation', `${result.selfConsumptionRate}%`, 20 + finCol * 2, y + 28, COLORS.darkGreen);

  y += 44;
  drawLine(pdf, y);
  y += 8;

  // === ANALYSE EXPERT ===
  if (aiAnalysis) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.dark);
    pdf.text('Analyse Expert Horizon Energie', 20, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.gray);

    const cleanText = aiAnalysis
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,3}\s?/g, '')
      .replace(/\n{2,}/g, '\n');

    const lines = pdf.splitTextToSize(cleanText, pageWidth - 40);
    for (const line of lines) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 20, y);
      y += 4.5;
    }

    y += 4;
    drawLine(pdf, y);
    y += 8;
  }

  // === FOOTER ===
  if (y > 255) {
    pdf.addPage();
    y = 20;
  }

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(20, y, pageWidth - 40, 22, 3, 3, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.dark);
  pdf.text('Une question ? N\'hesitez pas a nous contacter', 25, y + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.gray);
  pdf.text('02 315 69 27  |  infos@horizon-energie.be', 25, y + 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.green);
  pdf.text('horizon-energie.be', pageWidth - 25, y + 14, { align: 'right' });

  // Page footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.lightGray);
    pdf.text(
      `Horizon Energie - Simulation generee le ${dateStr} - Page ${i}/${totalPages}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  return pdf;
};

export const downloadPdf = (pdf: jsPDF, filename: string) => {
  pdf.save(filename);
};

export const getPdfBase64 = (pdf: jsPDF) => {
  return pdf.output('datauristring');
};
