'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { Header } from '@cocarr/ui'
import { coreApi } from '@cocarr/api-sdk'
import { toast } from 'react-toastify'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { SearchInput } from '@cocarr/ui'
import { BOOKING_BOOKED, BOOKING_CANCELLED, BOOKING_INITIATED, BOOKING_ONGOING, LIMIT } from '@cocarr/shared-utils'
import { getDateFormat, getTimeFormat, getValidDateFormat } from '@cocarr/shared-utils'
import { Status } from '@cocarr/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

export default function Rides() {
    const [searchText,setSearchText] = useState('')
    const [rides,setRides] = useState([])
    const {id} = useParams()
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cities,setCities] = useState([])
    const [cityFilter,setCityFilter] = useState('')
    const [statusFilter,setStatusFilter] = useState('')
    const [sort,setSort] = useState('-createdAt')
    const router = useRouter()
    
    const columnHelper = createColumnHelper()

    const columns = [
      columnHelper.accessor('bookingId', {
        header: 'Booking ID / Time',
        cell: info => (
          <div>
            <p className='text-xs font-medium my-0 uppercase'>{info.getValue()}</p>
            <p className='text-xs my-0 text-gray-400'>{getValidDateFormat(info.row.original.createdAt)}</p>
          </div>
        ),
      }),
      columnHelper.accessor('user', {
        header: 'User',
        size: 200,
        cell: info => (
          <div>
            <p className='text-sm font-medium my-0'>{info.getValue()?.name || 'Unavailable'}</p>
            <p className='text-xs my-0 text-gray-400'>{info.getValue()?.contactNumber || 'Not Available'}</p>
          </div>
        ),
      }),
      columnHelper.accessor('vehicle', {
        header: 'Vehicle',
        cell: info => (
          <div>
            <p className='text-sm font-medium my-0'>{info.getValue().vehicleName}</p>
            <p className='text-xs my-0 text-gray-400'>{info.getValue().vehicleNumber || 'Not Available'}</p>
          </div>
        ),
      }),
      columnHelper.accessor('totalAmount', {
        header: 'Amount(In Rs.)',
        cell: info => (
          <div>
            <p className='text-sm font-regular my-0'>Rs.{info.getValue()}</p>
          </div>
        ),
      }),
      columnHelper.accessor('bookingType', {
        header: 'Booking Type',
        cell: info => (
          <Status label={info.getValue()} type={info.getValue() === 'online' ? 'neutral' : 'medium'} />
        ),
      }),
      columnHelper.accessor('deliveryType', {
        header: 'Delivery Type',
        cell: info => (
          <p className='text-sm font-regular my-0'>{info.row.original.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => (
          <Status 
            label={info.getValue()} 
            type={info.getValue() === BOOKING_INITIATED ? 'neutral' 
              : info.getValue() === BOOKING_CANCELLED ? 'negative' 
              : info.getValue() === BOOKING_ONGOING ? 'medium' 
              : 'positive'} 
          />
        ),
      }),
          columnHelper.accessor(row => ({start: row.startTime, end: row.endTime}), {
            id: 'times',
            header: 'Start/End Time',
            size: 300,
            cell: info => (
              <div>
                <p className='text-xs font-regular my-0'>
                  {`${getDateFormat(info.getValue().start)} ${getTimeFormat(info.getValue().start)}`}
                </p>
                <p className='text-xs font-regular my-0'>
                  {`${getDateFormat(info.getValue().end)} ${getTimeFormat(info.getValue().end)}`}
                </p>
              </div>
            ),
          }),
    ]

    const [selectedFilters,setSelectedFilters] = useState({city:'',route:''})

    const table = useReactTable({
      data: rides,
      columns,
      getCoreRowModel: getCoreRowModel(),
    })

    async function onSubmit(e,data){
        try 
        {
            e.preventDefault();
            let res = await coreApi().post(`/booking/admin/create`,data)
            setShowCreate(false)
            await getRides()
        } catch (error) {
            ErrorToast(error.response.data.error.message)
        }
    }

    async function getRides(){
        try 
        {
            let query = `hostId=${id}&populate=true&offset=${offset}&limit=${LIMIT}`
            if(searchText) query+= `&search=${searchText}`
            if(statusFilter && statusFilter !== '') query+= `&status=${statusFilter}`
            if(cityFilter && cityFilter !== '') query+= `&cityId=${cityFilter}`
            if(sort) query+= `&sort=${sort}`
            let res = await axios.get(`/admin/booking?${query}`)
            console.log('data',res.data)
            if(res.data) 
            {
                setRides(res.data.data)
                setCount(res.data.totalCount)
            }
        } catch (error) {
            toast('Error getting products')
        }
    }

    async function getCities(){
        try 
        {
            let res = await axios.get(`${process.env.REACT_APP_BASE_URL}/city`)
            if(res.data) 
            {
                setCities(res.data)
            }
        } catch (error) {
            toast('Error getting products')
        }
    }

    useEffect(()=>
    {
        getCities();
    },[])

    useEffect(()=>
    {
        getRides();
        getCities();
    },[searchText,offset,sort,statusFilter,cityFilter])

    const onClick = (id)=>
    {
        router.push(`/rides/${id}`)
    }

    const RightContent = ()=>
    {
        return  <div>
        <button type='button' className='btn-md' onClick={()=>setShowCreate({status:true,edit:null})}>Add Ride</button>
        </div>
    }

  return (
    <div className='w-full'>
      <div className='flex items-stretch'>
        <Header 
          title={'Rides'} 
          RightContent={RightContent} 
          search={true} 
          pagination={true} 
          count={count} 
          offset={offset} 
          setOffset={setOffset} 
          searchText={searchText} 
          setSearchText={setSearchText}
        />
      </div>
      <div className='flex flex-1 w-full'>
        <table>
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
    </div>
  )
}
