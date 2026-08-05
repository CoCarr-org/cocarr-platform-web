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
import NavigationTabBar from '@/app/_components/NavigationTabBar'
import SimpleHeader from '@/app/_components/SimpleHeader'

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
