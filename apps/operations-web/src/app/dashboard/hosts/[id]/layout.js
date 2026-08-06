'use client'
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import axios from 'axios'
import { SimpleHeader } from '@cocarr/ui'
import { NavigationTabBar } from '@cocarr/ui'

export default function RideInfoLayout({children}) {

    const [searchText,setSearchText] = useState('')
    const params = useParams()
    const id = params?.id
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
            if(id)
            {
                let res = await axios.get(`/host/${id}?`)
                setHostInfo(res.data)
            }
        } catch (error) {
            ErrorToast('Error getting products')
        }
    }

    useEffect(()=>
    {
        getHostInfo();
    },[])

    const menu = [{label:'Host Info',url:`/dashboard/hosts/${id}`},{label:'Rides',url:`/dashboard/hosts/${id}/rides`},{label:'Payment',url:`/dashboard/hosts/${id}/payment`},{label:'Vehicles',url:`/dashboard/hosts/${id}/vehicles`}]

  return (
    <div className='max-w-7xl mx-auto'>
        <SimpleHeader title={hostInfo.name} parent='hosts' parentLink='hosts' RightContent={()=><div></div>}/>

            <NavigationTabBar options={menu}/>
        
        <div className='flex flex-1  w-full overflow-scroll'>
            {children}
        </div>
    </div>
  )
}


