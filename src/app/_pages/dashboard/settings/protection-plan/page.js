'use client'
import { useState,useEffect } from 'react'
import { toast } from 'react-toastify'
import Popup from '@/app/_components/Popup'
import Input from '@/app/_components/Input'
import {InfoToast,ErrorToast} from '@/app/_helpers/toasters'
import axios from 'axios'
import { BiSort } from 'react-icons/bi'
import { SortAsc, SortDesc } from 'lucide-react'
import { getDateFormat, getDateTimeFormat, getTimeFormat } from '@/app/_helpers/utils'

export default function Cities() {
    const [cities,setCities] = useState([])
    const [showManage,setShowManage] = useState({status:false,edit:null})
    const [sort,setSort] = useState('name')

    async function getCities(){
        let res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/protection-plan`)
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
                res = await axios.put(`/protection-plan/${data.id}`,{...data})  
            }
            else
            {
                res = await axios.post(`/protection-plan`,{...data}) 
                
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
                InfoToast(showManage.edit ? 'Protection Plan Updated' : 'Protection Plan Created',{position: toast.POSITION.BOTTOM_CENTER,hideProgressBar:true})
                await getCities()
                setShowManage({status:false,edit:null})
            }
            else ErrorToast('error creating protection plan')
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
        <button className='btn-md' onClick={()=>setShowManage({status:true})}>Add Protection Plan</button>
    </div>
    <table className='bg-white   table-auto w-full flex-1 h-full rounded-none shadow-none drop-shadow-none'>
            <thead className='bg-[#fff] rounded-none shadow-none drop-shadow-none w-full'>
                <tr className='w-full'>
            
                <td><p onClick={()=>onSortPress('startDate')} className='cursor-pointer flex items-center hover:text-black'>Start Date {sort === 'startDate' || sort === '-startDate'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>
                
                <td><p onClick={()=>onSortPress('endDate')} className='cursor-pointer flex items-center hover:text-black'>End Date {sort === 'endDate' || sort === '-endDate'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>


                <td><p onClick={()=>onSortPress('basicPlanPrice')} className='cursor-pointer flex items-center hover:text-black'>Basic Plan {sort === 'basicPlanPrice' || sort === '-basicPlanPrice'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>

                <td><p onClick={()=>onSortPress('silverPlanPrice')} className='cursor-pointer flex items-center hover:text-black'>Silver Plan {sort === 'silverPlanPrice' || sort === '-silverPlanPrice'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>
                
                <td><p onClick={()=>onSortPress('goldPlanPrice')} className='cursor-pointer flex items-center hover:text-black'>Gold Plan {sort === 'goldPlanPrice' || sort === '-goldPlanPrice'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>
                
                <td><p className='cursor-pointer flex items-center hover:text-black'>Status</p></td>

                </tr>
            </thead>
            <tbody className='bg-[#fafafa]'>
                {
                    cities.map((item,index)=>
                    {
                        return <tr key={index}>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>{getDateFormat(item.startDate)}</p>
                                    <p className='text-xs font-regular my-0'>{getTimeFormat(item.startDate)}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>{item.endDate ? getDateFormat(item.endDate) : 'N/A'}</p>
                                    <p className='text-xs font-regular my-0'>{item.endDate ? getTimeFormat(item.endDate) : 'N/A'}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>Rs.{item.basicPlanPrice}</p>
                                    <p className='text-xs text-[#757575]'>Rs.{item.basicPlanAccidentAmount}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>Rs.{item.silverPlanPrice}</p>
                                    <p className='text-xs text-[#757575]'>Rs.{item.silverPlanAccidentAmount}</p>
                                </div>
                            </td>

                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>Rs.{item.goldPlanPrice}</p>
                                    <p className='text-xs text-[#757575]'>Rs.{item.goldPlanAccidentAmount}</p>
                                </div>
                            </td>
                            <td className='capitalize'>
                            <div>
                                    <p className={`text-[13px] font-semibold px-3 inline-block py-1 rounded-md ${item.availableSoon ? 'bg-[#39C7A5] bg-opacity-50 text-green-700 ' : 'text-red-700 bg-red-200 bg-opacity-10'}}`}>{item.availableSoon ? 'Yes' : 'No'}</p>
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
    const [plan,setPlan] = useState({id:null,name:'',lat:'',lng:''})
    const [loading,setLoading] = useState(edit ? true : false)
    useEffect(()=>
    {
        async function getPlanInfo(){
            if(edit)
            {
                let res = await axios.get(`${process.env.REACT_APP_BASE_URL}/plan/${edit}`)
                console.log(res.data)
                setPlan({id:res.data.id,startDate:res.data.startDate,basicPlanPrice:res.data.basicPlanPrice,silverPlanPrice:res.data.silverPlanPrice,goldPlanPrice:res.data.goldPlanPrice,basicPlanAccidentAmount:res.data.basicPlanAccidentAmount,silverPlanAccidentAmount:res.data.silverPlanAccidentAmount,goldPlanAccidentAmount:res.data.goldPlanAccidentAmount,basicPlanExtraHourPrice:res.data.basicPlanExtraHourPrice,silverPlanExtraHourPrice:res.data.silverPlanExtraHourPrice,goldPlanExtraHourPrice:res.data.goldPlanExtraHourPrice,status:res.data.status,basicPlanLuxuryPrice:res.data.basicPlanLuxuryPrice,silverPlanLuxuryPrice:res.data.silverPlanLuxuryPrice,goldPlanLuxuryPrice:res.data.goldPlanLuxuryPrice,basicPlanLuxuryExtraHourPrice:res.data.basicPlanLuxuryExtraHourPrice,silverPlanLuxuryExtraHourPrice:res.data.silverPlanLuxuryExtraHourPrice,goldPlanLuxuryExtraHourPrice:res.data.goldPlanLuxuryExtraHourPrice,basicPlanLuxuryAccidentAmount:res.data.basicPlanLuxuryAccidentAmount,silverPlanLuxuryAccidentAmount:res.data.silverPlanLuxuryAccidentAmount,goldPlanLuxuryAccidentAmount:res.data.goldPlanLuxuryAccidentAmount})
                setLoading(false)
            }
        }
        getPlanInfo()
    },[])
    return loading ? 'loading' :<Popup onClose={()=>setShow({status:false})}  title={edit ?  'Edit Protection Plan' : 'Add Protection Plan'} submitTitle={edit ? 'Update' : 'Add'} formName={'createProtectionPlan'} size='lg'>
        <form className='w-full' name='createProtectionPlan' onSubmit={(e)=>onSubmit(e,plan )} id="createProtectionPlan">
            <div className='grid grid-cols-6 gap-2'>
            <div className='col-span-6'>
                <label>Start Date</label>
                <Input placeholder={'Enter Start Date'} type='date' value={plan.startDate} setValue={(value)=>setPlan(plan=>({...plan,startDate:value}))} required={true}/>
            </div>
            <div>
                <label>Basic Plan Price</label>
                <Input placeholder={'Enter Basic Plan Price'} value={plan.basicPlanPrice} setValue={(value)=>setPlan(plan=>({...plan,basicPlanPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Extra Hour Price</label>
                <Input placeholder={'Enter Extra Hour Price'} value={plan.basicPlanExtraHourPrice} setValue={(value)=>setPlan(plan=>({...plan,basicPlanExtraHourPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Max Damage Amount</label>
                <Input placeholder={'Max Damage Amount'} value={plan.basicPlanAccidentAmount} setValue={(value)=>setPlan(plan=>({...plan,basicPlanAccidentAmount:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Price</label>
                <Input placeholder={'Enter Basic Plan Price'} value={plan.basicPlanLuxuryPrice} setValue={(value)=>setPlan(plan=>({...plan,basicPlanLuxuryPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Extra Hour</label>
                <Input placeholder={'Enter Extra Hour Price'} value={plan.basicPlanLuxuryExtraHourPrice} setValue={(value)=>setPlan(plan=>({...plan,basicPlanLuxuryExtraHourPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Max Damage</label>
                <Input placeholder={'Max Damage Amount'} value={plan.basicPlanLuxuryAccidentAmount} setValue={(value)=>setPlan(plan=>({...plan,basicPlanLuxuryAccidentAmount:value}))} required={true}/>
            </div>
            <div>
                <label>Silver Plan Price</label>
                <Input placeholder={'Silver Plan Price'} value={plan.silverPlanPrice} setValue={(value)=>setPlan(plan=>({...plan,silverPlanPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Extra Hour Price</label>
                <Input placeholder={'Extra Hour Price'} value={plan.silverPlanExtraHourPrice} setValue={(value)=>setPlan(plan=>({...plan,silverPlanExtraHourPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Max Damage Amount</label>
                <Input placeholder={'Enter Amount'} value={plan.silverPlanAccidentAmount} setValue={(value)=>setPlan(plan=>({...plan,silverPlanAccidentAmount:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Price</label>
                <Input placeholder={'Enter Luxury Price'} value={plan.silverPlanLuxuryPrice} setValue={(value)=>setPlan(plan=>({...plan,silverPlanLuxuryPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Extra Hour</label>
                <Input placeholder={'Enter Luxury Extra Hour'} value={plan.silverPlanLuxuryExtraHourPrice} setValue={(value)=>setPlan(plan=>({...plan,silverPlanLuxuryExtraHourPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Max Damage</label>
                <Input placeholder={'Enter Luxury Max Damage'} value={plan.silverPlanLuxuryAccidentAmount} setValue={(value)=>setPlan(plan=>({...plan,silverPlanLuxuryAccidentAmount:value}))} required={true}/>
            </div>
            <div>
                <label>Gold Plan Price</label>
                <Input placeholder={'Enter Gold Plan Price'} value={plan.goldPlanPrice} setValue={(value)=>setPlan(plan=>({...plan,goldPlanPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Extra Hour Price</label>
                <Input placeholder={'Extra Hour Price'} value={plan.goldPlanExtraHourPrice} setValue={(value)=>setPlan(plan=>({...plan,goldPlanExtraHourPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Max Damage Amount</label>
                <Input placeholder={'Enter Amount'} value={plan.goldPlanAccidentAmount} setValue={(value)=>setPlan(plan=>({...plan,goldPlanAccidentAmount:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Price</label>
                <Input placeholder={'Enter Luxury Price'} value={plan.goldPlanLuxuryPrice} setValue={(value)=>setPlan(plan=>({...plan,goldPlanLuxuryPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Extra Hour</label>
                <Input placeholder={'Enter Luxury Extra Hour'} value={plan.goldPlanLuxuryExtraHourPrice} setValue={(value)=>setPlan(plan=>({...plan,goldPlanLuxuryExtraHourPrice:value}))} required={true}/>
            </div>
            <div>
                <label>Luxury Max Damage</label>
                <Input placeholder={'Enter Luxury Max Damage'} value={plan.goldPlanLuxuryAccidentAmount} setValue={(value)=>setPlan(plan=>({...plan,goldPlanLuxuryAccidentAmount:value}))} required={true}/>
            </div>
            

            </div>
        </form>
    </Popup>
}
