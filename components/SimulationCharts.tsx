import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { YearlyData } from '../types';

interface SimulationChartsProps {
  data: YearlyData[];
  paybackYear: number;
}

export const SimulationCharts: React.FC<SimulationChartsProps> = ({ data, paybackYear }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-horizon-100">
      <h3 className="text-xl font-bold text-horizon-900 mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2 text-solar-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        Flux Financier & ROI
      </h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 10,
              right: 5,
              left: -15,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} />
            
            {/* Left Y-axis for Cumulative Cashflow */}
            <YAxis 
              yAxisId="left"
              tickFormatter={(v) => `${v/1000}k`} 
              tick={{fontSize: 11, fill: '#64748b'}} 
              tickLine={false} 
              axisLine={false}
              width={40}
            />

            {/* Right Y-axis for Annual Gain (Scaled separately for visibility) */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${v}€`}
              tick={{fontSize: 10, fill: '#94a3b8'}}
              tickLine={false}
              axisLine={false}
              width={50}
            />

            <Tooltip 
              formatter={(value: number, name: string) => {
                const isCumulative = name === 'cumulativeNetGain';
                const label = isCumulative ? 'Cashflow Cumulé' : 'Gain de l\'année';
                return [`${value.toLocaleString('fr-BE')} €`, label];
              }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'inherit' }}
            />
            
            <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeWidth={1} />
            
            <ReferenceLine 
              yAxisId="left"
              x={paybackYear} 
              stroke="#22c55e" 
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{ value: 'Rentabilité', position: 'insideTopLeft', fill: '#15803d', fontSize: 10, fontWeight: 700 }} 
            />

            {/* Horizon Blue Bars for Annual Gain (on secondary axis) */}
            <Bar 
              yAxisId="right"
              dataKey="annualGain" 
              fill="#0f172a" 
              barSize={12} 
              radius={[4, 4, 0, 0]} 
              opacity={0.15} 
            />

            {/* Solar Green Line for Cumulative (on primary axis) */}
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="cumulativeNetGain" 
              stroke="#22c55e" 
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-horizon-500 mt-4 text-center font-medium">
        La ligne <span className="text-solar-600 font-bold">verte</span> représente votre bénéfice net cumulé.
      </p>
    </div>
  );
};