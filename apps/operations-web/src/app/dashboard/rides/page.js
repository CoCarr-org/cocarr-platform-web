'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header, SearchInput, Status } from '@cocarr/ui'
import { coreApi } from '@cocarr/api-sdk'
import { toast } from 'react-toastify'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { BOOKING_BOOKED, BOOKING_CANCELLED, BOOKING_INITIATED, BOOKING_ONGOING, LIMIT, getDateFormat, getTimeFormat, getValidDateFormat } from '@cocarr/shared-utils'
import ManageRide from './_components/ManageRide'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DataTable } from '@cocarr/datagrid'

// `initialStatus` lets the Bookings module's Active/Cancelled pages reuse
// this list pre-filtered, instead of all three showing every booking.
export default function Rides({ initialStatus = '', title = 'Rides' } = {}) {
    const [searchText,setSearchText] = useState('')
    const [rides,setRides] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cities,setCities] = useState([])
    const [cityFilter,setCityFilter] = useState('')
    const [statusFilter,setStatusFilter] = useState(initialStatus)
    const [sort,setSort] = useState('-createdAt')
    const router = useRouter()
    
    const columns = [
      {
        accessorKey: 'bookingId',
        id: 'bookingId',
        header: 'Booking ID / Time',
        size: 200,
        cell: ({row}) => (
          <div>
            <p className='text-xs font-medium my-0 uppercase'>{row.original.bookingId}</p>
            <p className='text-xs my-0 text-gray-400'>{getValidDateFormat(row.original.createdAt)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'user',
        header: 'User',
        size: 200,
        cell: ({row}) => (
          <div>
            <p className='text-sm font-medium my-0'>{row.original.user?.name || 'Unavailable'}</p>
            <p className='text-xs my-0 text-gray-400'>{row.original.user?.contactNumber || 'Not Available'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'vehicle',
        header: 'Vehicle',
        size: 180,
        cell: ({row}) => (
          <div>
            <p className='text-sm font-medium my-0'>{row.original.vehicle?.vehicleName}</p>
            <p className='text-xs my-0 text-gray-400'>{row.original.vehicle?.vehicleNumber || 'Not Available'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Amount(In Rs.)',
        size: 150,
        cell: ({row}) => (
          <div>
            <p className='text-sm font-regular my-0'>Rs.{row.original.totalAmount}</p>
          </div>
        ),
      },
      {
        accessorKey: 'bookingType',
        header: 'Booking Type',
        size: 150,
        cell: ({row}) => (
          <Status label={row.original.bookingType} type={row.original.bookingType === 'online' ? 'neutral' : 'medium'} />
        ),
      },
      {
        accessorKey: 'deliveryType',
        header: 'Delivery Type',
        size: 150,
        cell: ({row}) => (
          <p className='text-sm font-regular my-0 capitalize'>{row.original.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 150,
        cell: ({row}) => (
          <Status 
            label={row.original.status} 
            type={row.original.status === BOOKING_INITIATED ? 'neutral' 
              : row.original.status === BOOKING_CANCELLED ? 'negative' 
              : row.original.status === BOOKING_ONGOING ? 'medium' 
              : 'positive'} 
          />
        ),
      },
      {
        id: 'times',
        header: 'Start/End Time',
        size: 300,
        cell: ({row}) => (
          <div>
            <p className='text-xs font-regular my-0'>
              {`${getDateFormat(row.original.startTime)} ${getTimeFormat(row.original.startTime)}`}
            </p>
            <p className='text-xs font-regular my-0'>
              {`${getDateFormat(row.original.endTime)} ${getTimeFormat(row.original.endTime)}`}
            </p>
          </div>
        ),
      },
    ]

    const [selectedFilters,setSelectedFilters] = useState({city:'',route:''})

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
            let query = `populate=true&offset=${offset}&limit=${LIMIT}`
            if(searchText) query+= `&search=${searchText}`
            if(statusFilter && statusFilter !== '') query+= `&status=${statusFilter}`
            if(cityFilter && cityFilter !== '') query+= `&cityId=${cityFilter}`
            if(sort) query+= `&sort=${sort}`
            let res = await coreApi().get(`/booking?${query}`)
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
            let res = await coreApi().get(`/city`)
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
        router.push(`/dashboard/rides/${id}`)
    }

    const RightContent = ()=>
    {
        return  <div className='h-full'>
        <button type='button' className='btn-md-stretched' onClick={()=>setShowCreate({status:true,edit:null})}>Add Ride</button>
        </div>
    }

  return (
    <div className='max-w-7xl mx-auto h-full'>
      <div className='flex justify-between items-stretch'>
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
      <div className='flex bg-white rounded-md flex-1 w-full'>
        <DataTable
          columns={columns}
          data={rides}
          frozenColumns={['bookingId']}
          enableSorting={true}
          onRowClick={(row) => onClick(row.bookingId)}
          className="rounded-md"
        />
      </div>
      {showCreate.status ? <ManageRide onClose={setShowCreate} onSubmit={onSubmit} edit={showCreate.edit}/> : null}
    </div>
  )
}
