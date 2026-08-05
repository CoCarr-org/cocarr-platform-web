import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);


export default function StatusOrders({data}) {
    
  const formattedData = {
      labels: ['Pending', 'Delivered','Cancelled'],
      datasets: [
        {
          label: '# of Orders',
          data: [4,24,2],
          backgroundColor: [
            '#e3e3e3',
            '#2ac08b',
            'rgba(255, 90, 90, 1)',
          ],
          borderWidth: 0,
        },
      ],
    };

  return <div className='bg-white border border-gray-200 overflow-hidden rounded-md w-auto h-[280px] p-4'>
        <p className='text-sm font-semibold tracking-tight mb-4'>Rides By Status</p>
        <div className='w-auto h-[200px] m-auto flex justify-center'>
      <Doughnut data={formattedData} options={{plugins:{legend:{position:'center',display:true}}}} style={{borderRadius:12,accentColor:'#959595'}} />;
        </div>
    </div>
}
