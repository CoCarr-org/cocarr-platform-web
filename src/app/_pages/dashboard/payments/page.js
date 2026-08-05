'use client'
import React, { useEffect, useState } from 'react'
import Header from '@/app/_components/Header'
import { ErrorToast, InfoToast } from '@/app/_helpers/toasters'
import SearchInput from '@/app/_components/SearchInput'
import { LIMIT } from '@/app/_helpers/constants'
import { getValidDateFormat } from '@/app/_helpers/utils'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Pagination from '@/app/_components/Pagination'
import DataTable from '@/app/_components/DataTable'

export default function Payments() {
    const [searchText,setSearchText] = useState('')
    const [rides,setRides] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cityFilters,setCityFilters] = useState([])
    const [routeFilters,setRouteFilters] = useState([])
    const navigate = useRouter()
    
    const [selectedFilters,setSelectedFilters] = useState({city:'',route:''})
    const RightContent = ()=>
    {
        return null
    }

    async function getPayments(){
        try 
        {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}`
            if(searchText) query+= `&search=${searchText}`
            let res = await axios.get(`/transaction?${query}`)
            console.log('data',res.data)
            setRides(res.data.data)
            setCount(res.data.totalCount)
        } catch (error) {
            ErrorToast(error.response.data.name)
        }
    }

    useEffect(()=>
    {
        getPayments();
    },[searchText,offset])

    const onClick = (id)=>
    {
        navigate.push(`/rides/${id}`)
    }

    const columns = [
        {
            accessorKey: 'user',
            id: 'user',
            header: 'User',
            size: 200,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-regular my-0 capitalize'>{row.original.user?.name || '-'}</p>
                </div>
            )
        },
        {
            accessorKey: 'type',
            id: 'type',
            header: 'Order Type',
            size: 150,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-semibold my-0 uppercase'>{row.original.type}</p>
                </div>
            )
        },
        {
            accessorKey: 'orderId',
            id: 'orderId',
            header: 'Order Id /Payment Id',
            size: 250,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-regular my-0'>{row.original.orderId}</p>
                    <p className='text-xs my-0 text-gray-400'>{row.original.paymentId}</p>
                </div>
            )
        },
        {
            accessorKey: 'paymentMethod',
            id: 'paymentMethod',
            header: 'Payment Method',
            size: 180,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-regular my-0 uppercase'>{row.original.paymentMethod || '-'}</p>
                </div>
            )
        },
        {
            accessorKey: 'amount',
            id: 'amount',
            header: 'Total Amount',
            size: 150,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-regular my-0'>Rs. {row.original.amount/100}</p>
                </div>
            )
        },
        {
            accessorKey: 'paymentStatus',
            id: 'status',
            header: 'Status',
            size: 120,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-regular my-0 capitalize'>{row.original.paymentStatus}</p>
                </div>
            )
        }
    ]

    return (
        <div className='max-w-7xl mx-auto'>
            <div className='flex justify-between items-stretch flex-1'>
                <Header 
                    title={'Payments'} 
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
            <div className='flex rounded-md flex-1 w-full'>
                <DataTable
                    columns={columns}
                    data={rides}
                    frozenColumns={['user', 'orderId']}
                    enableSorting={true}
                    className="bg-white rounded-md"
                />
            </div>
        </div>
    )
}
