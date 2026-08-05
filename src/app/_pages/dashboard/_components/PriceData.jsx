import React from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export const options = {
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

export const data = {
  datasets: [
    {
      label: 'Coimbatore',
      data: Array.from({ length: 30 }, () => ({
        x: Math.floor(Math.random() * 30),
        y: Math.floor(Math.random() * 30),
      })),
      backgroundColor: 'rgba(15, 99, 255, 1)',
    },
    {
      label: 'Chennai',
      data: Array.from({ length: 30 }, () => ({
        x: Math.floor(Math.random() * 30),
        y: Math.floor(Math.random() * 30),
      })),
      backgroundColor: 'rgba(255, 99, 132, 1)',
    },
  ],
};

export function PriceData() {
  return <div className='bg-white border border-gray-200 overflow-hidden rounded-md w-full h-[280px] p-4'>
  <p className='text-sm font-semibold tracking-tight mb-4'>Order By Cities</p>
  <div className='w-full h-[200px] m-auto flex justify-center'>
  <Scatter options={options} data={data} />
  </div>
  </div>
}
