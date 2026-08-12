'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { InfoToast, apiErrorMessage } from '@cocarr/notifications'
import { getDateFormat, getTimeFormat } from '@cocarr/shared-utils'
import { Loader } from '@cocarr/ui'
import { coreApi } from '@cocarr/api-sdk'
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
            let res = await coreApi().get(`/due?populate=true&bookingId=${id}`)
            setRideInfo(res.data.dues)
            setCount(res.data.count)
                    
            setLoading(false)
        } catch (error) {
            setLoading(false)
            InfoToast(apiErrorMessage(error))
        }
    }

    useEffect(() => {
        if (id) {
            getBookingDues();
        }
    }, [id])

    const columnHelper = createColumnHelper()

    const columns = [
        columnHelper.accessor('totalAmount', {
            header: 'Due Amount',
            cell: info => `Rs. ${info.getValue() || 0}`
        }),
        columnHelper.accessor('reason', {
            header: 'Due Description',
            cell: info => info.getValue() || 'No Description Provided'
        }),
        columnHelper.accessor('bookingId', {
            header: 'Booking ID',
            cell: info => info.getValue() || 'No Booking ID'
        }),
        columnHelper.accessor('dueDate', {
            header: 'Due Date',
            cell: info => info.getValue() ? 
                `${getDateFormat(info.getValue())} ${getTimeFormat(info.getValue())}` : 
                'Not Set'
        })
    ]

    const table = useReactTable({
        data: rideInfo,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        !loading ? <div className='w-full h-full'>
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
