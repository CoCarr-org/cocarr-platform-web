'use client'
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useParams } from '@/app/_helpers/useParams'
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
import SimpleHeader from '@/app/_components/SimpleHeader'
import NavigationTabBar from '@/app/_components/NavigationTabBar'

export default function VehicleInfoLayout({children}) {
    const {id} = useParams()
    const [searchText,setSearchText] = useState('')
    const [vehicleInfo,setVehicleInfo] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cities,setCities] = useState([])
    const [cityFilter,setCityFilter] = useState('')
    const [statusFilter,setStatusFilter] = useState('')
    const [sort,setSort] = useState('-createdAt')
    const router = useRouter()
    const {pathname} = usePathname()
    

    const [selectedFilters,setSelectedFilters] = useState({city:'',route:''})
    const RightContent = ()=>
    {
        return null
    }


    async function getVehicleInfo(){

        try 
        {
            let res = await axios.get(`/vehicle/${id}?`)
            console.log('data',res.data)
            if(res.data) 
            {
                setVehicleInfo(res.data)
            }
        } catch (error) {
            toast('Error getting products')
        }
    }

    useEffect(()=>
    {
        getVehicleInfo();
    },[])


  return (
    <div className='max-w-7xl mx-auto'>
        <SimpleHeader title={vehicleInfo.vehicleName} parent='vehicles' RightContent={()=><div></div>}/>

                <NavigationTabBar options={[{url:`/dashboard/vehicles/${id}/`,label:`Vehicle Information`},{url:`/dashboard/vehicles/${id}/rides`,label:`Rides`},{url:`/dashboard/vehicles/${id}/reviews`,label:`Reviews`}]}/>

        
        <div className='flex flex-1  w-full'>
            {children}
        </div>
    </div>
  )
}
