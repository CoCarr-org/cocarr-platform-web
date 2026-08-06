'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useRouter, useSearchParams } from 'next/navigation'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { LIMIT, photoUrl } from '@cocarr/shared-utils'
import ManageVehicle from './_components/ManageVehicle'
import { PageLayout, Pagination, SearchInput } from '@cocarr/ui'
import Link from 'next/link'
import axios from 'axios'
import { DataTable } from '@cocarr/datagrid'
import { Verified } from 'lucide-react'
import { FiUserCheck } from 'react-icons/fi'

// `extraQuery` lets other modules reuse this list pre-filtered — Vehicles >
// Approvals (pending approval) and Hosts > Vehicles (one host's fleet) —
// rather than every one of them showing the unfiltered fleet.
export default function Vehicles({ extraQuery = '', title = 'Vehicles' } = {}) {

    const {showAdd} = useSearchParams()
    const [searchText,setSearchText] = useState('')
    const [vehicles,setVehicles] = useState([])
    const [showCreate,setShowCreate] = useState({status:showAdd === 1 ? true : false,edit:null})
    const [sort,setSort] = useState('-createdOn')
    const navigate = useRouter()
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)

    const [cityFilters,setCityFilters] = useState([])
    const [routeFilters,setRouteFilters] = useState([])
    

    const [selectedFilters,setSelectedFilters] = useState({city:'',route:''})


    const handleModal = (value) => {
    navigate.push(`${window.location.pathname}?showManage=${value}`);

    // history.pushState(null, null, window.location.href);
    };


    async function getVehicles(){

        try 
        {
            let res = await axios.get(`/admin/vehicle?populate=true&offset=${offset}&limit=${LIMIT}${extraQuery ? `&${extraQuery}` : ''}`)
            if(res.data) setVehicles(res.data.vehicles)
            setCount(res.data.totalCount)
        } catch (error) {
            ErrorToast(error.response.data.error.message)
        }
    }
    useEffect(()=>
    {
        getVehicles();
    },[offset,extraQuery])

    const onSubmit = async(e,data,images)=>
    {
        try 
        {
            let imageList = []
            e.preventDefault()
            images.map((item)=>
            {
                imageList.push({src:item.src,isCover:item.isCover ? item.isCover : false})
            })
            console.log('images',images)
            let imageRes
            let res;
            if(showCreate.edit)
            {
                let updateData = {...data,images:imageList}
                res = await coreApi().put(`${process.env.REACT_APP_BASE_URL}/vehicle/${showCreate.edit}`,updateData) 
                InfoToast('Vehicle Updated')
                
            }
            else
            {
                console.log('images',imageList)
                res = await coreApi().post(`${process.env.REACT_APP_BASE_URL}/vehicle`,{...data,images:imageList})
                InfoToast('Vehicle Created')
            }
            if(res.data)
            {
                await getVehicles()
                setShowCreate({status:false,edit:null})
            }
            else toast('error updating retailer')
        } catch (error) {
            // console.log(error.response.data.error[0])
            toast.error(error.response.data.error[Object.keys(error.response.data.error)[0]])
        }
    }


    const RightContent = ()=>
    {
        return <div className='h-full'>
          <button type='button' className='btn-md-stretched' onClick={()=>setShowCreate({status:true,edit:null})}>Add Vehicle</button>
        </div>
    }


    const columns = [
        {
            accessorKey: 'photo',
            header: 'Photo',
            cell: ({row}) => (
                <div className="w-14 h-10">
                    <img 
                        src={row.original.images.length > 0 ? photoUrl(row.original.images[0].url) : ''}
                        className="w-full h-full object-cover rounded"
                        alt={row.original.vehicleName}
                    />
                </div>
            ),
            size: 60
        },
        {
            accessorKey: 'name', 
            header: 'Vehicle',
            id: 'name',
            cell: ({row}) => (
                <div className="relative">
                    {row.original.isDraft && (
                        <div className='absolute -left-8 top-0 w-[32px] h-full flex items-center justify-center z-10'>
                            <div className='bg-[var(--primary-color)] -rotate-90 w-auto px-2 py-1 flex justify-center items-center origin-center'>
                                <p className='text-black uppercase text-xs font-semibold'>Draft</p>
                            </div>
                        </div>
                    )}
                    <p className="font-medium text-sm">{row.original.vehicleName}</p>
                </div>
            ),
            size: 150
        },
        {
            accessorKey: 'vehicleNumber',
            id: 'vehicleNumber',
            header: 'Number',
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{row.original.vehicleNumber}</p>
                </div>
            ),
            size: 120
        },
        {
            accessorKey: 'brand', 
            id: 'brand',
            header: 'Brand',
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{row.original.brand.name}</p>
                </div>
            ),
            size: 120
        },
        {
            accessorKey: 'rate',
            header: 'Rate/Hr', 
            cell: ({row}) => (
                <div>
                    <p className="text-sm">
                        Rs. {row.original.vehiclePlan[0] ? row.original.vehiclePlan[0].perHourFee : '0'}
                    </p>
                </div>
            ),
            size: 120
        },
        {
            accessorKey: 'status',
            header: 'Status', 
            cell: ({row}) => (
                <div className='flex items-center gap-2'>
                    <p className={`text-sm ${row.original.active ? 'text-black' : 'text-red-500'}`}>{row.original.active ? 'Active' : 'Inactive'}</p>
                </div>
            ),
            size: 100
        },
        {
            accessorKey: 'verificationId',
            header: 'Verification', 
            cell: ({row}) => (
                <div className='flex items-center gap-2'>
                    <Verified className={`w-5 h-5 text-gray-500 ${row.original.rcVerificationId ? 'text-green-500' : 'text-gray-500'}`} />
                    <FiUserCheck className={`w-5 h-5 text-gray-500 ${row.original.rcVerified ? 'text-green-500' : 'text-gray-500'}`} />
                </div>
            ),
            size: 120
        },
        {
            accessorKey: 'id',
            header: 'City', 
            cell: ({row}) => (
                <div className='flex items-center gap-2'>
                    <p className='text-sm'>{row.original.pickupPoint.city.name}</p>
                </div>
            ),
            size: 120
        },
        {
            accessorKey: 'vehicleTransmission',
            header: 'Transmission', 
            cell: ({row}) => (
                <div className='flex items-center gap-2'>
                    <p className='text-sm capitalize'>{row.original.vehicleTransmission}</p>
                </div>
            ),
            size: 120
        },
        {
            accessorKey: 'vehicleFuelType',
            header: 'Fuel Type', 
            cell: ({row}) => (
                <div className='flex items-center gap-2'>
                    <p className='text-sm capitalize'>{row.original.vehicleFuelType}</p>
                </div>
            ),
            size: 120
        }
    ]

  return (
    <>
      <PageLayout
        title={title}
        subtitle='The full fleet across every host and city.'
        breadcrumb={['Operations', title]}
        actions={
          <button type='button' className='btn-md' onClick={() => setShowCreate({ status: true, edit: null })}>
            + Add Vehicle
          </button>
        }
        filters={
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder='Search vehicles'
            className='flex-1 min-w-[220px] max-w-sm border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'
          />
        }
      >
        <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
          <DataTable
            columns={columns}
            data={vehicles}
            frozenColumns={['name', 'vehicleNumber', 'brand']}
            enableSorting={true}
            onRowClick={(row) => navigate.push(`/dashboard/vehicles/${row.id}`)}
            className='bg-white'
          />
        </div>
        <div className='flex justify-end py-3'>
          <Pagination count={count} offset={offset} setOffset={setOffset} />
        </div>
      </PageLayout>
      {showCreate.status ? <ManageVehicle onClose={setShowCreate} onSubmit={onSubmit} edit={showCreate.edit} /> : null}
    </>
  )
}



