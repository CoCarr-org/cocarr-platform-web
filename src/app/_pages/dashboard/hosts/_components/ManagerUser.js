'use client'
import { useEffect, useState } from "react"
import Input from "@/app/_components/Input"
import Popup from "@/app/_components/Popup"
import Select from "@/app/_components/Select"
import { authAxios } from "@/app/_helpers/axios"

export default function ManageUser({onClose,onSubmit,updateData,edit})
{
    const [manageData,setManageData] = useState({name:'',email:'',contactNumber:''})
    const formName = 'manageUser';


    return <><Popup title={edit ? 'Update User' : 'Create User'} submitTitle={edit ? 'Update' : 'Create'} onClose={onClose} formName={formName}>
        <form onSubmit={(e)=>onSubmit(e,{...manageData})} id={formName} className='grid grid-cols-2 gap-x-3 gap-y-0 w-full'>
            <div>
                <label>User Name</label>
                <Input type='text' placeholder={'Enter User Name'} value={manageData.name} required={true} setValue={(value)=>setManageData(data=>({...data,name:value}))}/>
            </div>
            <div>
                <label>User Email*</label>
                <Input type='text' placeholder={'Enter User Email'} value={manageData.email} required={true} setValue={(value)=>setManageData(data=>({...data,email:value}))}/>
            </div>
            <div>
                <label>User Mobile*</label>
                <Input type='number' placeholder={'Enter User Mobile'} value={manageData.mobile} required={true} setValue={(value)=>setManageData(data=>({...data,mobile:value}))}/>
            </div>
        </form>
    </Popup>
    {/* {showCrop ? <CropPopup image={image} setActive={setShowCrop} setImage={setCroppedImage}/>: null} */}
    </>
}