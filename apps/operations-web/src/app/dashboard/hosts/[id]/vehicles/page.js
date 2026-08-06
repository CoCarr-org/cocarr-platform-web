'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useRouter, useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { photoUrl } from '@cocarr/shared-utils'
import { LIMIT } from '@cocarr/shared-utils'
import axios from 'axios'
import { Header } from '@cocarr/ui'
import { DataTable } from '@cocarr/datagrid'
import { Verified } from 'lucide-react'
import { FiUserCheck } from 'react-icons/fi'

export default function Vehicles() {

    const {showAdd} = useSearchParams()
    const {id} = useParams()
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
            let res = await axios.get(`/admin/vehicle?populate=true&offset=${offset}&limit=${LIMIT}&hostId=${id}`)
            if(res.data) setVehicles(res.data.vehicles)
            setCount(res.data.totalCount)
        } catch (error) {
            ErrorToast(error.response.data.error.message)
        }
    }
    useEffect(()=>
    {
        getVehicles();
    },[offset,id])

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
        return <div>
          <button type='button' className='btn-md' onClick={()=>setShowCreate({status:true,edit:null})}>Add Vehicle</button>
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
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{row.original.vehicleName}</p>
                </div>
            ),
            size: 150,
            sticky: 'left'
        },
        {
            accessorKey: 'vehicleNumber', 
            header: 'Number',
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{row.original.vehicleNumber}</p>
                </div>
            ),
            size: 120,
            sticky: 'left'
        },
        {
            accessorKey: 'brand', 
            header: 'Brand',
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{row.original.brand.name}</p>
                </div>
            ),
            size: 120,
            sticky: 'left'
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
    <div className='max-w-7xl flex flex-col h-full'>
        <Header title={'Vehicles'} RightContent={RightContent} search={true} pagination={true} count={count} offset={offset} setOffset={setOffset} searchText={searchText} setSearchText={setSearchText}/>
        <div className='block grid-cols-4 gap-4 flex-1 bg-[#f3f3f3] w-full'>
            <DataTable
                columns={columns}
                data={vehicles}
                frozenColumns={['name', 'vehicleNumber', 'brand']}
                enableSorting={true}
                onRowClick={(row) => navigate.push(`/dashboard/vehicles/${row.id}`)}
                className="bg-white"
            />
        </div>
    </div>
  )
}

