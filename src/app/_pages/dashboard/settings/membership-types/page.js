'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
// import RightIcon from '@/public/right.svg'
import authAxios from '@/app/_helpers/axios'
import { toast } from 'react-toastify'
import { InfoToast } from '@/app/_helpers/toasters'
import SearchInput from '@/app/_components/SearchInput'
import { LIMIT } from '@/app/_helpers/constants'
// import { getDateFormat, getTimeFormat, getValidDateFormat } from '../../helpers/utils'
// import ManageOffer from './_components/ManageOffer'
import Pagination from '@/app/_components/Pagination'
import { getDateFormat, getValidDateFormat } from '@/app/_helpers/utils'

export default function MembershipTypes() {

    const [searchText,setSearchText] = useState('')
    const [membershipTypes,setMembershipTypes] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cityFilters,setCityFilters] = useState([])
    const [routeFilters,setRouteFilters] = useState([])
    const navigate = useRouter()
    


    async function getMembershipTypes(){

        try 
        {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}`
            if(searchText) query+= `&search=${searchText}`
            let res = await authAxios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/membership-type?${query}`)
            console.log('data',res.data.data)
            setMembershipTypes(res.data.data)
            // setCount(res.data.totalCount)
        } catch (error) {
            toast('Error getting products')
        }
    }
    useEffect(()=>
    {
        getMembershipTypes();
    },[searchText,offset])


    async function onSubmit(e,data){
        try {
            e.preventDefault()
            let res = await authAxios.post(`${process.env.REACT_APP_BASE_URL}/offers`,data)
            InfoToast('Offer created successfully')
            setShowCreate({status:false,edit:null})
        } catch (error) {
            InfoToast('Error creating offer')
        }
    }
 
  return (
    <div className='max-w-7xl '>
        <div className='flex flex-1  w-full px-6 py-6'>

            <div className='flex w-full gap-3'>
                {
                    membershipTypes.map((item,index)=>
                    {
                        return <div className='col-span-1 bg-[#fff] rounded-md w-full max-w-[300px] shadow-sm shadow-gray-200 overflow-hidden' key={index}>
                            <div className='px-6 py-12 pt-8 flex flex-col w-full max-w-[300px]'>
                                    <p className='text-xs font-semibold my-0 text-[#757575]'>{getDateFormat(item.createdAt)}</p>
                                    <p className='text-base font-bold my-0 text-black'>{item.membershipName}</p>
                                    <p className='text-xs font-bold my-0 text-black tracking-tight'>Rs.{parseFloat(item.membershipAmount).toFixed(0)}</p>
                                    <p className='text-xs font-bold my-0 text-black tracking-tight'>Rs.{parseFloat(item.membershipOfferAmount).toFixed(0)}</p>
                                    <p className='text-xs font-semibold my-0 text-black'>Hours: {item.minHours} - {item.maxHours}</p>
                            </div>
                        </div>
                    })
                }
            </div>
        {/* <table className=' w-full'>
                <thead className='bg-[#f9f9f9] w-full'>
                    <tr className='w-full'>
                    <td><p>Offer Code</p></td>
                    <td><p>Description</p></td>
                    <td><p>Valid From</p></td>
                    <td><p>Valid To</p></td>
                    <td><p>Offer Amount</p></td>
                    <td><p>Status</p></td>
                    </tr>
                </thead>
                <tbody>
                    {
                        membershipTypes.map((item,index)=>
                        {
                            return <tr>
                                <td className='capitalize'>
                                    <div>
                                         <p className='text-sm font-regular my-0'>{item.code}</p>
                                    </div>
                                </td>
                                <td className='capitalize'>
                                <div>
                                        <p className='text-sm font-regular my-0'>{item.description}</p>
                                    </div>
                                </td>
                                <td className='capitalize'>
                                    <div>
                                         <p className='text-sm font-regular my-0'>{item.validFrom}</p>
                                    </div>
                                </td>
                                <td className='capitalize'>
                                <div>
                                         <p className='text-sm font-regular my-0'>{item.validTo}</p>
                                    </div>
                                </td>
                                <td className='capitalize'>
                                <div>
                                        <p className='text-sm font-regular my-0'>Rs.{item.discountValue}</p>
                                        <p className='text-xs font-regular my-0'>{item.discountType}</p>
                                    </div>
                                </td>
                                <td className='capitalize'>
                                <div>
                                        <p className='text-sm font-regular my-0'>{item.isActive ? 'Active' : 'Inactive'}</p>
                                    </div>
                                </td>

                            </tr>
                        })
                    }
                </tbody>
            </table> */}
        </div>
        {/* { showCreate.status ? <ManageOffer onClose={setShowCreate} onSubmit={onSubmit} edit={showCreate.edit}/> : null} */}
    </div>
  )
}

