import { useEffect, useState } from "react"
import { Input } from '@cocarr/forms'
import { Popup } from '@cocarr/ui'
import { Select } from '@cocarr/forms'
import axios from "axios"

export default function ManageOffer({onClose,onSubmit,updateData,edit})
{
    const [manageData,setManageData] = useState({name:'',email:'',mobile:'',city:'',minDiscountAmount:0,maxDiscountAmount:0,discountType:'percent',validFrom:'',validTo:'',maxUses:0,isPlatformOffer:false,isActive:true,discountValue:0,minHours:0,maxHours:0,offerType:'company',offerValue:0})
    const [cities,setCities] = useState([])
    const formName = 'editOffer';

       useEffect(()=>
    {
        async function getCities(){
            let res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/city`)
            setCities(res.data)
        }
        getCities()
    },[])
    




    return <><Popup title={edit ? 'Update Offer' : 'Create Offer'} submitTitle={edit ? 'Update' : 'Create'} onClose={onClose} formName={formName}>
        <form onSubmit={(e)=>onSubmit(e,{...manageData})} id={formName} className='grid grid-cols-2 gap-x-3 gap-y-0 w-full'>
            <div>
                <label>Offer Code*</label>
                <Input type='text' placeholder={'Enter Offer Code'} value={manageData.code} required={true} setValue={(value)=>setManageData(data=>({...data,code:value}))}/>
            </div>
            <div>
                <label>Description</label>
                <Input type='text' placeholder={'Enter Description'} value={manageData.description} required={false} setValue={(value)=>setManageData(data=>({...data,description:value}))}/>
            </div>
            <div>
                <label>Discount Type*</label>
                <Select options={[{label:'Percent',value:'percent'},{label:'Flat',value:'flat'}]} customLabel={'label'} customValue={'value'} placeholder={'Select Discount Type'} value={manageData.discountType} setValue={(value)=>setManageData(data=>({...data,discountType:value}))} required={true}/>
            </div>
            <div>
                <label>Discount Value*</label>
                <Input type='number' placeholder={'Enter Discount Value'} value={manageData.discountValue} required={true} setValue={(value)=>setManageData(data=>({...data,discountValue:value}))}/>
            </div>
            <div>
                <label>Valid From*</label>
                <Input type='datetime-local' placeholder={'Select Valid From'} value={manageData.validFrom} required={true} setValue={(value)=>setManageData(data=>({...data,validFrom:value}))}/>
            </div>
            <div>
                <label>Valid To*</label>
                <Input type='datetime-local' placeholder={'Select Valid To'} value={manageData.validTo} required={true} setValue={(value)=>setManageData(data=>({...data,validTo:value}))}/>
            </div>
            <div>
                <label>Max Uses</label>
                <Input type='number' placeholder={'Enter Max Uses'} value={manageData.maxUses} required={false} setValue={(value)=>setManageData(data=>({...data,maxUses:value}))}/>
            </div>
            <div>
                <label>Min Discount Amount</label>
                <Input type='number' placeholder={'Enter Max Discount Amount'} value={manageData.minDiscountAmount} required={false} setValue={(value)=>setManageData(data=>({...data,minDiscountAmount:value}))}/>
            </div>
            <div>
                <label>Max Discount Amount</label>
                <Input type='number' min={manageData.minDiscountAmount} placeholder={'Enter Max Discount Amount'} value={manageData.maxDiscountAmount} required={false} setValue={(value)=>setManageData(data=>({...data,maxDiscountAmount:value}))}/>
            </div>
            <div>
                <label>Min Hours</label>
                <Input type='number' placeholder={'Enter Min Hours'} value={manageData.minHours} required={false} setValue={(value)=>setManageData(data=>({...data,minHours:value}))}/>
            </div>
            <div>
                <label>Max Hours</label>
                <Input type='number' min={manageData.minHours} placeholder={'Enter Max Hours'} value={manageData.maxHours} required={false} setValue={(value)=>setManageData(data=>({...data,maxHours:value}))}/>
            </div>
            <div>
                <label>Offer Type</label>
                <Select options={[{label:'Company',value:'company'},{label:'Host',value:'host'},{label:'Influencer',value:'influencer'}]} customLabel={'label'} customValue={'value'} placeholder={'Select Offer Type'} value={manageData.offerType} setValue={(value)=>setManageData(data=>({...data,offerType:value}))}/>
            </div>
            <div>
                <label>Active</label>
                <Select options={[{label:'Yes',value:true},{label:'No',value:false}]} customLabel={'label'} customValue={'value'} placeholder={'Select Status'} value={manageData.isActive} setValue={(value)=>setManageData(data=>({...data,isActive:value}))}/>
            </div>
        </form>
    </Popup>
    {/* {showCrop ? <CropPopup image={image} setActive={setShowCrop} setImage={setCroppedImage}/>: null} */}
    </>
}