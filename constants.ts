import config from './config.json';
import { CardinalDirection } from './types';

// Export configurations for easy access throughout the app
// This allows non-coders to update config.json directly on GitHub.

// Hardware Specs
export const PANEL_POWER_W = config.hardware.PANEL_POWER_W;
export const PANEL_AREA_M2 = config.hardware.PANEL_AREA_M2;
export const BATTERY_UNIT_COST = config.hardware.BATTERY_UNIT_COST;
export const MAINTENANCE_COST = config.hardware.MAINTENANCE_COST;

// Production Factors (kWh/kWp) per Direction
export const DIRECTION_FACTORS: Record<CardinalDirection, number> = config.production.DIRECTION_FACTORS as Record<CardinalDirection, number>;
export const BASE_PRODUCTION_FACTOR = config.production.BASE_PRODUCTION_FACTOR;

// Energy Prices & Financials
export const PRICE_BUY_KWH = config.energy_prices.PRICE_BUY_KWH;
export const PRICE_SELL_KWH = config.energy_prices.PRICE_SELL_KWH;
export const ENERGY_INFLATION = config.energy_prices.ENERGY_INFLATION;

// Tiers and Rules
export const BATTERY_PRICING = config.battery_pricing_tiers;
export const SYSTEM_SELECTION_TIERS = config.system_selection_tiers;
export const SIM_PARAMS = config.simulation_params;
export const EV_EFFICIENCY = config.simulation_params.EV_EFFICIENCY_KWH_PER_KM;
export const CONTACT = config.contact;
export const BLUR_RESULTS_ENABLED = config.blur_results.ENABLED;
export const GEMINI_EXPERT_PROMPT = config.gemini_expert_prompt;

/**
 * getPanelPricePerKwp - Precise Pricing Calculation
 * Calculates the price per kWp for solar panels using linear interpolation 
 * between config tiers for maximum precision.
 * 
 * Example: if 4kWp is 850€ and 6kWp is 825€, 5kWp will be 837.5€
 */
export const getPanelPricePerKwp = (kwp: number): number => {
  const tiers = config.panel_pricing_tiers;
  
  // Edge cases: below lowest tier or above highest tier
  if (kwp <= tiers[0].kwp) return tiers[0].price;
  if (kwp >= tiers[tiers.length - 1].kwp) return tiers[tiers.length - 1].price;

  // Find the two tiers to interpolate between
  for (let i = 0; i < tiers.length - 1; i++) {
    const current = tiers[i];
    const next = tiers[i + 1];
    
    if (kwp >= current.kwp && kwp <= next.kwp) {
      // Linear interpolation: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
      const priceRange = next.price - current.price;
      const kwpRange = next.kwp - current.kwp;
      const progress = (kwp - current.kwp) / kwpRange;
      
      return current.price + (progress * priceRange);
    }
  }
  
  return tiers[tiers.length - 1].price;
};

