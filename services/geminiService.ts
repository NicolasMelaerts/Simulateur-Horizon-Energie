import { GoogleGenAI, Type } from "@google/genai";
import { SimulationResult, UserInput } from '../types';
import { GEMINI_EXPERT_PROMPT } from '../constants';

const getAiClient = () => {
  // @ts-ignore - Vite environment variables access
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ Gemini API Key missing (VITE_GEMINI_API_KEY)");
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

export const getCoordinatesFromAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  try {
    const ai = getAiClient();
    
    // Demo Mode: Mock coordinates for Brussels if no API Key
    if (!ai) {
      console.warn("Demo Mode: Using mock coordinates for Brussels.");
      return { lat: 50.8503, lng: 4.3517 };
    }

    const prompt = `Give me the latitude and longitude for this address: "${address}". 
    If the address is vague, find the center of the city/street.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        tools: [{googleMaps: {}}], 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ['lat', 'lng']
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      if (data.lat && data.lng) {
        return { lat: data.lat, lng: data.lng };
      }
    }
    return null;
  } catch (error) {
    console.error("Geocoding error with Gemini:", error);
    return null;
  }
};

export const generateExpertAnalysis = async (input: UserInput, result: SimulationResult, solarApiUsed: boolean): Promise<string> => {
  try {
    const ai = getAiClient();

    const profileLabel = input.userProfile === 'home_office' ? "Présent/Télétravail" : "Actif (Absent journée)";
    const equipments = [];
    if (input.hasElectricVehicle) equipments.push(`VE (${input.electricVehicleKm} km/an)`);
    if (input.hasHeatPump) equipments.push("Pompe à Chaleur");
    if (input.hasSwimmingPool) equipments.push("Piscine");

    const equipString = equipments.length > 0 ? equipments.join(", ") : "Standard";

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

    if (!ai) {
      return "Ceci est une analyse générée en mode démo. En conditions réelles, l'IA d'Horizon-Energie analyse précisément vos données pour optimiser votre rentabilité.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Analyse en cours...";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "L'analyse experte est temporairement indisponible. Veuillez reessayer plus tard ou nous contacter directement.";
  }
};

export const estimateRoofWithAI = async (address: string): Promise<{roofArea: number, roofSegments: any[]} | null> => {
  try {
    const ai = getAiClient();
    if (!ai) return null;

    const prompt = `Estime la configuration typique de la toiture pour l'adresse suivante : "${address}".
    Généralement, en Belgique/Europe, les maisons ont 1 ou 2 versants principaux.
    Réponds uniquement en JSON avec :
    - roofArea: surface estimée en m2 (nombre entre 20 et 150)
    - roofSegments: tableau de directions (ex: ["S"] ou ["E", "W"]) parmi N, NE, E, SE, S, SW, W, NW.
    Base-toi sur l'orientation probable du bâtiment à cette adresse.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roofArea: { type: Type.NUMBER },
            roofSegments: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ['roofArea', 'roofSegments']
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        roofArea: data.roofArea,
        roofSegments: data.roofSegments
      };
    }
    return null;
  } catch (error) {
    console.error("Gemini Fallback Analysis Error:", error);
    return null;
  }
};

export const analyzeRoofFromImage = async (base64Data: string, mimeType: string): Promise<{roofArea: number, roofSegments: any[]} | null> => {
  try {
    const ai = getAiClient();
    if (!ai) return null;

    const prompt = `Analyse cette image satellite pour estimer les caractéristiques de la toiture du bâtiment principal.
    Instructions :
    1. Estime la surface totale de la toiture (m²) disponible pour des panneaux solaires.
    2. Identifie les versants principaux (orientations cardinales : N, NE, E, SE, S, SW, W, NW).
    3. Réponds uniquement en format JSON avec les champs:
       "roofArea": nombre (m2, entre 20 et 200),
       "roofSegments": tableau de chaînes (ex: ["S", "W"]).
    Généralement, les toits en Belgique ont 1 ou 2 versants dominants.`;

    const response = await ai.models.generateContent({
       model: 'gemini-flash-latest',
       contents: [
         { text: prompt },
         { inlineData: { data: base64Data, mimeType: mimeType } }
       ]
    });

    if (response.text) {
       const jsonMatch = response.text.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          return {
            roofArea: data.roofArea,
            roofSegments: data.roofSegments
          };
       }
    }
    return null;
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return null;
  }
};