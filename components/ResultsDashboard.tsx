import React, { useState } from 'react';
import { SimulationResult, UserInput } from '../types';
import { SimulationCharts } from './SimulationCharts';
import ReactMarkdown from 'react-markdown';
import { generateResultsPdf, downloadPdf } from '../services/pdfService';
import { CONTACT } from '../constants';
import emailjs from '@emailjs/browser';

interface ResultsDashboardProps {
  result: SimulationResult;
  userInput: UserInput;
  aiAnalysis: string | null;
  loadingAi: boolean;
  onReset: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, userInput, aiAnalysis, loadingAi, onReset }) => {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Calculate the split of autonomy between PV and Battery
  const totalRate = result.selfConsumptionRate || 1;
  const pvShareOfSavings = result.naturalSelfConsumptionRate / totalRate;
  const pvAutonomyPart = Math.round(result.autonomyPercentage * pvShareOfSavings);
  const batteryAutonomyPart = result.autonomyPercentage - pvAutonomyPart;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const pdf = await generateResultsPdf('results-dashboard', `Horizon_Energie_${formData.lastName || 'Simulation'}.pdf`);
    if (pdf) {
      downloadPdf(pdf, `Horizon_Energie_${formData.lastName || 'Simulation'}.pdf`);
    }
    setIsGeneratingPdf(false);
  };

  const handleSendQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);
    
    // Construct simulation details string
    const simulationDetails = `
      - Taille : ${result.systemSizeKwp} kWc (${result.numberOfPanels} panneaux)
      - Batterie : ${result.batteryCapacityKwh} kWh
      - Onduleur : ${result.inverterKva} kVA
      - Production est. : ${result.estimatedAnnualProduction} kWh/an
      - Autonomie : ${result.autonomyPercentage}%
      - ROI : ${result.paybackPeriod} ans
      - Investissement : ${result.totalInvestment} €
      - Économie annuelle : ${result.annualSavings} €
    `.trim();

    try {
      const templateParams = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        address: userInput.address,
        roof_area: userInput.roofArea,
        system_size: result.systemSizeKwp,
        panels_count: result.numberOfPanels,
        battery_capacity: result.batteryCapacityKwh,
        inverter_kva: result.inverterKva,
        annual_production: result.estimatedAnnualProduction,
        autonomy: result.autonomyPercentage,
        payback_period: result.paybackPeriod,
        investment: result.totalInvestment,
        annual_savings: result.annualSavings,
        ai_analysis: aiAnalysis || 'Analyse non générée'
      };

      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      
      setFormSubmitted(true);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      alert("Une erreur est survenue lors de l'envoi de votre demande. Veuillez nous contacter directement.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div id="results-dashboard" className="space-y-8 animate-fade-in pb-10">
      {/* Header Summary - HERO SECTION */}
      <div className="bg-horizon-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-solar-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 -ml-10 -mb-10"></div>
        
        {/* Badges */}
        <div className="flex flex-wrap gap-2 absolute top-4 right-4 md:right-8">
           {result.isSolarApiData && (
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1 text-[10px] font-bold text-solar-300 flex items-center">
              GOOGLE SOLAR API
            </div>
           )}
           <div className="bg-solar-500/20 backdrop-blur border border-solar-500/50 rounded-full px-3 py-1 text-[10px] font-bold text-solar-300 flex items-center shadow-lg shadow-solar-500/10">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              DIMENSIONNEMENT OPTIMISÉ TOUTE L'ANNÉE
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10 mt-6">
          {/* ROI Focus */}
          <div className="flex flex-col justify-center">
            <p className="text-horizon-300 text-xs font-bold uppercase tracking-widest mb-1">Retour sur Investissement</p>
            <p className="text-5xl font-extrabold text-solar-400">{result.paybackPeriod} <span className="text-2xl text-white font-bold">ans</span></p>
            <div className="inline-block bg-green-900/40 rounded-lg px-2 py-1 mt-2 border border-green-800/50 w-max">
                <span className="text-xs text-green-400 font-bold">Rentabilité Excellente</span>
            </div>
          </div>

          {/* Monthly Gain Focus */}
          <div className="flex flex-col justify-center">
             <p className="text-horizon-300 text-xs font-bold uppercase tracking-widest mb-1">Gain Mensuel Moyen</p>
             <p className="text-4xl font-extrabold text-white">+{result.monthlyGain} <span className="text-2xl text-horizon-400 font-normal">€</span></p>
             <p className="text-xs text-horizon-400 mt-2 font-medium">Économie directe sur factures</p>
          </div>

          {/* Kit Details */}
          <div className="lg:col-span-2 bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col justify-center">
            <p className="text-horizon-300 text-xs font-bold uppercase tracking-widest mb-3">Votre kit photovoltaïque hybride</p>
            <div className="flex items-center space-x-4">
                <div className="flex-1">
                    <p className="text-2xl font-bold text-white">{result.numberOfPanels} <span className="text-sm font-normal text-horizon-300">Panneaux</span></p>
                    <p className="text-xs text-solar-400">Trina Solar {result.systemSizeKwp} kWc</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex-1">
                    <p className="text-2xl font-bold text-white">{result.batteryCapacityKwh} <span className="text-sm font-normal text-horizon-300">kWh</span></p>
                    <p className="text-xs text-solar-400">Stockage Haute Densité</p>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex-1">
                    <p className="text-2xl font-bold text-white">{result.inverterKva} <span className="text-sm font-normal text-horizon-300">kVA</span></p>
                    <p className="text-xs text-solar-400">Onduleur Intelligent</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial & Performance Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Numbers Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-horizon-100">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Investment */}
               <div>
                  <h4 className="text-xs font-bold text-horizon-500 uppercase tracking-wide mb-4 border-b border-gray-100 pb-2">Investissement (HTVA)*</h4>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-horizon-900">{result.totalInvestment.toLocaleString()} €</span>
                  </div>
                  <div className="space-y-1 text-xs text-horizon-600">
                     <div className="flex justify-between">
                        <span>Photovoltaïque</span>
                        <span className="font-semibold">{result.capexPanels.toLocaleString()} €</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Batterie</span>
                        <span className="font-semibold">{result.capexBattery.toLocaleString()} €</span>
                     </div>
                  </div>
               </div>
               
               {/* Production & Performance */}
               <div>
                  <h4 className="text-xs font-bold text-horizon-500 uppercase tracking-wide mb-4 border-b border-gray-100 pb-2">Bilan de Performance</h4>
                  <div className="mb-3">
                    <p className="text-xs text-horizon-400 mb-1">Production annuelle est.</p>
                    <span className="text-2xl font-bold text-horizon-900">{result.estimatedAnnualProduction.toLocaleString()} <span className="text-sm font-medium">kWh</span></span>
                  </div>
                  
                  {/* Autoconsommation Visual */}
                  <div className="space-y-2">
                     <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold uppercase text-horizon-500">Autonomie estimée</span>
                           <span className="text-xl font-extrabold text-solar-600">{result.autonomyPercentage}%</span>
                        </div>
                     </div>
                     
                     <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex relative">
                        <div className="bg-solar-500 h-full" style={{ width: `${(result.naturalSelfConsumptionRate / totalRate) * 100}%` }}></div>
                        <div className="bg-blue-500 h-full" style={{ width: `${(result.batterySelfConsumptionBoost / totalRate) * 100}%` }}></div>
                     </div>
                     
                     <div className="flex justify-between text-[9px] font-medium text-horizon-400 mt-1">
                        <span className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-solar-500 mr-1"></div>
                          PV: {pvAutonomyPart}%
                        </span>
                        <span className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                          Batterie: {batteryAutonomyPart}%
                        </span>
                     </div>
                  </div>

                  <div className="mt-4">
                     <div className="p-3 bg-solar-50 rounded-xl border border-solar-200 flex flex-col justify-center items-center text-center">
                        <p className="text-[10px] font-bold text-solar-700 uppercase tracking-wide mb-1">Électricité Économisée</p>
                        <p className="text-2xl font-extrabold text-solar-600 leading-none">{result.selfConsumedEnergy.toLocaleString()} <span className="text-sm font-bold">kWh</span></p>
                     </div>
                  </div>
               </div>

               {/* Annual Gain Split */}
               <div>
                  <h4 className="text-xs font-bold text-horizon-500 uppercase tracking-wide mb-4 border-b border-gray-100 pb-2">Gains Annuels</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-green-700 uppercase">Économie</p>
                            <p className="text-sm font-bold text-horizon-600">{result.selfConsumedEnergy.toLocaleString()} kWh</p>
                        </div>
                        <span className="text-lg font-bold text-green-700">+{result.annualSavings.toLocaleString()} €</span>
                    </div>
                    <div className="flex items-center justify-between opacity-90">
                         <div>
                            <p className="text-xs font-bold text-orange-600 uppercase">Injection</p>
                            <p className="text-sm font-bold text-horizon-500">{result.injectedEnergy.toLocaleString()} kWh</p>
                        </div>
                        <span className="text-lg font-bold text-orange-600">+{result.annualSales.toLocaleString()} €</span>
                    </div>
                    <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-horizon-900">Total</span>
                        <span className="text-xl font-bold text-horizon-900">+{result.totalAnnualGain.toLocaleString()} €</span>
                    </div>
                  </div>
               </div>
             </div>
          </div>

          <SimulationCharts data={result.chartData} paybackYear={result.paybackPeriod} />
        </div>

        {/* AI Analysis & CTA */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-horizon-200 p-6 rounded-2xl shadow-lg h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <svg className="w-40 h-40 text-horizon-900" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
            </div>
            
            <div className="flex items-center space-x-3 mb-5 relative z-10">
              <div className="p-2.5 bg-horizon-800 rounded-xl shadow-md">
                <svg className="w-5 h-5 text-solar-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-horizon-900">Expert Horizon</h3>
                <p className="text-xs text-horizon-500 font-medium uppercase tracking-wide">Analyse du dimensionnement</p>
              </div>
            </div>
            
            <div className="flex-grow prose prose-sm prose-slate overflow-y-auto max-h-[400px] bg-gray-50 p-5 rounded-xl border border-horizon-100 relative z-10 text-sm leading-relaxed font-medium text-horizon-700">
              {loadingAi ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                  <div className="flex space-x-2">
                    <div className="w-2.5 h-2.5 bg-horizon-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-2.5 h-2.5 bg-horizon-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2.5 h-2.5 bg-horizon-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  <span className="text-xs text-horizon-500 font-semibold uppercase tracking-wide">Notre ingénieur IA Horizon Energie analyse votre dossier...</span>
                </div>
              ) : aiAnalysis ? (
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              ) : (
                <p className="text-horizon-400 italic text-center mt-10">L'analyse détaillée apparaîtra ici une fois la simulation lancée.</p>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-horizon-100 relative z-10 space-y-3">
              {showLeadForm ? (
                <div className="animate-fade-in bg-white p-4 rounded-xl border border-horizon-200 shadow-sm">
                   {formSubmitted ? (
                     <div className="text-center py-4">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h4 className="font-bold text-horizon-900">Demande envoyée !</h4>
                        <p className="text-xs text-horizon-500 mt-1">Un conseiller de Horizon Energie vous recontactera.</p>
                        <button onClick={() => {setShowLeadForm(false); setFormSubmitted(false);}} className="mt-4 text-xs font-bold text-solar-600 uppercase">Retour</button>
                     </div>
                   ) : (
                     <form onSubmit={handleSendQuoteRequest} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-horizon-500 uppercase mb-1">Prénom</label>
                            <input required name="firstName" value={formData.firstName} onChange={handleInputChange} type="text" className="w-full px-3 py-2 text-sm border border-horizon-200 rounded-lg focus:ring-1 focus:ring-solar-500 outline-none" placeholder="Jean" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-horizon-500 uppercase mb-1">Nom</label>
                            <input required name="lastName" value={formData.lastName} onChange={handleInputChange} type="text" className="w-full px-3 py-2 text-sm border border-horizon-200 rounded-lg focus:ring-1 focus:ring-solar-500 outline-none" placeholder="Dupont" />
                          </div>
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-horizon-500 uppercase mb-1">Téléphone</label>
                           <input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className="w-full px-3 py-2 text-sm border border-horizon-200 rounded-lg focus:ring-1 focus:ring-solar-500 outline-none" placeholder="04xx / xx xx xx" />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-horizon-500 uppercase mb-1">Email</label>
                           <input required name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full px-3 py-2 text-sm border border-horizon-200 rounded-lg focus:ring-1 focus:ring-solar-500 outline-none" placeholder="client@exemple.com" />
                        </div>
                        <button 
                          type="submit" 
                          disabled={isSendingEmail}
                          className="w-full py-3 bg-solar-500 text-white font-bold rounded-lg text-sm shadow-lg shadow-solar-100 hover:bg-solar-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                          {isSendingEmail ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Envoi en cours...
                            </>
                          ) : 'Envoyer ma demande'}
                        </button>
                     </form>
                   )}
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowLeadForm(true)}
                    className="w-full py-4 px-4 bg-solar-500 hover:bg-solar-600 text-white rounded-xl text-lg font-bold shadow-xl shadow-solar-100 transition-all transform hover:scale-[1.02] flex items-center justify-center group no-pdf"
                  >
                    Demandez un devis sur mesure
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                  
                  <button 
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="w-full py-3 px-4 bg-white border-2 border-solar-500 text-solar-600 hover:bg-solar-50 rounded-xl text-sm font-bold transition-all flex items-center justify-center group no-pdf disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-solar-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Génération du PDF...
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Télécharger mon rapport PDF
                      </>
                    )}
                  </button>

                  <button 
                    onClick={onReset}
                    className="w-full py-2 text-horizon-400 hover:text-horizon-600 text-xs font-bold uppercase tracking-widest transition-colors no-pdf"
                  >
                    Faire un nouvel essai
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Disclaimer Footnote */}
      <div className="text-center mt-4 pb-2 px-4 opacity-70">
         <p className="text-xs text-horizon-400 italic">
           * Ceci est une estimation. Un devis détaillé pourra être réalisé après étude technique.
         </p>
      </div>
    </div>
  );
};