import { UserInput, SimulationResult, YearlyData, SolarApiResponse } from '../types';
import { 
  PANEL_POWER_W, 
  PANEL_AREA_M2,
  MAINTENANCE_COST,
  DIRECTION_FACTORS,
  PRICE_BUY_KWH,
  PRICE_SELL_KWH,
  getPanelPricePerKwp,
  BASE_PRODUCTION_FACTOR,
  ENERGY_INFLATION,
  BATTERY_PRICING,
  SYSTEM_SELECTION_TIERS,
  SIM_PARAMS,
  EV_EFFICIENCY
} from '../constants';

export const calculateSimulation = (input: UserInput, solarData: SolarApiResponse | null = null): SimulationResult => {
  const warnings: string[] = [];

  // --- 1. SELECTION ALGORITHM (Updated for 6kWh / 10kWh multiples) ---
  
  // Target: Winter Over-sizing (140% of consumption)
  const targetKwp = (input.annualConsumption / 1000) * 1.4;
  let targetPanels = Math.ceil((targetKwp * 1000) / PANEL_POWER_W);
  
  let batteryCapacityKwh = 0;
  let inverterKva = 0;
  let maxSupportedPanels = 0;

  // Tiers logic from configuration
  const tier = SYSTEM_SELECTION_TIERS.find(t => input.annualConsumption < t.maxConsumption) 
               || SYSTEM_SELECTION_TIERS[SYSTEM_SELECTION_TIERS.length - 1];
               
  batteryCapacityKwh = tier.batteryKwh;
  inverterKva = tier.inverterKva;
  maxSupportedPanels = tier.maxPanels;

  // --- 2. PHYSICAL CONSTRAINTS (Roof Area & Hardware Limits) ---
  
  const maxPanelsPhysical = Math.floor(input.roofArea / PANEL_AREA_M2);
  
  // Apply Solar API limit if available and stricter
  let limit = maxPanelsPhysical;
  let isSolarApiData = false;
  if (solarData && solarData.solarPotential.maxArrayPanelsCount > 0) {
     if (solarData.solarPotential.maxArrayPanelsCount < limit) {
        limit = solarData.solarPotential.maxArrayPanelsCount;
        isSolarApiData = true;
     }
  }

  // Determine final number of panels
  let numberOfPanels = targetPanels;
  
  if (numberOfPanels > maxSupportedPanels) {
     numberOfPanels = maxSupportedPanels;
  }
  
  if (numberOfPanels > limit) {
      numberOfPanels = limit;
      warnings.push(`Surface de toiture limitante. Système réduit à ${numberOfPanels} panneaux.`);
  }

  // Minimum Tech Check
  if (numberOfPanels < 6) {
      numberOfPanels = 6;
      if (numberOfPanels > limit) warnings.push("Attention: Toiture très petite pour le système hybride.");
  }

  const systemSizeKwp = (numberOfPanels * PANEL_POWER_W) / 1000;


  // --- 3. PRODUCTION ESTIMATION ---
  
  let productionFactor = BASE_PRODUCTION_FACTOR;

  if (input.roofSegments && input.roofSegments.length > 0) {
      let totalFactor = 0;
      input.roofSegments.forEach(direction => {
          totalFactor += DIRECTION_FACTORS[direction];
      });
      productionFactor = totalFactor / input.roofSegments.length;
  }
  
  const estimatedAnnualProduction = systemSizeKwp * productionFactor;


  // --- 4. SELF-CONSUMPTION & AUTONOMY ---
  
  const baseSelfConsumption = SIM_PARAMS.BASE_SELF_CONSUMPTION;
  
  let profileMultiplier = 1.0;
  if (input.userProfile === 'home_office') profileMultiplier = 1.4; 
  
  if (input.hasHeatPump) profileMultiplier *= 0.85; 
  if (input.hasElectricVehicle) {
      const totalKm = input.electricVehicleKm + (input.numElectricVehicles === 2 ? input.electricVehicle2Km : 0);
      const evConsumption = totalKm * EV_EFFICIENCY;
      const evRatio = evConsumption / input.annualConsumption;
      const evMalus = 1.0 - (evRatio * 0.5); 
      profileMultiplier *= Math.max(0.7, evMalus); 
  }
  if (input.hasElectricWaterHeater) profileMultiplier *= 0.95; 
  if (input.hasAirConditioning) profileMultiplier *= 1.1; 
  
  let theoreticalNaturalRate = baseSelfConsumption * profileMultiplier;
  
  // Battery Boost logic adjusted for 12/18/30 kWh sizes
  const dailyConsumption = input.annualConsumption / 365;
  const batteryToConsRatio = batteryCapacityKwh / dailyConsumption; 
  
  let theoreticalBatteryBoost = SIM_PARAMS.THEORETICAL_BATTERY_BOOST; 
  if (batteryToConsRatio < 0.5) {
      theoreticalBatteryBoost = SIM_PARAMS.THEORETICAL_BATTERY_BOOST * 0.75; 
  } else if (batteryToConsRatio > 1.0) {
      theoreticalBatteryBoost = SIM_PARAMS.THEORETICAL_BATTERY_BOOST * 1.25; 
  }

  let rawSelfConsumptionRate = theoreticalNaturalRate + theoreticalBatteryBoost;
  if (rawSelfConsumptionRate > SIM_PARAMS.MAX_SELF_CONSUMPTION_CAP) rawSelfConsumptionRate = SIM_PARAMS.MAX_SELF_CONSUMPTION_CAP; 

  let rawConsumedEnergy = estimatedAnnualProduction * rawSelfConsumptionRate;
  
  // Autonomy limit from configuration
  const maxAllowedConsumption = input.annualConsumption * SIM_PARAMS.MAX_AUTONOMY_RATE;
  
  let finalConsumedEnergy = rawConsumedEnergy;
  let wasCapped = false;

  if (finalConsumedEnergy > maxAllowedConsumption) {
      finalConsumedEnergy = maxAllowedConsumption;
      wasCapped = true;
  }

  const finalSelfConsumptionRate = finalConsumedEnergy / estimatedAnnualProduction;
  const scalingFactor = wasCapped ? (finalConsumedEnergy / rawConsumedEnergy) : 1.0;
  
  const finalNaturalRate = theoreticalNaturalRate * scalingFactor;
  const effectiveBatteryBoost = finalSelfConsumptionRate - finalNaturalRate;
  
  const autonomyPercentage = (finalConsumedEnergy / input.annualConsumption) * 100;

  // --- 5. FINANCIALS ---

  const pricePerKwp = getPanelPricePerKwp(systemSizeKwp);
  const capexPanels = systemSizeKwp * pricePerKwp;
  
  // CAPEX Battery (Using tiers from config)
  let capexBattery = 0;
  const batteryTier = BATTERY_PRICING.find(b => b.capacity === batteryCapacityKwh);
  if (batteryTier) {
      capexBattery = batteryTier.price;
  } else {
      // Fallback to per-kWh pricing if no exact tier match
      capexBattery = batteryCapacityKwh * 450; 
  }

  const totalInvestment = capexPanels + capexBattery;
  const injectedEnergy = estimatedAnnualProduction - finalConsumedEnergy;

  const annualSavings = finalConsumedEnergy * PRICE_BUY_KWH; 
  const annualSales = injectedEnergy * PRICE_SELL_KWH; 

  const totalAnnualGain = annualSavings + annualSales;
  const monthlyGain = totalAnnualGain / 12;

  const paybackPeriod = totalInvestment / (totalAnnualGain - MAINTENANCE_COST);
  const roiPercentage = ((totalAnnualGain - MAINTENANCE_COST) / totalInvestment) * 100;

  // --- 6. CHART DATA ---
  
  const chartData: YearlyData[] = [];
  let cumulative = -totalInvestment;
  const energyInflation = ENERGY_INFLATION;

  for (let i = 1; i <= 20; i++) {
    const adjustedGain = (totalAnnualGain * Math.pow(1 + energyInflation, i-1)) - MAINTENANCE_COST;
    cumulative += adjustedGain;
    
    chartData.push({
      year: i,
      cumulativeNetGain: Math.round(cumulative),
      cumulativeCost: totalInvestment,
      annualGain: Math.round(adjustedGain)
    });
  }

  return {
    systemSizeKwp: Math.round(systemSizeKwp * 100) / 100,
    numberOfPanels,
    batteryCapacityKwh,
    inverterKva,
    estimatedAnnualProduction: Math.round(estimatedAnnualProduction),
    
    selfConsumptionRate: Math.round(finalSelfConsumptionRate * 100),
    naturalSelfConsumptionRate: Math.round(finalNaturalRate * 100),
    batterySelfConsumptionBoost: Math.round(effectiveBatteryBoost * 100),
    
    autonomyPercentage: Math.round(autonomyPercentage),
    wasCapped,

    selfConsumedEnergy: Math.round(finalConsumedEnergy), 
    injectedEnergy: Math.round(injectedEnergy), 
    
    capexPanels,
    capexBattery,
    totalInvestment,
    annualSavings: Math.round(annualSavings),
    annualSales: Math.round(annualSales),
    annualMaintenance: MAINTENANCE_COST,
    totalAnnualGain: Math.round(totalAnnualGain),
    monthlyGain: Math.round(monthlyGain),
    paybackPeriod: Math.round(paybackPeriod * 10) / 10,
    roiPercentage: Math.round(roiPercentage * 10) / 10,
    chartData,
    isSolarApiData,
    warnings
  };
};