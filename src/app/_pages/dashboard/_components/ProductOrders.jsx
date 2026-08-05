import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const data = {
  labels: ['Sedan', 'SUV','Hatchback'],
  datasets: [
    {
      label: 'Rides',
      data: [12, 3, 19],
      backgroundColor: [
        '#ffd452',
        '#2980B9',
        '#8E2DE2',
        '#c471ed',
        '#C6FFDD',
        '#f64f59',
        '#ee9ca7',
        '#2c3e50',
        '#FFE000',
      ],
      borderWidth: 0,
    },
  ],
};

export function ProductOrders() {
  return <div className='bg-white border border-gray-200 overflow-hidden rounded-md w-auto h-[280px] p-4'>
        <p className='text-sm font-semibold tracking-tight mb-4'>Rides By Vehicle Type</p>
        <div className='w-auto h-[200px] m-auto flex justify-center'>
      <Doughnut data={data} options={{plugins:{legend:{position:'center',display:true}}}} style={{borderRadius:12,accentColor:'#959595'}} />;
        </div>
    </div>
}
