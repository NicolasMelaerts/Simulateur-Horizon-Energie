import { SimulationResult, UserInput } from '../types';
import { GEMINI_EXPERT_PROMPT } from '../constants';

/**
 * Geocode an address using the free, public OpenStreetMap Nominatim API.
 * This is free, fast, and does not require any API Key or CORS proxy.
 */
export const getCoordinatesFromAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        // Nominatim policy requires a User-Agent identifying the app/request
        'User-Agent': 'Horizon-Energie-Simulator/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim geocoding error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error with Nominatim:", error);
    return null;
  }
};

/**
 * Generate expert analysis of the simulation results using the secure Claude PHP proxy.
 */
export const generateExpertAnalysis = async (input: UserInput, result: SimulationResult, solarApiUsed: boolean): Promise<string> => {
  try {
    const profileLabel = input.userProfile === 'home_office' ? "Présent/Télétravail" : "Actif (Absent journée)";
    const equipments = [];
    if (input.hasElectricVehicle) equipments.push(`VE (${input.electricVehicleKm} km/an)`);
    if (input.hasHeatPump) equipments.push("Pompe à Chaleur");
    if (input.hasSwimmingPool) equipments.push("Piscine");

    const equipString = equipments.length > 0 ? equipments.join(", ") : "Standard";

    // Use the prompt template from config.json
    const prompt = GEMINI_EXPERT_PROMPT
      .replace(/\{\{annualConsumption\}\}/g, String(input.annualConsumption))
      .replace(/\{\{profileLabel\}\}/g, profileLabel)
      .replace(/\{\{equipString\}\}/g, equipString)
      .replace(/\{\{roofArea\}\}/g, String(input.roofArea))
      .replace(/\{\{numberOfPanels\}\}/g, String(result.numberOfPanels))
      .replace(/\{\{systemSizeKwp\}\}/g, String(result.systemSizeKwp))
      .replace(/\{\{batteryCapacityKwh\}\}/g, String(result.batteryCapacityKwh))
      .replace(/\{\{inverterKva\}\}/g, String(result.inverterKva))
      .replace(/\{\{selfConsumptionRate\}\}/g, String(result.selfConsumptionRate))
      .replace(/\{\{paybackPeriod\}\}/g, String(result.paybackPeriod));

    let response;
    // @ts-ignore
    const localApiKey = import.meta.env.VITE_CLAUDE_API_KEY;

    // In local development, if a local key is provided, we can call Anthropic directly
    if (window.location.hostname === 'localhost' && localApiKey) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': localApiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-developer-user-agent': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      });
    } else {
      // In production, go through our secure server-side PHP proxy
      response = await fetch('/api/claude.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });
    }

    if (!response.ok) {
      throw new Error(`Claude API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Parse response content based on source (direct Anthropic JSON vs Proxy custom JSON)
    if (data.analysis) {
      return data.analysis;
    } else if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }
    
    return "Analyse indisponible.";
  } catch (error) {
    console.error("Claude Analysis Error:", error);
    return "L'analyse experte est temporairement indisponible. Veuillez réessayer plus tard ou nous contacter directement.";
  }
};
