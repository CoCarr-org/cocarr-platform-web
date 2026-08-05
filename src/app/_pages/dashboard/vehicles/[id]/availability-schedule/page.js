'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useRouter, useSearchParams } from 'next/navigation'
import { useParams } from '@/app/_helpers/useParams'
import { ErrorToast, InfoToast } from '@/app/_helpers/toasters'
import { photoUrl } from '@/app/_helpers/media'
import ManageVehicle from './_components/ManageVehicle'
import SearchInput from '@/app/_components/SearchInput'
import { LIMIT } from '@/app/_helpers/constants'
import Pagination from '@/app/_components/Pagination'
import Link from 'next/link'
import axios from 'axios'
import Header from '@/app/_components/Header'
import { createTable, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Verified } from 'lucide-react'
import { FiUserCheck } from 'react-icons/fi'
import { getDateFormat, getDateTimeFormat, getTimeFormat } from '@/app/_helpers/utils'
import moment from 'moment'

export default function AvailabilitySchedule() {

    const {id} = useParams()
    const [searchText,setSearchText] = useState('')
    const [vehicles,setVehicles] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
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


    async function getAvailabilitySchedule(){

        try 
        {
            let res = await axios.get(`/admin/schedule?populate=true&offset=${offset}&limit=${LIMIT}`)
            if(res.data) setVehicles(res.data.schedules)
            setCount(res.data.count)
        } catch (error) {
            ErrorToast(error.response.data.error.message)
        }
    }
    useEffect(()=>
    {
        getAvailabilitySchedule();
    },[offset])

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
                res = await authAxios.put(`${process.env.REACT_APP_BASE_URL}/vehicle/${showCreate.edit}`,updateData) 
                InfoToast('Vehicle Updated')
                
            }
            else
            {
                console.log('images',imageList)
                res = await authAxios.post(`${process.env.REACT_APP_BASE_URL}/vehicle`,{...data,images:imageList})
                InfoToast('Vehicle Created')
            }
            if(res.data)
            {
                await getAvailabilitySchedule()
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
        return <div className='h-full flex items-stretch self-stretch bg-red-500'>
          <button type='button' className='btn-md-stretched h-full' onClick={()=>setShowCreate({status:true,edit:null})}>Add Schedule</button>
        </div>
    }


    const columns = [
        {
            accessorKey: 'startTime', 
            header: 'Start Date',
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{getDateFormat(row.original.startTime)}</p>
                    <p className="font-medium text-xs text-gray-500">{getTimeFormat(row.original.startTime)}</p>
                </div>
            ),
            size: 150,
            sticky: 'left'
        },
        {
            accessorKey: 'endTime', 
            header: 'End Date',
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{getDateFormat(row.original.endTime)}</p>
                    <p className="font-medium text-xs text-gray-500">{getTimeFormat(row.original.endTime)}</p>
                </div>
            ),
            size: 120,
            sticky: 'left'
        },
        {
            accessorKey: 'scheduleBlocks', 
            header: 'Schedule Blocks',
            cell: ({row}) => (
                <div>
                    <p className="font-medium text-sm">{row.original.scheduleBlocks.length}</p>
                </div>
            ),
            size: 120,
            sticky: 'left'
        },
        {
            accessorKey: 'status',
            header: 'Status', 
            cell: ({row}) => (
                <div>
                    <p className={`text-sm font-medium ${row.original.deleted ? 'text-red-500' : moment(row.original.endTime).isBefore(moment()) ? 'text-black' : 'text-green-700'}`}>
                        {row.original.deleted ? 'Deleted' : moment(row.original.endTime).isBefore(moment()) ? 'Completed' : 'Active'}
                    </p>
                </div>
            ),
            size: 120
        }
    ]

    const table = useReactTable({
        data: vehicles,
        columns,
        enableColumnPinning: true,
        enableColumnResizing: false,
        enableSorting: true,
        getCoreRowModel: getCoreRowModel()
    })

  return (
    <div className='max-w-7xl w-full'>
        <Header title={'Vehicles'} RightContent={RightContent} search={true} pagination={true} count={count} offset={offset} setOffset={setOffset} searchText={searchText} setSearchText={setSearchText}/>
        <div className='block grid-cols-4 gap-4 flex-1 bg-[#f3f3f3] w-full overflow-x-auto' >
                        <div className='w-full overflow-x-scroll'>
                            <table className='table-auto overflow-x-scroll'>
                                <thead>
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <td key={header.id} style={{width: header.column.columnDef.size}}>
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
                                        <tr key={row.id} onClick={()=>navigate.push(`/dashboard/vehicles/${row.original.id}`)}>
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="px-4 py-2" style={{width: cell.column.columnDef.size}}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
        </div>
        { showCreate.status ? <ManageVehicle onClose={setShowCreate} onSubmit={onSubmit} edit={showCreate.edit}/> : null}
    </div>
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