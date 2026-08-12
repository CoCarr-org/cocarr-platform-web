'use client'
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { toast } from 'react-toastify'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { SearchInput } from '@cocarr/ui'
import { BOOKING_BOOKED, BOOKING_CANCELLED, BOOKING_INITIATED, BOOKING_ONGOING, LIMIT } from '@cocarr/shared-utils'
import { getDateFormat, getTimeFormat, getValidDateFormat } from '@cocarr/shared-utils'
import { Status } from '@cocarr/ui'
// import { TabGroup } from '@cocarr/ui'
import Link from 'next/link'
import { Header } from '@cocarr/ui'
import { SimpleHeader } from '@cocarr/ui'
import { NavigationTabBar } from '@cocarr/ui'

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
    const pathname = usePathname()
    

    const [selectedFilters,setSelectedFilters] = useState({city:'',route:''})
    const RightContent = ()=>
    {
        return null
    }


    async function getVehicleInfo(){

        try 
        {
            let res = await coreApi().get(`/admin/vehicle/${id}?`)
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
    <div className='max-w-7xl mx-auto flex flex-col'>
        <SimpleHeader title={vehicleInfo.brand?.name ? `${vehicleInfo.brand?.name} ${vehicleInfo.vehicleName} (${vehicleInfo.vehicleNumber})` : '-'} parent='vehicles' RightContent={()=><div></div>}/>

                <NavigationTabBar options={[{url:`/dashboard/vehicles/${id}`,label:`Vehicle Info`},{url:`/dashboard/vehicles/${id}/availability-schedule`,label:`Availability Schedule`},{url:`/dashboard/vehicles/${id}/payment`,label:`Payments`},{url:`/dashboard/vehicles/${id}/rides`,label:`Rides`},{url:`/dashboard/vehicles/${id}/reviews`,label:`Reviews`}]}/>

        
        <div className='flex flex-1 w-full'>
            {children}
        </div>
    </div>
  )
}
