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
import { NavigationTabBar } from '@cocarr/ui'
import { SimpleHeader } from '@cocarr/ui'

export default function SettingsLayout({children}) {

    const [searchText,setSearchText] = useState('')
    const [rides,setRides] = useState([])
    const {id} = useParams()
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


    async function getRides(){

        try 
        {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}`
            if(searchText) query+= `&search=${searchText}`
            if(statusFilter && statusFilter !== '') query+= `&status=${statusFilter}`
            if(cityFilter && cityFilter !== '') query+= `&cityId=${cityFilter}`
            if(sort) query+= `&sort=${sort}`
            let res = await coreApi().get(`/booking?${query}`)
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
            let res = await coreApi().get(`/city`)
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
    <div className='max-w-7xl mx-auto h-full flex flex-col'>
        <SimpleHeader key={id} title={'Ride Information'} parent='' RightContent={()=><div></div>}/>

        <div  className={`relative self-stretch h-[full] w-full`}>
            <NavigationTabBar options={[{label:'Ride Information',url:`/dashboard/rides/${id}`},{label:'Payment Information',url:`/dashboard/rides/${id}/payment`},{label:'Ride Start Info',url:`/dashboard/rides/${id}/start-ride`},{label:'Ride End Info',url:`/dashboard/rides/${id}/end-ride`},{label:'Ride Due Info',url:`/dashboard/rides/${id}/due`}]}/>
        </div>
        
        <div className='flex flex-1 overflow-scroll w-full'>
            {children}
        </div>
    </div>
  )
}
