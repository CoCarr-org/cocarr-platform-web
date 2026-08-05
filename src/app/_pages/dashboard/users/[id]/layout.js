'use client'
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useParams } from '@/app/_helpers/useParams'
import { toast } from 'react-toastify'
import axios from 'axios'
import SimpleHeader from '@/app/_components/SimpleHeader'
import NavigationTabBar from '@/app/_components/NavigationTabBar'

export default function RideInfoLayout({children}) {

    const [searchText,setSearchText] = useState('')
    const {id} = useParams();
    const [hostInfo,setHostInfo] = useState([])
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


    async function getHostInfo(){

        try 
        {
            let res = await axios.get(`/host/${id}?`)
            setHostInfo(res.data)
        } catch (error) {
            toast('Error getting products')
        }
    }

    useEffect(()=>
    {
        getHostInfo();
    },[])


    const menu = [{label:'User Info',url:`/dashboard/users/${id}`},{label:'Rides',url:`/dashboard/users/${id}/rides`},{label:'Payment',url:`/dashboard/users/${id}/payment`},{label:'Vehicles',url:`/dashboard/users/${id}/vehicles`}]

  return (
    <div className='max-w-7xl mx-auto'>
        <SimpleHeader title={hostInfo.name} parent='hosts' parentLink='hosts' RightContent={()=><div></div>}/>

            <NavigationTabBar options={menu}/>
        
        <div className='flex flex-1  w-full'>
            {children}
        </div>
    </div>
  )
}


