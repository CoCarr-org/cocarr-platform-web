'use client'
import React, { useState,useEffect } from 'react'
import { toast } from 'react-toastify'
import Popup from '@/app/_components/Popup'
import Input from '@/app/_components/Input'
import Select from '@/app/_components/Select'
import Map from '@/app/_components/Map'
import { InfoToast } from '@/app/_helpers/toasters'
import Loader from '@/app/_components/Loader'
import axios from 'axios'
import { SortAsc, SortDesc } from 'lucide-react'

export default function PickupPoints() {
    const [pickups,setPickups] = useState([])
    const [showManage,setShowManage] = useState({status:false,edit:null})
    const [sort,setSort] = useState('name')
    const [loading,setLoading] = useState(true)

    async function getPickups(){
        try {
            let res = await axios.get(`/pickup-point`)
            setPickups(res.data.rows)
            setLoading(false)
        } catch (error) 
        {
            setLoading(false)
            InfoToast("Error Occured")
        }
    }

    useEffect(()=>
    {
        getPickups();
    },[])

    const onPickupSubmit = async(e,data)=>
    {
        try 
        {
            console.log('sbm',data)
            e.preventDefault()
            let res;
            if(showManage.edit)
            {
                res = await axios.put(`/pickup-point/${data.id}`,{...data})  
            }
            else
            {
                res = await axios.post(`/pickup-point`,{...data}) 
                
            }
            if(res.data)
            {
                if(showManage.edit)
                {
                    setPickups(pickups=>{
                        let prev = [...pickups]
                        let itemIndex = prev.findIndex(item=>item.id === showManage.edit)
                        prev[itemIndex] = {...prev[itemIndex],name:res.data.name}
                        return prev;
                    })
                }
                else setPickups(pickups=>([...pickups,{...res.data}]))
                toast.success(showManage.edit ? 'Pickup Point Updated' : 'Pickup Point Created',{position: toast.POSITION.BOTTOM_CENTER,hideProgressBar:true})
                await getPickups()
                setShowManage({status:false,edit:null})
            }
            else toast('error creating Pickup Point')
        } catch (error) {
            console.log('error',error)
            toast.error(error)
        }
    }

    const onSortPress = (type)=>
    {
        if (sort === type) {
            if(sort === `-${type}`) setSort(type)
            else setSort(`-${type}`);
          } else {
            setSort(type);
          }
    }

  return (
    !loading ? <div className='w-full'>
        <div className='overflow-hidden w-full'>
        <div className='flex px-6 pb-4 justify-between items-center w-full'>
            <h3 className='text-md font-semibold'>Pickups</h3>
            <button className='btn-md' onClick={()=>setShowManage({type:'pickup',status:true})}>Add Pickup Point</button>
        </div>
        <table className=' bg-white border border-gray-200 table-auto w-full flex-1 h-full'>
            <thead className='bg-[#f9f9f9] w-full'>
                <tr className='w-full'>
            
                <td><p onClick={()=>onSortPress('name')} className='cursor-pointer flex items-center hover:text-black'>Name {sort === 'name' || sort === '-name'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>


                <td><p onClick={()=>onSortPress('address')} className='cursor-pointer flex items-center hover:text-black'>Address {sort === 'address' || sort === '-address'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>

                <td><p onClick={()=>onSortPress('status')} className='cursor-pointer flex items-center hover:text-black'>City {sort === 'city' || sort === '-city'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>


                <td><p className='cursor-pointer flex items-center hover:text-black'>Action</p></td>
                </tr>
            </thead>
            <tbody>
                {
                    pickups.map((item,index)=>
                    {
                        return <tr key={index}>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>{item.name}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>{item.address} <a className='text-xs text-blue-700 underline' target='_blank' href={`https://www.google.com/maps?q=${item.lat},${item.long}`}>Map</a></p>
                                </div>
                            </td>
                            <td className='capitalize'>
                            <div>
                                    {/* <p className='text-sm font-regular my-0'>{item.city.name}</p> */}
                                </div>
                            </td>
                            <td className='capitalize'>
                                <div>
                                    <button onClick={()=>setShowManage({status:true,edit:item.id})} className='btn-xs'>Edit</button>
                                </div>
                            </td>
                        </tr>
                    })
                }
            </tbody>
        </table>
    </div>
    {showManage.status === true ? <ManagePickuPoints setShow={setShowManage} onSubmit={onPickupSubmit} edit={showManage.edit}/> : null}
    </div> : <Loader/>
  )
}

const ManagePickuPoints = ({setShow,onSubmit,edit=false})=>
{
    const [pickup,setPickup] = useState({id:null,name:'',address:'',lat:null,long:null,cityId:''})
    const [loading,setLoading] = useState(edit ? true : false)
    const [cities,setCities] = useState([])


    async function getCities(){
        let res = await axios.get(`${process.env.REACT_APP_BASE_URL}/city`)
        setCities(res.data)
    }

    useEffect(()=>
    {
        getCities();
    },[])
    useEffect(()=>
    {
        async function getPickupInfo(){
            if(edit)
            {
                let res = await axios.get(`/pickup-point/${edit}`)
                console.log(res.data)
                setPickup({id:res.data.id,name:res.data.name,address:res.data.address,lat:res.data.lat,long:res.data.long,cityId:res.data.cityId})
                setLoading(false)
            }
        }
        getPickupInfo()
    },[])
    return loading ? 'loading' :<Popup onClose={()=>setShow({status:false})}  title={edit ?  'Edit Pick Point' : 'Add Pick Point'} submitTitle={edit ? 'Update' : 'Add'} formName={'createPickup'}>
        <form className='w-full' onSubmit={(e)=>onSubmit(e,edit ? pickup : {...pickup})} id="createPickup">
            <div>
                <label>Pickup Point Name</label>
                <Input placeholder={'Enter Pick Point Name'} value={pickup.name} setValue={(value)=>setPickup(pickup=>({...pickup,name:value}))} required={true}/>
                <Select value={pickup.cityId} options={cities} customLabel={'name'} customValue={'id'} placeholder={'Select City'} setValue={(value)=>setPickup(prev=>({...prev,cityId:value}))}/>
                <Input placeholder={'Enter Address'} value={pickup.address} setValue={(value)=>setPickup(pickup=>({...pickup,address:value}))} required={true}/>
                <Map defaultLocation={{lat:pickup.lat,lng:pickup.long}} setLocation={(lat,long)=>setPickup(prev=>({...prev,lat:lat,long:long}))}/>
            </div>
        </form>
    </Popup>
}