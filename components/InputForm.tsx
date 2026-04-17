import React, { useState, useEffect } from 'react';
import { UserInput, CardinalDirection, UserProfile } from '../types';
import { EV_EFFICIENCY } from '../constants';
import { fetchSolarData } from '../services/solarApiService';
import { getCoordinatesFromAddress, estimateRoofWithAI } from '../services/geminiService';

interface InputFormProps {
  onSimulate: (data: UserInput) => void;
  isSimulating: boolean;
}

const ORIENTATION_OPTIONS: { value: CardinalDirection; label: string; icon: string }[] = [
  { value: 'S', label: 'Sud', icon: '↓' },
  { value: 'SE', label: 'Sud-Est', icon: '↘' },
  { value: 'SW', label: 'Sud-Ouest', icon: '↙' },
  { value: 'E', label: 'Est', icon: '→' },
  { value: 'W', label: 'Ouest', icon: '←' },
  { value: 'NE', label: 'Nord-Est', icon: '↗' },
  { value: 'NW', label: 'Nord-Ouest', icon: '↖' },
  { value: 'N', label: 'Nord', icon: '↑' },
];

const azimuthToCardinal = (azimuth: number): CardinalDirection => {
  const normalized = (azimuth + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  if (normalized >= 292.5 && normalized < 337.5) return 'NW';
  return 'S';
};

export const InputForm: React.FC<InputFormProps> = ({ onSimulate, isSimulating }) => {
  const [step, setStep] = useState<number>(1);
  const [numRoofSegments, setNumRoofSegments] = useState<number>(1);
  
  const [formData, setFormData] = useState<UserInput>({
    annualConsumption: 5000,
    address: '',
    roofArea: 50,
    roofSegments: ['S'],
    userProfile: 'active',
     hasElectricVehicle: false,
     numElectricVehicles: 1,
     electricVehicleKm: 15000,
     electricVehicle2Km: 15000,
     hasHeatPump: false,
    hasSwimmingPool: false,
    hasElectricWaterHeater: false,
    hasAirConditioning: false
  });
  
  const [mapUrl, setMapUrl] = useState<string>('');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address.length > 3) {
        let query = encodeURIComponent(formData.address);
        setMapUrl(`https://maps.google.com/maps?q=${query}&t=h&z=20&ie=UTF8&iwloc=&output=embed`);
        setShowMap(true);
      } else {
        setShowMap(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.address]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'address') {
      setFormData(prev => ({ ...prev, address: value, lat: undefined, lng: undefined }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                 (name === 'annualConsumption' || name === 'roofArea' || name === 'electricVehicleKm' ? parseFloat(value) : value)
      }));
    }
  };

  const handleSegmentChange = (index: number, value: CardinalDirection) => {
    const newSegments = [...formData.roofSegments];
    newSegments[index] = value;
    setFormData(prev => ({ ...prev, roofSegments: newSegments }));
  };

  const handleNumSegmentsChange = (count: number) => {
    setNumRoofSegments(count);
    
    // Adjust array size
    const current = [...formData.roofSegments];
    if (count > current.length) {
        // Add defaults
        for (let i = current.length; i < count; i++) {
            current.push('S');
        }
    } else {
        // Trim
        current.splice(count);
    }
    setFormData(prev => ({ ...prev, roofSegments: current }));
  };

  const handleProfileChange = (profile: UserProfile) => {
    setFormData(prev => ({ ...prev, userProfile: profile }));
  };

  const handleGeolocation = () => {
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      alert("La géolocalisation nécessite une connexion sécurisée (HTTPS). Veuillez activer le SSL sur votre domaine ou entrer l'adresse manuellement.");
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ 
            ...prev, 
            address: `${latitude}, ${longitude}`,
            lat: latitude,
            lng: longitude
          }));
        },
        (error) => {
          console.error("Erreur de géolocalisation", error);
          alert("Impossible de vous localiser. Veuillez vérifier que vous avez autorisé l'accès à votre position ou entrez l'adresse manuellement.");
        }
      );
    }
  };

  const handleAnalyze = async () => {
    alert("La fonctionnalité d'analyse de toiture par IA est en cours de développement et sera disponible prochainement.");
  };



  const handleNext = () => {
    if (formData.address.length < 5) {
      alert("Veuillez entrer une adresse valide.");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate(formData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-horizon-100 relative overflow-hidden">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-horizon-100">
        <div 
          className="h-full bg-solar-500 transition-all duration-500 ease-out"
          style={{ width: step === 1 ? '50%' : '100%' }}
        ></div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        
        {/* STEP 1: PROJET & LOCALISATION */}
        <div className={step === 1 ? 'block animate-fade-in' : 'hidden'}>
          <div className="border-b border-horizon-100 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-horizon-900">1. Votre Projet</h2>
            <p className="text-horizon-500 text-sm mt-1">Localisation et configuration toiture</p>
          </div>

          <div className="space-y-6">
            {/* Address Input */}
            <div className="space-y-3">
              <label htmlFor="address" className="block text-sm font-bold text-horizon-700 flex justify-between items-center">
                <span>Adresse du bâtiment</span>
                <button 
                  type="button" 
                  onClick={handleGeolocation}
                  className="text-xs text-solar-600 hover:text-solar-700 flex items-center font-bold uppercase tracking-wide"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Géolocaliser
                </button>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="address"
                  id="address"
                  required={step === 1}
                  placeholder="Rue, Numéro, Ville"
                  value={formData.address}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-horizon-200 py-3 pl-4 bg-gray-50 border focus:border-solar-500 focus:ring-solar-500 text-horizon-900 sm:text-lg transition-shadow shadow-sm font-medium"
                />
              </div>
              
              {/* Map Preview */}
              <div className={`transition-all duration-700 ease-in-out overflow-hidden ${showMap ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <div className="rounded-xl overflow-hidden border border-horizon-200 shadow-md relative h-56 bg-horizon-50 group">
                  <iframe 
                    width="100%" height="100%" frameBorder="0" src={mapUrl}
                    allowFullScreen title="Vue Aérienne"
                    className="absolute inset-0 w-full h-full object-cover"
                  ></iframe>
                   <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] text-horizon-800 font-bold shadow pointer-events-none">
                     Vue Satellite
                   </div>
                   
                   {/* Overlay Button for Analysis */}
                   <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="bg-white text-horizon-900 px-4 py-2 rounded-full font-bold text-sm shadow-xl border border-horizon-100 flex items-center space-x-2 transform hover:scale-105 transition-transform"
                      >
                         {isAnalyzing ? (
                           <>
                             <svg className="animate-spin h-4 w-4 text-solar-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             <span>Analyse...</span>
                           </>
                         ) : (
                           <>
                             <span>✨ Analyser ma toiture</span>
                           </>
                         )}
                      </button>
                   </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-horizon-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-xs text-horizon-600">Le bas de la carte indique le <strong>Sud</strong>.</p>
                    </div>
                    {!isAnalyzing && (
                      <button 
                        type="button" 
                        onClick={handleAnalyze}
                        className="text-[10px] font-extrabold text-solar-600 uppercase tracking-widest hover:text-solar-700"
                      >
                        Scanner la forme du toit
                      </button>
                    )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label htmlFor="annualConsumption" className="block text-sm font-bold text-horizon-700">Consommation Annuelle</label>
                  <span className="text-lg font-bold text-solar-600 bg-solar-50 px-2 py-0.5 rounded-lg border border-solar-200">{formData.annualConsumption.toLocaleString()} kWh/an</span>
                </div>
                <div className="relative pt-2">
                  <input
                    type="range"
                    name="annualConsumption"
                    id="annualConsumption"
                    min="2000"
                    max="20000"
                    step="100"
                    value={formData.annualConsumption}
                    onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-solar-500"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-horizon-400 mt-2 uppercase tracking-tighter">
                    <span>2.000 kWh</span>
                    <span>10.000 kWh</span>
                    <span>20.000 kWh</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="roofArea" className="block text-sm font-bold text-horizon-700">Surface de toiture estimée</label>
                <div className="relative">
                  <input
                    type="number"
                    name="roofArea"
                    id="roofArea"
                    min="10" step="5" required={step === 1}
                    value={formData.roofArea}
                    onChange={handleChange}
                    className="block w-full rounded-lg border-horizon-200 pl-4 pr-12 py-3 bg-gray-50 border focus:border-solar-500 focus:ring-solar-500 sm:text-lg font-medium text-horizon-900"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-horizon-400 text-sm font-medium">m²</span>
                </div>
              </div>
            </div>

            {/* Roof Configuration Multi-Segment */}
            <div className="bg-white p-5 rounded-xl border border-horizon-200 shadow-sm space-y-6">
               <div>
                 <div className="flex justify-between items-end mb-4">
                    <div>
                      <label className="block text-sm font-bold text-horizon-700">
                        Configuration de votre toiture
                      </label>
                      <p className="text-xs text-horizon-500 mt-1">Nombre de versants exposés au soleil</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleNumSegmentsChange(num)}
                        className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                          numRoofSegments === num
                            ? 'bg-solar-500 text-white border-solar-500 shadow-md'
                            : 'bg-gray-50 text-horizon-600 border-horizon-200 hover:border-horizon-300'
                        }`}
                      >
                        {num} {num > 1 ? 'Versants' : 'Versant'}
                      </button>
                    ))}
                 </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                 {formData.roofSegments.map((segment, index) => (
                    <div key={index} className="relative group">
                       <div className="absolute -top-2.5 left-4 px-2 bg-white text-[10px] font-black text-horizon-400 uppercase tracking-widest z-10">
                          Versant {index + 1}
                       </div>
                       <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${segment === 'S' || segment === 'SE' || segment === 'SW' ? 'bg-solar-50/30' : 'bg-white'}`}>
                          <div className="w-10 h-10 rounded-full bg-horizon-100 flex items-center justify-center text-xl font-bold text-horizon-800 shadow-inner">
                             {ORIENTATION_OPTIONS.find(o => o.value === segment)?.icon}
                          </div>
                          <div className="flex-1">
                             <select
                               value={segment}
                               title="Orientation du versant"
                               onChange={(e) => handleSegmentChange(index, e.target.value as CardinalDirection)}
                               className="block w-full border-none bg-transparent p-0 focus:ring-0 text-sm font-bold text-horizon-900 cursor-pointer"
                             >
                               {ORIENTATION_OPTIONS.map((opt) => (
                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                               ))}
                             </select>
                             <div className="text-[10px] text-horizon-400 font-bold uppercase mt-0.5">
                               {segment === 'S' ? 'Exposition Optimale' : 'Exposition Standard'}
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
               </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="w-full py-4 px-4 rounded-xl shadow-lg shadow-horizon-200 text-lg font-bold text-white bg-solar-500 hover:bg-solar-600 transition-all transform hover:scale-[1.01] flex justify-center items-center group"
              >
                Étape Suivante
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* STEP 2: PROFIL & ÉQUIPEMENTS */}
        <div className={step === 2 ? 'block animate-fade-in' : 'hidden'}>
          <div className="border-b border-horizon-100 pb-4 mb-6">
             <button type="button" onClick={handleBack} className="text-sm text-horizon-500 hover:text-horizon-700 mb-2 flex items-center font-medium">
               <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
               Retour
             </button>
            <h2 className="text-2xl font-bold text-horizon-900">2. Profil de Consommation</h2>
            <p className="text-horizon-500 text-sm mt-1">Affinez la simulation selon vos habitudes.</p>
          </div>

          <div className="space-y-8">
            {/* User Profile Selection */}
            <div>
              <label className="block text-sm font-bold text-horizon-700 mb-3">Votre profil d'occupation</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => handleProfileChange('active')}
                  className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${formData.userProfile === 'active' ? 'border-solar-500 bg-solar-50' : 'border-horizon-200 bg-white hover:border-horizon-300'}`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">🏢</span>
                    <span className="font-bold text-horizon-900">Absent en journée la semaine</span>
                  </div>
                  <p className="text-xs text-horizon-600 leading-relaxed">
                    Vous êtes absent en journée (8h-17h). La consommation se concentre le soir et le week-end.
                  </p>
                </div>

                <div 
                  onClick={() => handleProfileChange('home_office')}
                  className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${formData.userProfile === 'home_office' ? 'border-solar-500 bg-solar-50' : 'border-horizon-200 bg-white hover:border-horizon-300'}`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">🏡</span>
                    <span className="font-bold text-horizon-900">Présent en journée la semaine</span>
                  </div>
                  <p className="text-xs text-horizon-600 leading-relaxed">
                    Présence régulière en journée. Vous lancez vos machines quand il y a du soleil.
                  </p>
                </div>
              </div>
            </div>

            {/* Equipments Checkboxes */}
            <div>
              <label className="block text-sm font-bold text-horizon-700 mb-3">Équipements spécifiques</label>
              <div className="space-y-3">
                <label className={`flex items-center p-4 rounded-xl border border-horizon-200 cursor-pointer transition-colors ${formData.hasHeatPump ? 'bg-horizon-50 border-horizon-400' : 'hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    name="hasHeatPump"
                    checked={formData.hasHeatPump}
                    onChange={handleChange}
                    className="h-5 w-5 text-solar-600 focus:ring-solar-500 border-gray-300 rounded mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-horizon-900 flex items-center">
                      <span className="mr-2">❄️</span> Pompe à Chaleur (Chauffage)
                    </div>
                    <div className="text-xs text-horizon-500 mt-0.5">Consommation forte en hiver.</div>
                  </div>
                </label>
                
                <label className={`flex items-center p-4 rounded-xl border border-horizon-200 cursor-pointer transition-colors ${formData.hasElectricWaterHeater ? 'bg-horizon-50 border-horizon-400' : 'hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    name="hasElectricWaterHeater"
                    checked={formData.hasElectricWaterHeater}
                    onChange={handleChange}
                    className="h-5 w-5 text-solar-600 focus:ring-solar-500 border-gray-300 rounded mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-horizon-900 flex items-center">
                      <span className="mr-2">💧</span> Boiler Électrique (Eau Chaude)
                    </div>
                    <div className="text-xs text-horizon-500 mt-0.5">Consommation régulière toute l'année.</div>
                  </div>
                </label>

                <div className={`p-4 rounded-xl border border-horizon-200 transition-colors ${formData.hasElectricVehicle ? 'bg-horizon-50 border-horizon-400' : 'hover:bg-gray-50'}`}>
                   <label className="flex items-center cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      name="hasElectricVehicle"
                      checked={formData.hasElectricVehicle}
                      onChange={handleChange}
                      className="h-5 w-5 text-solar-600 focus:ring-solar-500 border-gray-300 rounded mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-horizon-900 flex items-center">
                        <span className="mr-2">🚗</span> Véhicule Électrique (VE)
                      </div>
                      <div className="text-xs text-horizon-500 mt-0.5">Charge importante à domicile.</div>
                    </div>
                  </label>
                  
                  {formData.hasElectricVehicle && (
                    <div className="mt-3 pl-8 animate-fade-in space-y-4">
                       {/* Selector 1/2 Vehicles */}
                       <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                          {[1, 2].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, numElectricVehicles: n }))}
                              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                formData.numElectricVehicles === n 
                                ? 'bg-white text-solar-600 shadow-sm' 
                                : 'text-horizon-400 hover:text-horizon-600'
                              }`}
                            >
                              {n} {n > 1 ? 'Véhicules' : 'Véhicule'}
                            </button>
                          ))}
                       </div>

                       <div className="space-y-3">
                          <div className="space-y-1">
                             <label htmlFor="electricVehicleKm" className="block text-[10px] font-bold text-horizon-600 uppercase tracking-tight">
                               Km annuels {formData.numElectricVehicles === 2 ? '- Véhicule 1' : ''}
                             </label>
                             <div className="relative">
                              <input
                                type="number"
                                name="electricVehicleKm"
                                id="electricVehicleKm"
                                min="0" step="100"
                                value={formData.electricVehicleKm}
                                onChange={handleChange}
                                className="block w-full rounded-lg border-horizon-300 py-2 pl-3 pr-16 bg-white border focus:border-solar-500 focus:ring-solar-500 text-sm"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-horizon-400 text-xs font-bold">km/an</span>
                             </div>
                          </div>

                          {formData.numElectricVehicles === 2 && (
                            <div className="space-y-1 animate-fade-in">
                               <label htmlFor="electricVehicle2Km" className="block text-[10px] font-bold text-horizon-600 uppercase tracking-tight">
                                 Km annuels - Véhicule 2
                               </label>
                               <div className="relative">
                                <input
                                  type="number"
                                  name="electricVehicle2Km"
                                  id="electricVehicle2Km"
                                  min="0" step="100"
                                  value={formData.electricVehicle2Km}
                                  onChange={handleChange}
                                  className="block w-full rounded-lg border-horizon-300 py-2 pl-3 pr-16 bg-white border focus:border-solar-500 focus:ring-solar-500 text-sm"
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-horizon-400 text-xs font-bold">km/an</span>
                               </div>
                            </div>
                          )}
                       </div>

                       <p className="text-[10px] text-solar-600 mt-1 font-medium">
                         ~{Math.round((formData.electricVehicleKm + (formData.numElectricVehicles === 2 ? formData.electricVehicle2Km : 0)) * EV_EFFICIENCY).toLocaleString()} kWh/an estimés (sur base de {Math.round(EV_EFFICIENCY * 100)}kWh/100km)
                       </p>
                    </div>
                  )}
                </div>

                <label className={`flex items-center p-4 rounded-xl border border-horizon-200 cursor-pointer transition-colors ${formData.hasSwimmingPool ? 'bg-horizon-50 border-horizon-400' : 'hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    name="hasSwimmingPool"
                    checked={formData.hasSwimmingPool}
                    onChange={handleChange}
                    className="h-5 w-5 text-solar-600 focus:ring-solar-500 border-gray-300 rounded mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-horizon-900 flex items-center">
                      <span className="mr-2">🏊</span> Piscine / Wellness
                    </div>
                    <div className="text-xs text-horizon-500 mt-0.5">Consommation estivale (filtration/PAC).</div>
                  </div>
                </label>

                <label className={`flex items-center p-4 rounded-xl border border-horizon-200 cursor-pointer transition-colors ${formData.hasAirConditioning ? 'bg-horizon-50 border-horizon-400' : 'hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    name="hasAirConditioning"
                    checked={formData.hasAirConditioning}
                    onChange={handleChange}
                    className="h-5 w-5 text-solar-600 focus:ring-solar-500 border-gray-300 rounded mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-horizon-900 flex items-center">
                      <span className="mr-2">🌬️</span> Climatisation
                    </div>
                    <div className="text-xs text-horizon-500 mt-0.5">Consomme quand le soleil brille (Été).</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4 sticky bottom-0 bg-white pb-2 z-10 border-t border-horizon-100 mt-6">
              <button
                type="submit"
                disabled={isSimulating}
                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-solar-200 text-lg font-bold text-white bg-solar-500 hover:bg-solar-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-solar-500 transition-all transform hover:scale-[1.01] ${
                  isSimulating ? 'opacity-75 cursor-wait' : ''
                }`}
              >
                {isSimulating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calcul SigenStor en cours...
                  </span>
                ) : (
                  'Lancer la Simulation'
                )}
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};