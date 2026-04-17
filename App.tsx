import React, { useState } from 'react';
import { UserInput, SimulationResult } from './types';
import { calculateSimulation } from './services/solarMath';
import { generateExpertAnalysis, getCoordinatesFromAddress } from './services/geminiService';
import { fetchSolarData } from './services/solarApiService';
import { InputForm } from './components/InputForm';
import { ResultsDashboard } from './components/ResultsDashboard';
import { BLUR_RESULTS_ENABLED } from './constants';

const App: React.FC = () => {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<UserInput | null>(null);
  const [emailUnlocked, setEmailUnlocked] = useState<boolean>(false);

  const handleSimulate = async (input: UserInput) => {
    setLoading(true);
    setResult(null);
    setAiAnalysis(null);
    setUserInput(input);

    // 1. Get Coordinates if missing (using Gemini/Maps tool)
    let lat = input.lat;
    let lng = input.lng;

    if (!lat || !lng) {
      const coords = await getCoordinatesFromAddress(input.address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    // 2. Try fetching Google Solar API data if we have coords
    let solarData = null;
    if (lat && lng) {
      solarData = await fetchSolarData(lat, lng);
    }

    // 3. Run Simulation (with or without Solar Data)
    // Small delay to ensure UI updates are smooth
    setTimeout(async () => {
      const simResult = calculateSimulation(input, solarData);
      setResult(simResult);
      setLoading(false);

    }, 100);
  };

  const triggerAiAnalysis = async (input: UserInput, simResult: SimulationResult) => {
    setLoadingAi(true);
    // On récupère les data solaires si on les a déjà
    const lat = input.lat;
    const lng = input.lng;
    let hasSolarData = false;
    if (lat && lng) {
        // Optionnel: on pourrait refetch mais on suppose que c'est fait
        hasSolarData = true; 
    }
    
    const analysis = await generateExpertAnalysis(input, simResult, hasSolarData);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const handleReset = () => {
    setResult(null);
    setAiAnalysis(null);
    setEmailUnlocked(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-horizon-800 shadow-sm border-b border-gray-200 dark:border-horizon-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Logo Horizon-Energie.be */}
            <div className="flex items-center">
              <img
                src="./logo-horizon-dark.png"
                alt="Horizon Energie"
                className="h-16 w-auto block dark:hidden"
              />
              <img
                src="./logo-horizon-light.png"
                alt="Horizon Energie"
                className="h-16 w-auto hidden dark:block"
              />
            </div>
          </div>
          <div className="hidden md:block text-right">
             <div className="inline-flex flex-col items-end">
               <div className="text-sm font-extrabold text-horizon-900 bg-solar-50 px-4 py-1.5 rounded-full border border-solar-100 shadow-sm">
                 Simulateur Horizon Énergie
               </div>
               <div className="text-[10px] font-bold text-horizon-400 mt-1 uppercase tracking-widest mr-2">Wallonie & Bruxelles</div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {!result ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-horizon-900 tracking-tight">
                Simulateur <span className="text-solar-600">Horizon Énergie</span>
              </h2>
            </div>
            <InputForm onSimulate={handleSimulate} isSimulating={loading} />
          </div>
        ) : (
          <ResultsDashboard
            result={result}
            userInput={userInput!}
            aiAnalysis={aiAnalysis}
            loadingAi={loadingAi}
            onReset={handleReset}
            blurred={BLUR_RESULTS_ENABLED && !emailUnlocked}
            blurEnabled={BLUR_RESULTS_ENABLED}
            onEmailUnlock={() => {
              setEmailUnlocked(true);
              if (result && userInput) {
                triggerAiAnalysis(userInput, result);
              }
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;