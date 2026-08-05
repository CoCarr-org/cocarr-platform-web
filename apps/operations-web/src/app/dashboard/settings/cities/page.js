'use client'
import { useState,useEffect } from 'react'
import { toast } from 'react-toastify'
import { Popup } from '@cocarr/ui'
import { Input, Select } from '@cocarr/forms'
import {InfoToast,ErrorToast} from '@cocarr/notifications'
import Map from '@/app/_components/Map'
import axios from 'axios'
import { BiSort } from 'react-icons/bi'
import { SortAsc, SortDesc } from 'lucide-react'

export default function Cities() {
    const [cities,setCities] = useState([])
    const [showManage,setShowManage] = useState({status:false,edit:null})
    const [sort,setSort] = useState('name')

    async function getCities(){
        let res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/city`)
        setCities(res.data)
    }

    useEffect(()=>
    {
        getCities();
    },[])
    
    const onCitySubmit = async(e,data)=>
    {
        try 
        {
            e.preventDefault()
            let res;
            console.log('sbm',data)
            if(showManage.edit)
            {
                res = await coreApi().put(`/city/${data.id}`,{...data})  
            }
            else
            {
                res = await coreApi().post(`/city`,{...data}) 
                
            }
            if(res.data)
            {
                if(showManage.edit)
                {
                    setCities(cities=>{
                        let prev = [...cities]
                        let itemIndex = prev.findIndex(item=>item.id === showManage.edit)
                        console.log('itemIndex',itemIndex,'res',res.data)
                        prev[itemIndex] = {...prev[itemIndex],cityName:res.data.cityName}
                        return prev;
                    })
                }
                else setCities(cities=>([...cities,{...res.data}]))
                InfoToast(showManage.edit ? 'City Updated' : 'City Created',{position: toast.POSITION.BOTTOM_CENTER,hideProgressBar:true})
                await getCities()
                setShowManage({status:false,edit:null})
            }
            else ErrorToast('error creating city')
        } catch (error) {
            console.log(error)
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
    <div className='w-full flex-1 justify-center items-center'  >
    <div className='w-full'>
    <div className='flex px-6 py-4 justify-between items-center w-full'>
        {/* <h3 className='text-md font-semibold'>Cities</h3> */}
        <div></div>
        <button className='btn-md' onClick={()=>setShowManage({status:true})}>Add City</button>
    </div>
    <table className='bg-white   table-auto w-full flex-1 h-full rounded-none shadow-none drop-shadow-none'>
            <thead className='bg-[#fff] rounded-none shadow-none drop-shadow-none w-full'>
                <tr className='w-full'>
            
                <td><p onClick={()=>onSortPress('name')} className='cursor-pointer flex items-center hover:text-black'>Name {sort === 'name' || sort === '-name'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>

                <td><p className='cursor-pointer flex items-center hover:text-black'>Icon</p></td>

                <td><p onClick={()=>onSortPress('status')} className='cursor-pointer flex items-center hover:text-black'>Status {sort === 'status' || sort === '-status'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>
                
                <td><p onClick={()=>onSortPress('availableSoon')} className='cursor-pointer flex items-center hover:text-black'>Coming Soon {sort === 'availableSoon' || sort === '-availableSoon'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>


                <td><p className='cursor-pointer flex items-center hover:text-black'>Action</p></td>
                </tr>
            </thead>
            <tbody className='bg-[#fafafa]'>
                {
                    cities.map((item,index)=>
                    {
                        return <tr key={index}>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>{item.name}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>{item.name}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                            <div>
                                    <p className={`text-[13px] font-semibold px-3 inline-block py-1 rounded-md ${item.active ? 'bg-[#39C7A5] bg-opacity-50 text-green-700 ' : 'text-red-700 bg-red-200 bg-opacity-10'}}`}>{item.active ? 'Active' : 'Inactive'}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                            <div>
                                    <p className={`text-[13px] font-semibold px-3 inline-block py-1 rounded-md ${item.availableSoon ? 'bg-[#39C7A5] bg-opacity-50 text-green-700 ' : 'text-red-700 bg-red-200 bg-opacity-10'}}`}>{item.availableSoon ? 'Yes' : 'No'}</p>
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
    {showManage.status === true ? <ManageCity setShow={setShowManage} onSubmit={onCitySubmit} edit={showManage.edit}/> : null}
    </div>
  )
}

const ManageCity = ({setShow,onSubmit,edit=false})=>
{
    const [city,setCity] = useState({id:null,name:'',lat:'',lng:''})
    const [loading,setLoading] = useState(edit ? true : false)
    useEffect(()=>
    {
        async function getCityInfo(){
            if(edit)
            {
                let res = await coreApi().get(`${process.env.REACT_APP_BASE_URL}/city/${edit}`)
                console.log(res.data)
                setCity({id:res.data.id,name:res.data.name,active:res.data.active,availableSoon:res.data.availableSoon,lat:res.data.lat,lng:res.data.lng})
                setLoading(false)
            }
        }
        getCityInfo()
    },[])
    return loading ? 'loading' :<Popup onClose={()=>setShow({status:false})}  title={edit ?  'Edit City' : 'Add City'} submitTitle={edit ? 'Update' : 'Add'} formName={'createCity'}>
        <form className='w-full' name='createCity' onSubmit={(e)=>onSubmit(e,edit ? city : {name:city.name,lat:city.lat,lng:city.lng})} id="createCity">
            <div>
                <label>City Name</label>
                <Input placeholder={'Enter City Name'} value={city.name} setValue={(value)=>setCity(city=>({...city,name:value}))} required={true}/>
            </div>
            <div>
                <label>Status</label>
                <Select options={[{value:true,name:'Active'},{value:false,name:'Inactive'}]} placeholder={'Select Status'} value={city.active} setValue={(value)=>setCity(city=>({...city,active:value}))} required={true}/>
            </div>
            <div>
                <label>Coming Soon</label>
                <Select options={[{value:true,name:'True'},{value:false,name:'False'}]} placeholder={'Select Coming Soon Status'} value={city.availableSoon} setValue={(value)=>setCity(city=>({...city,availableSoon:value}))} required={true}/>
            </div>
            <div>
                <Map defaultLocation={{lat:city.lat,lng:city.lng}}  setLocation={(lat,lng)=>setCity(prev=>({...prev,lat:lat,lng:lng}))}/>
            </div>
        </form>
    </Popup>
}