const CarItem = ({data,index})=>
{
  return <div className={`col-span-1 shadow-md shadow-gray-200 my-4 translate-y-0 hover:translate-y-1 hover:shadow-none transition-all rounded-md overflow-hidden z-0`} key={index}>
    <Link href={`/vehicles/${data.vehicleId}`}>
    <div className={`w-full h-[140px] relative`}>
        <img src={data.images.length > 0 ? photoUrl(data.images[0].url) : ''}  className='w-full h-full' />
    </div>
    <div className='bg-white px-4 py-4'>
          <div className='pb-3'>
            <p className='text-sm font-medium capitalize'>{data.brand.name} {data.vehicleName}</p>
            <p className='text-xs text-[#959595] capitalize mt'>{data.vehicleFuelType} &middot; {data.vehicleSeats} Seater &middot; {data.vehicleYear}</p>
          </div>
          <div className='pt-3 border-t border-t-gray-200'>
            <p className='text-lg font-bold'><span className='text-sm font-medium'>Rs.</span>{data.vehiclePlan[0] ? data.vehiclePlan[0].perHourFee : '0'}<span className='text-sm font-medium'>/hr</span></p>
            <p className='text-xs text-[#959595] capitalize'>Available from 24 Oct 12:00 Pm</p>
          </div>
    </div>
    </Link>
  </div>
}