'use client'
import TabGroup from '@/app/_components/TabGroup'
import axios from 'axios'
import { useParams } from '@/app/_helpers/useParams'
import React, { useEffect, useState } from 'react'

export default function VehicleInfo() {

    const {id} = useParams()
    const [menu,setMenu] = useState([{url:`/vehicles/${id}/`,label:`Vehicle Information`},{url:`/vehicles/${id}/rides`,label:`Rides`},{url:`/vehicles/${id}/reviews`,label:`Reviews`}])
    const [showManage,setShowManage] = useState({type:null,status:false,edit:null})



  return (
    <div>
        <div className='py-4 px-6 max-w-7xl mx-auto block grid-cols-10 gap-x-6'>
            <div className='col-span-2'>
                <div className='mb-10'>
                </div>
            </div>
            <div className='col-span-8'>
            {/* <Outlet/> */}
        </div>
        
        </div>
    </div>
  )
}


const MenuItem = ({item})=>
{
    // return <Link to={item.url} className='block rounded-md mb-2 items-center py-3 px-4 bg-white border border-slate-200'>
    //     <div className='flex items-center '>
    //         <p className='text-sm font-medium tracking-tight text-[#454545] mr-2'>{item.label}</p>
    //     </div>
    //     </Link>
    return <TabGroup options={[]}/>
}





// const ManageRoute = ({setShow,onSubmit,edit=false})=>
// {
//     const [route,setRoute] = useState({id:null,routeName:'',routeCity:'',stops:[{stopName:'',stopNumber:1,isStartingPoint:false,isEndingPoint:false},{stopName:'',stopNumber:2,isStartingPoint:true,isEndingPoint:false},{stopName:'',stopNumber:4,isStartingPoint:false,isEndingPoint:true}]})
//     const [loading,setLoading] = useState(edit ? true : false)
//     const [cities,setCities] = useState([])
//     useEffect(()=>
//     {
//         async function getRouteInfo(){
//             if(edit)
//             {
//                 let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/route/${edit}?populate=true`)
//                 console.log(res.data.data)
//                 setRoute({id:res.data.data.id,routeName:res.data.data.routeName,stops:res.data.data.stops})
//                 setLoading(false)
//             }
//         }
//         async function getCities(){
//                 let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/city`)
//                 setCities(res.data.data)
//         }
//         getRouteInfo()
//         getCities()
//     },[])


//     const updateStop = (value,index)=>
//     {
//         setRoute((prev)=>
//         {
//             let newData = {...prev}
//             newData.stops[index] = {...prev.stops[index],stopName:value} 
//             return newData;
//         })
//     }

//     const toggleStop = (add=true)=>
//     {
//         if(add) 
//         {
//             setRoute((prev)=>
//             {
//                 let newData = {...prev}
//                 newData.stops = [{...prev.stops[0]},{...prev.stops[1]},{stopName:'',stopNumber:3,isStartingPoint:false,isEndingPoint:false},{...prev.stops[2]}]
//                 console.log('newdat',newData)
//                 return newData;
//             })
//         }
//         else 
//         {
//             setRoute((prev)=>
//             {
//                 let newData = {...prev}
//                 newData.stops = [{...prev.stops[0]},{...prev.stops[1]},{...prev.stops[3]}]
//                 return newData;
//             })
//         }
//     }
//     return loading ? 'loading' :<Popup onClose={()=>setShow({type:null,status:false})}  title={edit ?  'Edit Pickup Point' : 'Add Pickup Point'} submitTitle={edit ? 'Update' : 'Add'} formName={'createRoute'}>
//         <form className='w-full' onSubmit={(e)=>onSubmit(e,route)} id="createRoute">
//             <div>
//                 <label>Pickup Point Name</label>
//                 <Input placeholder={'Enter Pickup Point Name'} value={route.routeName} setValue={(value)=>setRoute(route=>({...route,routeName:value}))} required={true}/>
//             </div>
//             <div>
//                 <label>City</label>
//                 <Select placeholder={'Select City'} customLabel={'cityName'} options={cities} customValue={'id'} value={edit ? route.routeCity.id : route.routeCity} setValue={(value)=>setRoute(data=>({...data,routeCity:value}))}/>
//             </div>
//             <div>
//                 <label>Route Stops</label>
//                 <div className="flex my-2 items-center">
//                     <div className="w-3 h-3 bg-green-400 rounded-lg">
//                     </div>
//                     <p className="text-xs font-medium text-[#757575] my-0 ml-2 mr-4 tracking-tight w-[80px]">First Stop</p>
//                 <Input placeholder={'Enter Stop Name'} value={route.stops[0].stopName} setValue={(value)=>updateStop(value,0)} required={true} padding={false}/>
//                 </div>
//                 {
//                     route.stops.map((item,index)=>
//                     {
//                         if(parseInt(item?.stopNumber) === 1 || parseInt(item?.stopNumber) === 4) return false;
//                         else if (item ) return <div className="flex my-2 items-center">
//                         <div className="w-3 h-3 bg-gray-400 rounded-lg">
//                             </div>
//                             <p className="text-xs font-medium text-[#757575] my-0 ml-2 mr-4 tracking-tight w-[80px]">{index === 1 ? 'Second Stop' : 'Third Stop'}</p>
//                         <Input placeholder={'Enter Stop Name'} value={route.stops[index].stopName} setValue={(value)=>updateStop(value,index)} required={true} padding={false}/>
//                         <div>
//                             {route.stops.length <= 3 && item.stopNumber === 2 ? <button type='button' className='btn-xs-inverted ml-2' onClick={()=>toggleStop(true)}>Add</button> : null}
//                             {route.stops.length >= 3 && item.stopNumber === 3 ? <button type='button' className='btn-xs-inverted ml-2' onClick={()=>toggleStop(false)}>Remove</button> : null}
//                         </div>
//                         </div>

//                     })
//                 }
//                 <div className="flex my-2 items-center">
//                 <div className="w-3 h-3 bg-red-400 rounded-lg">
//                     </div>
//                     <p className="text-xs font-medium text-[#757575] my-0 ml-2 mr-4 tracking-tight w-[80px]">Last Stop</p>
//                 <Input placeholder={'Enter Stop Name'} value={route.stops[route.stops.length-1].stopName} setValue={(value)=>updateStop(value,route.stops.length-1)} required={true} padding={false}/>
//                 </div>
//             </div>
//         </form>
//     </Popup>
// }