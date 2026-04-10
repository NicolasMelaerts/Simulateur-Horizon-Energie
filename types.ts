
export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type UserProfile = 'active' | 'home_office';

export interface UserInput {
  // Step 1: Base Info
  annualConsumption: number; // kWh/an
  address: string; // Google Maps Address string
  lat?: number;
  lng?: number;
  
  // Roof Specifics
  roofArea: number; // m² available
  roofSegments: CardinalDirection[]; // List of selected orientations (1 to 4)

  // Step 2: Detailed Profile
  userProfile: UserProfile;
  hasElectricVehicle: boolean;
  numElectricVehicles: number; // 1 or 2
  electricVehicleKm: number; // Km charged at home per year for VE1
  electricVehicle2Km: number; // Km charged at home per year for VE2
  hasHeatPump: boolean;
  hasSwimmingPool: boolean;
  hasElectricWaterHeater: boolean; // Domestic Hot Water
  hasAirConditioning: boolean;
}

export interface YearlyData {
  year: number;
  cumulativeNetGain: number; // Gain accumulated - maintenance
  cumulativeCost: number; // Initial investment
  annualGain: number;
}

export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: {
    pitchDegrees: number;
    azimuthDegrees: number;
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
  }[];
}

export interface SolarApiResponse {
  name: string;
  center: { latitude: number; longitude: number };
  solarPotential: {
    maxArrayPanelsCount: number;
    solarPanelConfigs: SolarPanelConfig[];
    maxArrayAreaMeters2: number;
    wholeRoofStats: {
      areaMeters2: number;
    }
  };
}

export interface SimulationResult {
  // Hardware
  systemSizeKwp: number;
  numberOfPanels: number;
  batteryCapacityKwh: number;
  inverterKva: number; // Added SigenStor Inverter Capacity
  
  // Production & Usage
  estimatedAnnualProduction: number; // kWh
  
  selfConsumptionRate: number; // % (Relative to Production)
  naturalSelfConsumptionRate: number; // % (Without Battery)
  batterySelfConsumptionBoost: number; // % (Gain from Battery)
  
  autonomyPercentage: number; // % (Relative to Consumption - Autonomie Facture)
  wasCapped: boolean; // True if capped at 75% of consumption

  selfConsumedEnergy: number; // kWh (Volume autoconsommé)
  injectedEnergy: number; // kWh (Volume injecté)
  
  // Financials
  capexPanels: number;
  capexBattery: number;
  totalInvestment: number;
  
  annualSavings: number; // From self-consumption
  annualSales: number; // From injection
  annualMaintenance: number;
  totalAnnualGain: number; // Savings + Sales
  monthlyGain: number; // Average monthly gain
  
  paybackPeriod: number; // Years
  roiPercentage: number; // %
  
  chartData: YearlyData[];
  
  // Solar API Specifics
  isSolarApiData?: boolean;
  warnings?: string[]; // Warnings like "Roof too small"
}
