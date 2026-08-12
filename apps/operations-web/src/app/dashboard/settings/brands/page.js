'use client'
import { useState,useEffect } from 'react'
import { Popup } from '@cocarr/ui'
import { Input } from '@cocarr/forms'
import { InfoToast } from '@cocarr/notifications'
import { coreApi } from '@cocarr/api-sdk'
import { SortAsc, SortDesc } from 'lucide-react'

export default function Brands() {
    const [brands,setBrands] = useState([])
    const [showManage,setShowManage] = useState({status:false,edit:null})
    const [sort,setSort] = useState('name')

    async function getBrands(){
        let res = await coreApi().get(`/brand`)
        setBrands(res.data)
    }

    useEffect(()=>
    {
        getBrands();
    },[])

    const onBrandSubmit = async(e,data)=>
    {
        try 
        {
            e.preventDefault()
            let res;
            console.log('sbm',data)
            if(showManage.edit)
            {
                res = await coreApi().put(`/brand/${data.id}`,{...data})  
            }
            else
            {
                res = await coreApi().post(`/brand`,{...data}) 
                
            }
            if(res.data)
            {
                if(showManage.edit)
                {
                    setBrands(brands=>{
                        let prev = [...brands]
                        let itemIndex = prev.findIndex(item=>item.id === showManage.edit)
                        console.log('itemIndex',itemIndex,'res',res.data)
                        prev[itemIndex] = {...prev[itemIndex],name:res.data.name}
                        return prev;
                    })
                }
                else setBrands(brands=>([...brands,{...res.data}]))
                InfoToast(showManage.edit ? 'Brand Updated' : 'City Created')
                await getBrands()
                setShowManage({status:false,edit:null})
            }
            else InfoToast('error creating Brand')
        } catch (error) {
            console.log(error)
            InfoToast(error)
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
        <div className="flex justify-end p-3">
                <button className='btn-md mr-0' onClick={()=>setShowManage({type:'brand',status:true})}>Add Brand</button>
            </div>
        <div className="flex">
        <table className='bg-white table-auto w-full flex-1  h-full'>
            <thead className='bg-[#f9f9f9] w-full'>
                <tr className='w-full'>
            
                <td><p onClick={()=>onSortPress('name')} className='cursor-pointer flex items-center hover:text-black'>Name {sort === 'name' || sort === '-name'? sort.charAt(0)==='-' ? <SortAsc className='h-[16px] w-[16px] ml-1'/> : <SortDesc className='h-[16px] w-[16px] ml-1'/> : null}</p></td>


                <td><p className='cursor-pointer flex items-center hover:text-black'>Action</p></td>
                </tr>
            </thead>
            <tbody>
                {
                    brands.map((item,index)=>
                    {
                        return <tr key={item.id || index}>
                            <td className='capitalize'>
                                <div>
                                    <p className='text-sm font-regular my-0'>{item.name}</p>
                                </div>
                            </td>
                            <td className='capitalize mr-0'>
                                <div className="flex justify-end">
                                    <button onClick={()=>setShowManage({status:true,edit:item.id})} className='btn-xs'>Edit</button>
                                </div>
                            </td>
                        </tr>
                    })
                }
            </tbody>
        </table>
        </div>
    </div>
    {showManage.status === true ? <ManageBrand setShow={setShowManage} onSubmit={onBrandSubmit} edit={showManage.edit}/> : null}
    </div>
  )
}

const ManageBrand = ({setShow,onSubmit,edit=false})=>
{
    const [brand,setBrand] = useState({id:null,name:''})
    const [loading,setLoading] = useState(edit ? true : false)
    useEffect(()=>
    {
        async function getBrandInfo(){
            if(edit)
            {
                let res = await coreApi().get(`/brand/${edit}`)
                // console.log(res.data.data)
                setBrand({id:res.data.id,name:res.data.name})
                setLoading(false)
            }
        }
        getBrandInfo()
    },[])
    return loading ? 'loading' :<Popup onClose={()=>setShow({status:false})}  title={edit ?  'Edit Brand' : 'Add Brand'} submitTitle={edit ? 'Update' : 'Add'} formName={'createBrand'}>
        <form className='w-full' onSubmit={(e)=>onSubmit(e,edit ? brand : {name:brand.name})} id="createBrand">
            <div>
                <label>Brand Name</label>
                <Input placeholder={'Enter Brand Name'} value={brand.name} setValue={(value)=>setBrand(brand=>({...brand,name:value}))} required={true}/>
            </div>
        </form>
    </Popup>
}