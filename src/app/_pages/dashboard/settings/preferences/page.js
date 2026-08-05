'use client'
import React, { useState,useEffect } from 'react'
import { toast } from 'react-toastify'
import Popup from '@/app/_components/Popup'
import Input from '@/app/_components/Input'
import { InfoToast } from '@/app/_helpers/toasters'
import axios from 'axios'

export default function Preferences() {
    const [settings,setSettings] = useState([])
    const [showManage,setShowManage] = useState(false)

    async function getSettings(){
        let res = await axios.get(`/settings`)
        setSettings(res.data)
    }

    useEffect(()=>
    {
        getSettings();
    },[])

    const onSettingSubmit = async(e,data)=>
    {
        try 
        {
            e.preventDefault()
            let res;
            res = await authAxios.post(`/settings/${data.type}`,{value:data.value}) 
            InfoToast('Settings Updated')
            await getSettings()
            setShowManage(false)
        } catch (error) {
            console.log(error)
            toast.error(error)
        }
    }

  return (
    <div className='w-full flex-1 justify-center items-center p-6'>
        <div className='overflow-hidden rounded-md border border-gray-100 shadow-xs shadow-gray-200 bg-white'>
        {
            settings.map((item,index)=>
        {
            return <SettingsItem item={item} key={index} setShow={setShowManage}/>
        })
        }
    </div>
    {showManage ? <ManageBrand setShow={setShowManage} onSubmit={onSettingSubmit} showManage={showManage}/> : null}
    </div>
  )
}

const SettingsItem = ({item,setShow})=>
{
    return <div className='border-b border-gray-100 overflow-hidden mb-4'> 
        <div className='flex justify-between items-center px-6 py-4'>
            <div>
                <p className='text-sm font-semibold tracking-tight'>{item.label}</p>
                <p className='text-xs text-[#757575]'>Driver Fee Option provides flexibility and convenience for customers using our car rental platform. </p>
            </div>
            <div onClick={()=>setShow(item.type)}>
                <p className='py-2 px-4 text-right w-[120px] hover:bg-[#f3f3f3] cursor-pointer font-semibold tracking-tighter'>{item.value}</p>
            </div>
        </div>
    </div>
}
// const SettingsItem = ({item,setShow})=>
// {
//     return <div className='bg-white border border-gray-200 overflow-hidden rounded-md shadow-sm mb-4'> 
//         <div className='flex justify-between items-center px-6 py-4'>
//             <div>
//                 <p className='text-base font-semibold'>{item.label}</p>
//                 {/* <p className='text-xs text-[#757575]'>Driver Fee Option provides flexibility and convenience for customers using our car rental platform. </p> */}
//             </div>
//             <div onClick={()=>setShow(item.type)}>
//                 <p className='py-2 px-4 border rounded-md border-gray-200 w-[120px] hover:bg-[#f3f3f3] cursor-pointer'>{item.value}</p>
//             </div>
//         </div>
//     </div>
// }


const ManageBrand = ({setShow,onSubmit,showManage})=>
{
    const [brand,setBrand] = useState({id:null,type:'',label:'',value:''})
    const [loading,setLoading] = useState(true)
    useEffect(()=>
    {
        async function getSettingInfo(){
            let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/settings/${showManage}`)
            console.log(res.data)
            setBrand({id:res.data.id,type:res.data.type,label:res.data.label,value:res.data.value})
            setLoading(false)
        }
        getSettingInfo()
    },[])
    return loading ? 'loading' :<Popup onClose={()=>setShow(false)}  title={'Update Setting'} submitTitle={'Update'} formName={'updateSettings'}>
        <form className='w-full' onSubmit={(e)=>onSubmit(e,{value:brand.value,type:brand.type,id:brand.id})} id="updateSettings">
            <div className='mb-4'>
                <label>Preference Type</label>
                <p className='text-sm font-medium'>{brand.label}</p>
            </div>
            <div>
                <label>Preference Value (In Rs.)</label>
                <Input placeholder={'Enter Value'} type='number' value={brand.name} setValue={(value)=>setBrand(brand=>({...brand,value:parseInt(value)}))} required={true}/>
            </div>
        </form>
    </Popup>
}