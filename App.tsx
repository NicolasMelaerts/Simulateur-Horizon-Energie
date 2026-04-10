import React, { useState } from 'react';
import { UserInput, SimulationResult } from './types';
import { calculateSimulation } from './services/solarMath';
import { generateExpertAnalysis, getCoordinatesFromAddress } from './services/geminiService';
import { fetchSolarData } from './services/solarApiService';
import { InputForm } from './components/InputForm';
import { ResultsDashboard } from './components/ResultsDashboard';

const App: React.FC = () => {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<UserInput | null>(null);

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

      // 4. Trigger Expert Analysis
      setLoadingAi(true);
      const analysis = await generateExpertAnalysis(input, simResult, !!solarData);
      setAiAnalysis(analysis);
      setLoadingAi(false);
    }, 100);
  };

  const handleReset = () => {
    setResult(null);
    setAiAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Logo Horizon-Energie.be */}
            <div className="flex items-center">
              {/* Green Spark/Sun Icon (Rounded Rays) */}
              <div className="mr-3 text-solar-500">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C12.55 2 13 2.45 13 3V6C13 6.55 12.55 7 12 7C11.45 7 11 6.55 11 6V3C11 2.45 11.45 2 12 2Z" />
                  <path d="M12 17C12.55 17 13 17.45 13 18V21C13 21.55 12.55 22 12 22C11.45 22 11 21.55 11 21V18C11 17.45 11.45 17 12 17Z" />
                  <path d="M2 12C2 11.45 2.45 11 3 11H6C6.55 11 7 11.45 7 12C7 12.55 6.55 13 6 13H3C2.45 13 2 12.55 2 12Z" />
                  <path d="M17 12C17 11.45 17.45 11 18 11H21C21.55 11 22 11.45 22 12C22 12.55 21.55 13 21 13H18C17.45 13 17 12.55 17 12Z" />
                  <path d="M4.92896 4.92893C5.31948 4.53841 5.95265 4.53841 6.34317 4.92893L8.46449 7.05025C8.85501 7.44078 8.85501 8.07394 8.46449 8.46447C8.07397 8.85499 7.4408 8.85499 7.05028 8.46447L4.92896 6.34315C4.53843 5.95262 4.53843 5.31946 4.92896 4.92893Z" />
                  <path d="M15.5355 15.5355C15.926 15.145 16.5592 15.145 16.9497 15.5355L19.0711 17.6569C19.4616 18.0474 19.4616 18.6805 19.0711 19.0711C18.6806 19.4616 18.0474 19.4616 17.6569 19.0711L15.5355 16.9497C15.145 16.5592 15.145 15.9261 15.5355 15.5355Z" />
                  <path d="M19.0711 4.92893C19.4616 5.31946 19.4616 5.95262 19.0711 6.34315L16.9498 8.46447C16.5592 8.85499 15.9261 8.85499 15.5356 8.46447C15.145 8.07394 15.145 7.44078 15.5356 7.05025L17.6569 4.92893C18.0474 4.53841 18.6806 4.53841 19.0711 4.92893Z" />
                  <path d="M8.46447 15.5355C8.85499 15.9261 8.85499 16.5592 8.46447 16.9497L6.34315 19.0711C5.95262 19.4616 5.31946 19.4616 4.92893 19.0711C4.53841 18.6805 4.53841 18.0474 4.92893 17.6569L7.05025 15.5355C7.44078 15.145 8.07394 15.145 8.46447 15.5355Z" />
                </svg>
              </div>
              
              {/* Text Logo */}
              <div className="flex flex-col justify-center">
                <div className="flex flex-col leading-none">
                  <span className="text-3xl font-extrabold text-black tracking-tight">Horizon</span>
                  <span className="text-3xl font-extrabold text-black tracking-tight -mt-1">Energie</span>
                </div>
                <span className="text-solar-500 text-[11px] font-bold tracking-widest uppercase mt-1">
                  Votre énergie, notre défi.
                </span>
              </div>
            </div>
          </div>
          <div className="hidden md:block text-right">
             <div className="text-sm font-bold text-horizon-800 bg-horizon-50 px-3 py-1 rounded-full border border-horizon-100">
               Simulateur photovoltaïque
             </div>
             <div className="text-xs text-horizon-500 mt-1 pr-2">Wallonie & Bruxelles</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {!result ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-horizon-900">
                Simulateur photovoltaïque
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
          />
        )}
      </main>
    </div>
  );
};

export default App;