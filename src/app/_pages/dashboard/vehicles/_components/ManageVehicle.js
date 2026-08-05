'use client'

import { useEffect, useState } from "react"
import Input from "@/app/_components/Input"
import Select from "@/app/_components/Select"
import  authAxios  from "@/app/_helpers/axios"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import SingleImageHolder from "@/app/_components/SingleImageHolder"
import { FEATURES } from "@/app/_helpers/constants"

export default function ManageVehicle({onClose,onSubmit,updateData,edit})
{
    const [manageData,setManageData] = useState({vehicleName:'',vehicleYear:'',vehicleSeats:4,vehicleBrand:'',vehicleType:1,deposit:'',ownerType:'',ownerId:'',city:'',vehicleFuelType:'',plan:{perHourFee:'',kmAlloted:'',extraKmFee:'',description:''},vehicleNumber:'',features:[]})
    const [cities,setCities] = useState([])
    const [salesRep,setSalesRep] = useState([])
    const [showCrop,setShowCrop] = useState(false)
    const formName = 'manageVehicle';
    const [images,setImages] = useState([])
    const [image,setImage] = useState(null)
    const [croppedImage,setCroppedImage] = useState()
    const [brands,setBrands] = useState([])
    const [vendors,setVendors] = useState([])
    const [types,setTypes] = useState([{id:'hatchback',value:'Hatchback'},{id:'sedan',value:'Sedan'},{id:'csuv',value:'Compact SUV'},{id:'suv',value:'SUV'}])
    const [pickups,setPickups] = useState([])

    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: manageData.description,
        onUpdate: ({ editor }) => {
            setManageData(prev => ({...prev, description: editor.getHTML()}))
        }
    })

    useEffect(()=>
    {
        async function getCities(){
            let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/city`)
            setCities(res.data)
        }
        async function getBrands(){
            let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/brand`)
            setBrands(res.data)
        }
        async function getVendors(){
            let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/vendor`)
            setVendors(res.data)
        }
        async function getPickups(){
            let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/pickup-point`)
            setPickups(res.data.rows)
        }
        getCities()
        getBrands()
        getVendors()
        getPickups()
    },[])

    // useEffect(()=>
    // {
    //     async function getRoutes(){
    //         let res = await authAxios.get(`${process.env.REACT_APP_BASE_URL}/salesrepresentative?repCity=${manageData.cityId}`)
    //         setSalesRep(res.data.data)
    //     }
    //     if(manageData.cityId !== '') getRoutes()
    // },[manageData.cityId])

    const handleCheckboxChange = (value) => {
        setManageData((prevState) => {
          const features = prevState.features.includes(value)
            ? prevState.features.filter((item) => item !== value)
            : [...prevState.features, value];
    
          return { ...prevState, features };
        });
      };
      

    const setCover = (index) => {
        const updatedImages = images.map((item, i) => ({
          ...item,
          isCover: i === index
        }));
        setImages(updatedImages);
      };

    return <>
        <div className='bg-[rgba(255,255,255,0.99)] backdrop-blur-sm bg-opacity-70 fixed z-[999] w-[100%] h-full left-0 top-0 flex justify-center items-center overflow-scroll py-2'>
    <div className=' mx-auto w-full h-full  overflow-hidden flex flex-col'>
        <div className='flex px-8 py-4 justify-between items-center border-b-2 border-gray-100 bg-[#fff]'>
            <div className='flex justify-between max-w-2xl w-full mx-auto pr-10'>
                <div>
                    {/* <p className='text-xs font-medium text-[#757575] tracking-[-.15px] capitalize'>Create Vehicle</p> */}
                    <h3 className='text-[14px] font-semibold tracking-[-.15px] capitalize'>Create Vehicle</h3>
                </div>
                {/* <div>
                    <p className='text-xs font-medium text-[#757575] tracking-[-.15px] capitalize'>Step:2</p>
                    <h3 className='text-[14px] font-semibold tracking-[-.15px] capitalize'>Upload Images</h3>
                </div>
                <div>
                    <p className='text-xs font-medium text-[#757575] tracking-[-.15px] capitalize'>Step:3</p>
                    <h3 className='text-[14px] font-semibold tracking-[-.15px] capitalize'>Features</h3>
                </div> */}
            </div>
        </div>
        <div className='flex flex-1 items-start px-8 py-6 w-full overflow-scroll'>
        <form onSubmit={(e)=>onSubmit(e,{...manageData},images)} id={formName} className='max-w-2xl mx-auto  w-full'>
            <div className="border-b border-b-slate-200 grid grid-cols-6 gap-x-3 gap-y-0 py-6">
            <div className="col-span-2">
                <label>Vehicle Name*</label>
                <Input type='text' placeholder={'Enter Vehicle Name'} value={manageData.vehicleName} required={true} setValue={(value)=>setManageData(data=>({...data,vehicleName:value}))}/>
            </div>
            <div className="col-span-2">
                <label>City*</label>
                <Select placeholder={'Select City'} customLabel={'name'} customValue={'id'} options={cities}  value={manageData.city} setValue={(value)=>setManageData(data=>({...data,city:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Fuel Type*</label>
                <Select placeholder={'Select Fuel Type'} customLabel={'name'} customValue={'id'} options={[{name:'Petrol',value:0},{name:'Diesel',value:1},{name:'Electric',value:2}]}  value={manageData.vehicleFuelType} setValue={(value)=>setManageData(data=>({...data,vehicleFuelType:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle Model Year*</label>
                <Input number={true} type='text' placeholder={'Enter Model Year'} value={manageData.vehicleYear} required={true} setValue={(value)=>setManageData(data=>({...data,vehicleYear:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle CC*</label>
                <Input number={true} type='text' placeholder={'Enter CC'} value={manageData.vehicleCc} required={true} setValue={(value)=>setManageData(data=>({...data,vehicleCc:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle Brand*</label>
                <Select placeholder={'Select Brand'} customLabel={'name'} customValue={'id'} options={brands}  value={manageData.vehicleBrand} setValue={(value)=>setManageData(data=>({...data,vehicleBrand:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle Type*</label>
                <Select placeholder={'Select Vehicle Type'} customLabel={'value'} customValue={'id'} options={types}  value={manageData.vehicleType} setValue={(value)=>setManageData(data=>({...data,vehicleType:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle Seats*</label>
                <Select placeholder={'Select Vehicle Seats'} options={[{name:'4',value:4},{name:'5',value:5},{name:'6',value:6},{name:'7',value:7},{name:'8',value:8},{name:'9',value:9},{name:'10',value:10}]}  value={manageData.vehicleSeats} setValue={(value)=>setManageData(data=>({...data,vehicleSeats:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Owner Type*</label>
                <Select placeholder={'Select Owner Type'} options={[{name:'Owner',value:0},{name:'Vendor',value:1}]}  value={manageData.ownerType} setValue={(value)=>setManageData(data=>({...data,ownerType:value}))}/>
            </div>
            {manageData.ownerType === 1 || manageData.ownerType === '1' ? <div className="col-span-2">
                <label>Vendor*</label>
                <Select viewMode={manageData.ownerType === 1 ? true : false} customLabel={'name'} customValue={'id'} placeholder={'Select Vendor'} options={vendors}  value={manageData.ownerId} setValue={(value)=>setManageData(data=>({...data,ownerId:value}))}/>
            </div> : <div className="col-span-2"></div>}

            {/* <div className="col-span-3">
                <label>Status*</label>
                <Select placeholder={'Select Status'} options={[{name:'Active',value:true},{name:'Inactive',value:false}]}  value={manageData.active} setValue={(value)=>setManageData(data=>({...data,active:value}))}/>
            </div>
            <div className="col-span-3">
            {manageData.active === false || manageData.active === 'false' ? 
            <>
                <label>Coming Soon*</label>
                <Select  placeholder={'Select Coming Soon Status'} options={[{name:'Yes',value:true},{name:'No',value:false}]}  value={manageData.availableSoon} setValue={(value)=>setManageData(data=>({...data,availableSoon:value}))}/>
            </>
             : null}
             </div> */}

            <div className="col-span-2">
                <label>Deposit Amount</label>
                <Input number={true} type='number' placeholder={'Deposit Amount'} value={manageData.deposit} required={true} setValue={(value)=>setManageData(data=>({...data,deposit:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle Number</label>
                <Input number={false} type='text' placeholder={'Eg., TG-10BS-1213'} value={manageData.vehicleNumber} required={true} setValue={(value)=>setManageData(data=>({...data,vehicleNumber:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle Pickup Point</label>
                <Select placeholder={'Select Pickup Point'} customLabel={'name'} customValue={'id'} options={pickups}  value={manageData.pickupId} setValue={(value)=>setManageData(data=>({...data,pickupId:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Vehicle Transmission</label>
                <Select placeholder={'Select Transmission Type'} options={[{name:'Manual',value:'manual'},{name:'Automatic',value:'automatic'}]}  value={manageData.vehicleTransmission} setValue={(value)=>setManageData(data=>({...data,vehicleTransmission:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Status*</label>
                <Select placeholder={'Select Status'} options={[{name:'Active',value:true},{name:'Inactive',value:false}]}  value={manageData.active} setValue={(value)=>setManageData(data=>({...data,active:value}))}/>
            </div>
            </div>

                <p className="text-sm tracking-tight font-medium mt-4">Features</p>
            <div className="grid grid-cols-6 gap-x-3 gap-y-0 w-full py-6 border-b border-b-slate-200">
                <div className="col-span-2">
                    {
                        FEATURES.map((item,index)=>
                        {
                            return <div className="flex" key={index}><input key={index}
                            type="checkbox" className="mr-1"
                            id={item.value}
                            checked={manageData.features.includes(item.value)}
                            onChange={() => handleCheckboxChange(item.value)}
                          />
                          <label htmlFor={item.value} className="ml-2 text-black text-sm">{item.label}</label>
                          </div>
                        })
                    }
                </div>
            </div>

            <div className="grid grid-cols-6 gap-x-3 gap-y-0 w-full py-6 border-b border-b-slate-200">
                <div className="col-span-2">
                    <label>Per Hour Fee *</label>
                    <Input number={true} type='text' placeholder={'Per Hour Fee'} value={manageData.plan.perHourFee} required={true} setValue={(value)=>setManageData(data=>({...data,plan:{...data.plan,perHourFee:value}}))}/>
                </div>
                <div className="col-span-2">
                    <label>Alloted Kms *</label>
                    <Input number={true} type='text' placeholder={'Alloted Km'} value={manageData.plan.kmAlloted} required={true} setValue={(value)=>setManageData(data=>({...data,plan:{...data.plan,kmAlloted:value}}))}/>
                </div>
                <div className="col-span-2">
                    <label>Extra Km Fee *</label>
                    <Input number={true} type='text' placeholder={'Extra Km Fee'} value={manageData.plan.extraKmFee} required={true} setValue={(value)=>setManageData(data=>({...data,plan:{...data.plan,extraKmFee:value}}))}/>
                </div>
            </div>

            <div className="w-full py-6 border-b border-b-slate-200">
                <label>Vehicle Images</label>
                <div className="flex flex-wrap gap-3">

                {
                    images.map((img,index)=>
                        {
                            return <div className="relative" key={index}>
                                {img.isCover ? <p className="absolute top-[4px] left-[4px] bg-[#151515] px-1.5 py-1 rounded-md text-xs font-medium text-white">Cover</p> : null}
                                {!img.isCover ? <p onClick={()=>setCover(index)} className="absolute top-[4px] cursor-pointer left-[4px] bg-[#151515] hover:bg-[#454545] px-1.5 py-1 rounded-md text-xs font-medium text-white">Set As Cover</p> : null}
                                <img src={img.src} key={index} className="h-[100px] w-[180px] rounded-md"/>
                                </div>
                        })
                    }
                    <div>
                    <SingleImageHolder setImage={(imageUrl)=>setImages(data=>([...data,{src:imageUrl,isCover:images.length === 0 ? true : false}]))}/>
                    </div>
                </div>
            </div>

            <div className="py-6 border-b border-b-slate-200">
                <label className="mb-2">Vehicle Description</label>
                <EditorContent editor={editor} className="prose max-w-none border rounded-md p-4" />
            </div>
        </form>
        </div>
        <div className='flex justify-end mt-4 px-8 py-4  bg-[#fafafa] border-t-2 border-gray-50'>
            <button type='button' className='btn-md-disabled' onClick={()=>onClose(false)}>Cancel</button>
            <button form={formName} type='submit' className='ml-4 btn-md'>Continue</button>
        </div>
    </div>
</div>
    {/* {showStart ? <StartPopup onClose={()=>setShowStart(false)}/>: null} */}
    </>
}