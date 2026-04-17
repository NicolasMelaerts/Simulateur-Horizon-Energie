import emailjs from '@emailjs/browser';
import { SimulationResult } from '../types';

export const sendClientConfirmationEmail = async (
  firstName: string,
  lastName: string,
  email: string,
  result: SimulationResult,
  aiAnalysis: string | null
): Promise<void> => {
  try {
    const templateParams = {
      to_email: email,
      first_name: firstName,
      last_name: lastName,
      system_size: result.systemSizeKwp,
      panels_count: result.numberOfPanels,
      battery_capacity: result.batteryCapacityKwh,
      inverter_kva: result.inverterKva,
      annual_production: result.estimatedAnnualProduction.toLocaleString('fr-BE'),
      autonomy: result.autonomyPercentage,
      payback_period: result.paybackPeriod,
      monthly_gain: result.monthlyGain,
      investment: result.totalInvestment.toLocaleString('fr-BE'),
      annual_savings: result.annualSavings.toLocaleString('fr-BE'),
      annual_sales: result.annualSales.toLocaleString('fr-BE'),
      total_annual_gain: result.totalAnnualGain.toLocaleString('fr-BE'),
      ai_analysis: aiAnalysis
        ? aiAnalysis.replace(/\*\*/g, '').replace(/\*/g, '')
        : 'Analyse non disponible.',
    };

    await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_CLIENT_TEMPLATE_ID,
      templateParams,
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );
  } catch (error) {
    console.error("Erreur envoi email client:", error);
  }
};
