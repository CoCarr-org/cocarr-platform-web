'use client'
import React, { useEffect, useState } from 'react'
import { ErrorToast, InfoToast } from '@/app/_helpers/toasters'
import { getDateFormat, getTimeFormat, getValidDateFormat } from '@/app/_helpers/utils'
import { photoUrl } from '@/app/_helpers/media'
import { LIMIT } from '@/app/_helpers/constants'
import SearchInput from '@/app/_components/SearchInput'
import ManageUser from './_components/ManagerUser'
import Pagination from '@/app/_components/Pagination'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Header from '@/app/_components/Header'
import DataTable from '@/app/_components/DataTable'
import { Verified } from 'lucide-react'
import { FiUserCheck } from 'react-icons/fi'

export default function Hosts() {

    const [searchText,setSearchText] = useState('')
    const [hosts,setHosts] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cityFilter,setCityFilter] = useState('')
    const [sort,setSort] = useState('-createdAt')
    const [premiumFilter,setPremiumFilter] = useState('')
    const [disableExport,setDisableExport] = useState(false)
    const navigate = useRouter()


    async function getHosts(){
        try 
        {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}&sort=${sort}`
            if(searchText) query+= `&search=${searchText}`
            let res = await axios.get(`/host?${query}`)
            setHosts(res.data.data)
            setCount(res.data.totalCount)
        } catch (error) {
            ErrorToast(error.response.data.name)
        }
    }

    useEffect(()=>
    {
        getHosts();
    },[searchText,offset,cityFilter,premiumFilter,sort])

    async function createHost(e,data)
    {
        try 
        {
            e.preventDefault();
            let res = await axios.post(`/host`,data)
            setOffset(0)
            setCount(0)
            await getHosts();
        } catch (error) {
            ErrorToast(error.response.data.error.message)
        }
    }

    async function downloadExcel() {
        try {
            setDisableExport(true)
            const response = await axios.get(`/host/export`)
      
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'cocarr-hosts.csv');
            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);
            setDisableExport(false)
        } catch (error) {
            setDisableExport(false)
            ErrorToast(error.response.data.name)
        }
    };

    const RightContent = ()=>
    {
        return (
            <div className='flex w-full'>
            <div className="w-full ml-4">
            <select onChange={(e)=>setSort(e.target.value)} className="w-full rounded-md shadow-sm shadow-gray-200 border-[#f3f3f3]">
                <option value="-createdAt">Joined On (DESC)</option>
                <option value="createdAt">Joined On (ASC)</option>
                <option value="-name">Name (DESC)</option>
                <option value="name">Name (ASC)</option>
                <option value="-contactNumber">Contact Number (DESC)</option>
                <option value="contactNumber">Contact Number (ASC)</option>
            </select>
        </div>
    <div>
        <button type='button' className='btn-md  ml-4 text-nowrap' onClick={()=>setShowCreate({status:true,edit:null})}>Add Host</button>
    </div>
    </div>
        )
    }

    const columns = [
        {
            accessorKey: 'name',
            id: 'name',
            header: 'Name',
            size: 250,
            cell: ({row}) => (
                <div className='flex items-center'>
                    <div className='mr-3 w-10 h-10'>
                        {row.original.profilePhoto ? (
                            <img src={photoUrl(row.original.profilePhoto)} className='w-10 h-10 rounded-full' alt={row.original.name}/>
                        ) : (
                            <div className='bg-gray-400 rounded-full h-10 w-10'></div>
                        )}
                    </div>
                    <div>
                        <p className='text-sm font-medium my-0'>{row.original.name || 'Unavailable'}</p>
                        <p className='text-xs my-0 text-gray-400'>{getDateFormat(row.original.createdAt)}</p>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'email',
            id: 'contact',
            header: 'Email/Phone',
            size: 250,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-regular my-0'>{row.original.email || 'Not Available'}</p>
                    <p className='text-xs font-regular my-0'>{row.original.contactNumber || 'Not Available'}</p>
                </div>
            ),
        },
        {
            accessorKey: 'createdAt',
            id: 'joined',
            header: 'Joined On',
            size: 200,
            cell: ({row}) => (
                <div>
                    <p className='text-sm font-regular my-0'>{getValidDateFormat(row.original.createdAt)}</p>
                    <p className='text-xs font-regular my-0'>{getTimeFormat(row.original.createdAt)}</p>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            id: 'status',
            header: 'Status',
            size: 150,
            cell: ({row}) => (
                <div className='flex items-center gap-4'>
                    <Verified className={`w-5 h-5 ${row.original.rcVerificationId ? 'text-green-500' : 'text-gray-500'}`} />
                    <FiUserCheck className={`w-5 h-5 ${row.original.rcVerified ? 'text-green-500' : 'text-gray-500'}`} />
                </div>
            ),
        },
    ]

    return (
        <>
            <div className='justify-between max-w-7xl mx-auto flex flex-col'>
            
            <Header title={'Hosts'} RightContent={RightContent}  search={true} pagination={true} count={count} offset={offset} setOffset={setOffset} searchText={searchText} setSearchText={setSearchText}/>

                <div className='flex flex-1 w-full mb-2'>
                    <DataTable
                        columns={columns}
                        data={hosts}
                        frozenColumns={['name']}
                        enableSorting={true}
                        onRowClick={(row) => navigate.push(`/dashboard/hosts/${row.id}/`)}
                        className="bg-white"
                    />
                </div>
            </div>
            {showCreate.status ? <ManageUser onSubmit={createHost} onClose={()=>setShowCreate({status:false,edit:null})}/> : null}
        </>
    )
}
