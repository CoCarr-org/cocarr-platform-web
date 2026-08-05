'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from '@/app/_helpers/useParams'
import { InfoToast } from '@cocarr/notifications'
import { LIMIT, getDateFormat, getTimeFormat } from '@cocarr/shared-utils'
import { Header, Loader } from '@cocarr/ui'
import axios from 'axios'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
  } from '@tanstack/react-table'
  
export default function RideDue() {
    const router = useRouter()
    const { id } = useParams()
    const [rideInfo, setRideInfo] = useState([])
    const [searchText, setSearchText] = useState('')
    const [offset, setOffset] = useState(0)
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)

    async function getBookingDues() {
        try {
          let query = `populate=true`
          if(searchText)
          {
            query += `&search=${searchText}`
          }
          if(offset)
          {
            query += `&offset=${offset}`
          }
          if(LIMIT)
          {
            query += `&limit=${LIMIT}`
          }
            let res = await axios.get(`/due?${query}`)
            setRideInfo(res.data.dues)
            setCount(res.data.count)
            setLoading(false)
        } catch (error) {
          console.log(error)
            setLoading(false)
            InfoToast(error.response.data.error.message)
        }
    }

        useEffect(() => {
            getBookingDues();
    }, [])

    // const columnHelper = createColumnHelper()

    const columns = [
      {
        accessorKey: 'user',
        header: 'User',
        cell: info => <div><p className='text-sm font-regular my-0 capitalize'>{info.row.original?.user?.name || 'N/A'}</p>
        <p className='text-xs font-regular my-0 text-[#757575]'>{info.row.original?.user?.contactNumber || 'N/A'}</p>
        </div>
      },
      {
          accessorKey: 'totalAmount',
          header: 'Due Amount',
          cell: info => <p className='text-sm font-regular my-0'>Rs. {info.getValue() || 0}</p>
      },
      {
          accessorKey: 'reason', 
          header: 'Due Description',
          cell: info => <p className='text-sm font-regular my-0'>{info.getValue() || 'No Description Provided'}</p>
      },
      {
          accessorKey: 'bookingId',
          header: 'Booking ID', 
          cell: info => <p className='text-xs font-medium my-0 uppercase'>{info.row.original?.booking?.bookingId || 'No Booking ID'}</p>
      },
      {
        accessorKey: 'createdAt',
        header: 'Due Date',
        cell: info => info.getValue() ?  <div>
          <p className='text-sm font-regular my-0'>{getDateFormat(info.getValue())} </p>
          <p className='text-xs font-regular my-0 text-[#757575]'>{getTimeFormat(info.getValue())}</p>
      </div> : <p className='text-xs font-regular my-0 text-[#757575]'>N/A</p>
         
        },
        {
            accessorKey: 'status',
            header: 'Status', 
            cell: info => <p className={`text-xs font-bold my-0 px-2 uppercase ${info.row.original?.status === 'paid' ? 'bg-[#39e19555] text-[#058a4e]' : info.row.original?.status === 'cancelled' ? 'bg-[#ff000045] text-[#dd0000]' : 'bg-[#ffa50045] text-[#d69721]'}  px-2 py-1 rounded-sm`}>{info.row.original?.status || 'N/A'}</p>
        },
    ]

    const table = useReactTable({
        data: rideInfo,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    const RightContent = ()=>
    {
      return (
        <div>
            <button className='btn-md-stretched'>Create Due</button>
        </div>
      )
    }
    return (
        !loading ? <div className='w-full h-full'>
          <Header title={'Dues'} search={true} pagination={true} count={count} offset={offset} setOffset={setOffset} searchText={searchText} setSearchText={setSearchText} RightContent={RightContent}/>
                 <div className='flex bg-white rounded-md flex-1 w-full overflow-scroll'>
        <table className='w-auto flex-1'>
          <thead className='bg-[#f9f9f9]'>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <td key={header.id} className='text-left p-3'>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} onClick={() => onClick(row.original.bookingId)} className='hover:bg-gray-50 cursor-pointer'>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className='p-3 capitalize'>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </div> : <Loader />
    )
}
