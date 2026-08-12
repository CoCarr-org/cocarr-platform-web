'use client'
import { useEffect, useState } from "react"
import { Input } from '@cocarr/forms'
import { Popup } from '@cocarr/ui'
import { Select } from '@cocarr/forms'
import { coreApi } from '@cocarr/api-sdk'
import { TabGroup } from '@cocarr/ui'
import AsyncSelect from 'react-select/async';
import { ErrorToast } from '@cocarr/notifications'
import { DateRangePicker } from "react-date-range"
import { DateTimePicker } from '@cocarr/ui'
import { getCurrentTimeRounded, getDateTimeFormat } from '@cocarr/shared-utils'

export default function ManageRide({onClose,onSubmit})
{
    const [data,setData] = useState({bookingType:'offline',city:'',startDate:getCurrentTimeRounded(),endDate:new Date(getCurrentTimeRounded().getTime() + 24 * 60 * 60 * 1000)})
    const [users,setUsers] = useState([])
    const [cities,setCities] = useState([])
    const [vehicles,setVehicles] = useState([])
    const [showPicker,setShowPicker] = useState(false)


    const getCities = async()=>
    {
        try 
        {
            // if(cityFilter) query+= `&cityId=${cityFilter}`
            // if(premiumFilter) query+= `&isPremium=${premiumFilter}`
            let res = await coreApi().get(`/city`)
            // setUsers(res.data.data)
            setCities(res.data)
        } 
        catch (error) 
        {
            ErrorToast(error)
        }
    }
    const loadUsers = async(searchText)=>
    {
        try 
        {
            let query = `populate=true&offset=0&limit=50&sort=name`
            query+= `&search=${searchText}`
            // if(cityFilter) query+= `&cityId=${cityFilter}`
            // if(premiumFilter) query+= `&isPremium=${premiumFilter}`
            let res = await coreApi().get(`/user?${query}`)
            // setUsers(res.data.data)
            return res.data.data
        } 
        catch (error) 
        {
            ErrorToast(error)
        }
    }
    
    const loadCars = async(searchText)=>
    {
        try 
        {
            let query = `populate=true&offset=0&limit=50&sort=name`
            if(searchText) query+= `&search=${searchText}`
            if(data.city) query+= `&city=${data.city}`
            // if(premiumFilter) query+= `&isPremium=${premiumFilter}`
            let res = await coreApi().get(`/admin/vehicle?${query}`)
            setVehicles(res.data)
            return res.data
        } 
        catch (error) 
        {
            ErrorToast(error)
        }
    }

    useEffect(()=>
    {
        getCities()
    },[])
    
    useEffect(()=>
    {
        if(data.city) loadCars()
    },[data.city])

    return <Popup title={'Add Ride'} onClose={onClose} formName={'addRide'} submitTitle={'Add Ride'} onSubmittingTitle='Adding Ride...'>
    <form name='addRide' id="addRide" className="w-full" onSubmit={(e)=>onSubmit(e,{...data,vehicleId:data.vehicleId.id})}>
        <div className="grid grid-cols-2 gap-4 relative">
            <div>
                <label>Ride Type</label>
                <div className='w-auto flex  ml-0 mb-2'>
                    <div class={`relative self-stretch h-[full] w-full`}>
                        <div className="flex bg-[#fff] border border-slate-200 rounded-md overflow-hidden w-full">
                            {
                                [{label:'Offline',value:'offline'},{label:'Online',value:'online'}].map((item,index)=>
                                {
                                    return <div key={index} onClick={()=>setData(prev=>({...prev,bookingType:item.value}))} className={`w-full  text-center flex justify-center items-center py-2.5 px-4 ${data.bookingType === item.value ? 'bg-black text-[#ECC032]' : 'bg-transparent text-[#454545]'}`}>
                                    <div className='flex items-center text-center'>
                                        <p className='text-xs font-semibold tracking-tight '>{item.label}</p>
                                    </div>
                                    </div>
                                })
                            }
                        </div>
                    </div>
        </div>
            </div>
            <div>
                <label>City</label>
                <Select options={cities} customValue={'id'} placeholder={'Select City'} value={data.city} required={true} setValue={(value)=>setData(data=>({...data,city:value}))}/>
            </div>
            <div>
                <label>Vehicle</label>
                <AsyncSelect value={data.vehicleId} onChange={(value)=>setData(prev=>({...prev,vehicleId:value}))}  defaultOptions={vehicles} loadOptions={loadCars} getOptionLabel={item=><div><p className="text-xs font-medium">{`${item.vehicleName}`}</p><p className="text-xs">{item.vehicleNumber}</p></div>} getOptionValue={item=>item.id} />
            </div>
            <div>
                <label>User</label>
                <AsyncSelect isDisabled={data.bookingType === 'offline'} defaultOptions={users} loadOptions={loadUsers} getOptionLabel={item=><div><p className="text-xs font-medium">{`${item.name}`}</p><p className="text-xs">{item.contactNumber}</p></div>} getOptionValue={item=>item.id} />
            </div>
            <div className="col-span-2">
                <label>Ride Timing</label>
                <div>
                    <div className="grid grid-cols-2 w-full border border-gray-200 bg-[#fafafa] rounded-md cursor-pointer" onClick={()=>setShowPicker(true)}>
                        <div className="flex flex-col justify-center border-r border-r-gray-200 pl-4 py-2">
                            <p className="text-xs mb-0 text-[#959595]">Start Time:</p>
                            <p className="text-sm mt-0 font-medium">{data.startDate ? getDateTimeFormat(data.startDate) : 'Not Available'}</p>
                        </div>
                        <div className="flex flex-col justify-center pl-4">
                            <p className="text-xs mb-0 text-[#959595]">Start Time:</p>
                            <p className="text-sm mt-0 font-medium">{data.endDate ? getDateTimeFormat(data.endDate) : 'Not Available'}</p>
                        </div>
                    </div>
                    {showPicker ? <DateTimePicker startDate={data.startDate} setShow={setShowPicker} endDate={data.endDate} setEndDate={(value)=>setData(prev=>({...prev,endDate:value}))} setStartDate={(value)=>setData(prev=>({...prev,startDate:value}))} /> : null}
                </div>
                {/* <Input type='datetime' placeholder={'Enter Starting Time'} value={data.startTime} required={true} setValue={(value)=>setData(data=>({...data,startTime:value}))}/> */}
            </div>
        </div>
        </form>
    </Popup>
}