'use client'
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import authAxios from '@/app/_helpers/axios'
import { toast } from 'react-toastify'
import { ErrorToast, InfoToast } from '@/app/_helpers/toasters'
import SearchInput from '@/app/_components/SearchInput'
import { BOOKING_BOOKED, BOOKING_CANCELLED, BOOKING_INITIATED, BOOKING_ONGOING, LIMIT } from '@/app/_helpers/constants'
import { getDateFormat, getTimeFormat, getValidDateFormat } from '@/app/_helpers/utils'
import Status from '@/app/_components/Status'
import axios from 'axios'
// import TabGroup from '@/app/_components/TabGroup'
import Link from 'next/link'
import Header from '@/app/_components/Header'

export default function SettingsLayout({children}) {

    const [searchText,setSearchText] = useState('')
    const [rides,setRides] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cities,setCities] = useState([])
    const [cityFilter,setCityFilter] = useState('')
    const [statusFilter,setStatusFilter] = useState('')
    const [sort,setSort] = useState('-createdAt')
    const router = useRouter()
    const pathname = usePathname()
    

    const [selectedFilters,setSelectedFilters] = useState({city:'',route:''})
    const RightContent = ()=>
    {
        return null
    }


    async function getRides(){

        try 
        {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}`
            if(searchText) query+= `&search=${searchText}`
            if(statusFilter && statusFilter !== '') query+= `&status=${statusFilter}`
            if(cityFilter && cityFilter !== '') query+= `&cityId=${cityFilter}`
            if(sort) query+= `&sort=${sort}`
            let res = await axios.get(`/booking?${query}`)
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
                // setCount(res.data.totalCount)
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



  return (
    <div className='max-w-7xl mx-auto'>
        {/* <Header title={'Settings'} parent='' RightContent={()=><div></>}/> */}

        <div className='w-full flex  ml-0'>
        <div  className={`relative self-stretch h-[full] w-full`}>
            <div className="flex bg-[#fff]rounded-md overflow-hidden w-full bg-[#fafafa] border-b border-slate-200">
                {
                    [{label:'Preferences',url:'/dashboard/settings/preferences'},{label:'Protection Plans',url:'/dashboard/settings/protection-plan'},{'label':'Membership Types','url':'/dashboard/settings/membership-types'},{'label':'Cities','url':'/dashboard/settings/cities'},{'label':'Brands','url':'/dashboard/settings/brands'},{'label':'Pickup Points','url':'/dashboard/settings/pickup-points'}].map((item,index)=>
                    {
                        return <Link key={index} href={item.url} className={`block items-center  ${pathname === item.url ? 'bg-[#ECC032] text-black' : 'bg-transparent text-[#454545]'}`}>
                        <div className='flex items-center text-center py-3 px-3'>
                            <p className='text-[0.8em] font-medium tracking-tight '>{item.label}</p>
                        </div>
                        </Link>
                    })
                }
            </div>
        </div>
        </div>
        
        <div className='flex flex-1  w-full'>
            {children}
        </div>
    </div>
  )
}
