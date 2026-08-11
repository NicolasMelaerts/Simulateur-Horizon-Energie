import { SimulationResult, UserInput } from '../types';
import { GEMINI_EXPERT_PROMPT } from '../constants';

/**
 * Model used for the expert analysis.
 * Must stay in sync with the model in public/api/claude.php.
 */
const CLAUDE_MODEL = 'claude-haiku-4-5';

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

    // In local development, if a local key is provided, we can call Anthropic directly
    // (the PHP proxy only exists once deployed). Covers localhost and 127.0.0.1.
    const isLocalDev = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

    // SECURITY — do not refactor this condition.
    // Any VITE_-prefixed variable present at build time is inlined verbatim into the
    // public JS bundle. `import.meta.env.DEV` must be read INLINE here (and first) so
    // Vite replaces it with `false` and the minifier folds the whole branch away,
    // dropping the key literal with it. Assigning it to a variable first defeats
    // constant folding and leaves the key in the shipped bundle in plaintext.
    // @ts-ignore
    if (import.meta.env.DEV && isLocalDev && import.meta.env.VITE_CLAUDE_API_KEY) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // @ts-ignore
          'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          // Required for direct browser-to-Anthropic calls (dev only): opts in to CORS.
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
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
      // Surface the API's own error body — a bare status code hides the real cause
      // (retired model id, invalid key, rate limit).
      const details = await response.text().catch(() => '');
      throw new Error(`Claude API error: HTTP ${response.status} ${details}`);
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
