'use client'
import React, { useEffect, useState } from 'react'
import { ErrorToast, InfoToast } from '@/app/_helpers/toasters'
import { getDateFormat, getTimeFormat, getValidDateFormat } from '@/app/_helpers/utils'
import { LIMIT } from '@/app/_helpers/constants'
import SearchInput from '@/app/_components/SearchInput'
// import ManageUser from './_components/ManagerUser'
import Pagination from '@/app/_components/Pagination'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Header from '@/app/_components/Header'

export default function Membership() {

    const [searchText,setSearchText] = useState('')
    const [memberships,setMemberships] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [sort,setSort] = useState('-createdAt')
    const [disableExport,setDisableExport] = useState(false)
    const navigate = useRouter()


    async function getMemberships(){
        try 
        {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}&sort=${sort}`
            if(searchText) query+= `&search=${searchText}`
            let res = await axios.get(`/membership?${query}`)
            setMemberships(res.data.data)
            setCount(res.data.totalCount)
        } catch (error) {
            ErrorToast(error.response.data.name)
        }
    }

    useEffect(()=>
    {
        getMemberships();
    },[searchText,offset,sort])

    async function createMembership(e,data)
    {
        try 
        {
            e.preventDefault();
            let res = await axios.post(`/membership`,data)
            setOffset(0)
            setCount(0)
            await getMemberships();
        } catch (error) {
            ErrorToast(error.response.data.name)
        }
    }

    async function downloadExcel() {
        try {
            setDisableExport(true)
            const response = await axios.get(`/membership/export`)
      
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'cocarr-memberships.csv');
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

    const RightContent = () => {
        return (
            <div className='flex'>
            <div>
                <button type='button' className='btn-md ml-4' onClick={()=>setShowCreate({status:true,edit:null})}>Add Membership</button>
            </div>
        </div>
        )
    }

    return (
        <>
            <div className='block justify-between max-w-7xl mx-auto'>
            <Header title='Membership' RightContent={RightContent} search={true} searchText={searchText} setSearchText={setSearchText} pagination={true} count={count} offset={offset} setOffset={setOffset}/>

                <div className='flex flex-1 w-full'>
                    <table className=' w-full'>
                        <thead className='bg-[#f9f9f9] w-full'>
                            <tr className='w-full'>
                                <td onClick={()=>setSort('name:desc')}><p>User</p></td>
                                <td onClick={()=>setSort('price:desc')}><p>Price</p></td>
                                <td onClick={()=>setSort('duration:desc')}><p>Purchased On</p></td>
                                <td onClick={()=>setSort('createdAt:desc')}><p>Expires On</p></td>
                                <td onClick={()=>setSort('status:desc')}><p>Status</p></td>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                memberships.map((item,index)=>
                                {
                                    return <tr key={index} onClick={()=>navigate.push(`/dashboard/membership/${item.id}/`)}>
                                        <td className='capitalize'>
                                            <div>
                                                <p className='text-sm font-medium my-0'>{item.user.name || 'Unavailable'}</p>
                                                <p className='text-xs my-0 text-gray-400'>{item.user.contactNumber || 'Unavailable'}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <p className='text-sm font-regular my-0'>₹{item.amount || 0}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <p className='text-sm font-regular my-0'>{getValidDateFormat(item.startingTime)}</p>
                                                {/* <p className='text-xs font-regular my-0'>{getTimeFormat(item.startingTime)}</p> */}
                                            </div>
                                        </td>
                                        <td className='capitalize'>
                                            <div>
                                                <p className='text-sm font-regular my-0'>{getValidDateFormat(item.endingTime)}</p>
                                                {/* <p className='text-xs font-regular my-0'>{getTimeFormat(item.endingTime)}</p> */}
                                            </div>
                                        </td>
                                        <td className='capitalize'>
                                            <div>
                                                <p className={`text-xs font-medium ${item.status === 'subscribed' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                    {item.status === 'subscribed' ? 'Active' : 'Inactive'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                })
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            {/* {showCreate.status ? <ManageUser onSubmit={createMembership} onClose={()=>setShowCreate({status:false,edit:null})}/> : null} */}
        </>
    )
}
