import { SimulationResult, UserInput } from '../types';

export const pushToCrm = async (
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  result: SimulationResult,
  userInput: UserInput
): Promise<boolean> => {
  try {
    const WEBHOOK_URL = import.meta.env.VITE_CRM_WEBHOOK_URL;

    if (!WEBHOOK_URL) {
      console.warn("CRM Webhook URL non configurée dans le fichier .env");
      return false;
    }

    // Tentative de découpage de l'adresse (Format supposé: Rue Numéro, CP Ville, Pays)
    const addrParts = userInput.address.split(',').map(p => p.trim());
    let street = addrParts[0] || '';
    let zip = '';
    let city = '';
    let country = 'Belgium'; // Défaut par défaut

    if (addrParts.length >= 2) {
       const zipCityMatch = addrParts[1].match(/^(\d{4})\s+(.+)$/);
       if (zipCityMatch) {
         zip = zipCityMatch[1];
         city = zipCityMatch[2];
       } else {
         city = addrParts[1];
       }
    }
    
    if (addrParts.length >= 3) {
      country = addrParts[2];
    }

    const payload = {
      timestamp: new Date().toISOString(),
      source: "Simulateur Horizon Energie",
      client: {
        firstName,
        lastName,
        email,
        phone,
        fullAddress: userInput.address, // On garde l'originale au cas où
        addressDetails: {
          street,
          zip,
          city,
          country
        }
      },
      simulation: {
        systemSizeKwp: result.systemSizeKwp,
        panelsCount: result.numberOfPanels,
        batteryCapacityKwh: result.batteryCapacityKwh,
        inverterKva: result.inverterKva,
        totalInvestment: result.totalInvestment,
        paybackPeriod: result.paybackPeriod,
        annualSavings: result.annualSavings,
        annualSales: result.annualSales,
        totalAnnualGain: result.totalAnnualGain,
        estimatedAnnualProduction: result.estimatedAnnualProduction,
        autonomyPercentage: result.autonomyPercentage
      }
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Erreur lors de l'envoi au CRM (Make):", error);
    return false;
  }
};
