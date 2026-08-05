import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,
  scales: {
    y: {
      grid: {
        display: false,
      },
    },
    x: {
        grid: {
          display: false,
        },
      }
  },
  plugins: {
    legend: {
      position: 'top',
      display:false
    },
    style:{
        // border
    }
  },
};



export function CityOrders({data=[{cityName:'hyderabad',rideCount:24},{cityName:'vizag',rideCount:8}]}) {
  
  let labels = [];
  let items = [];
  
  data.map((item,index)=>
  {
    labels.push(item.cityName)
    items.push(item.rideCount)
  })

    const info = {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: items,
          backgroundColor: '#2ac08b',
          borderRadius:4,
        }
      ],
    };
  return <div className='bg-white border border-gray-200 overflow-hidden rounded-md w-full h-[280px] p-4'>
  <p className='text-sm font-semibold tracking-tight mb-4'>Order By Cities</p>
  <div className='w-full h-[220px] m-auto'>
    <Bar options={options} data={info}  />
  </div>
  </div>;
}
