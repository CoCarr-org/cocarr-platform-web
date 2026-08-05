import { useEffect, useState } from "react"
import Input from "../../../components/Input"
import Popup from "../../../components/Popup"
import Select from "../../../components/Select"
import authAxios from "../../../helpers/axios"
import AsyncSelect from 'react-select/async';

export default function AddRideDue({onClose,onSubmit,updateData,edit,submitting})
{
    const [manageData,setManageData] = useState({reason:'',amount:''})
    const formName = 'addDue';



    return <><Popup submitting={submitting} onSubmittingTitle={'Creating Due'} title={edit ? 'Update Due' : 'Create Due'} submitTitle={edit ? 'Update' : 'Create'} onClose={onClose} formName={formName}>
        <form onSubmit={(e)=>onSubmit(e,{...manageData})} id={formName} className='grid grid-cols-2 gap-x-3 gap-y-0 w-full'>
            <div>
                <label>Amount</label>
                <Input type='number' placeholder={'Enter Amount'} value={manageData.amount} required={true} setValue={(value)=>setManageData(data=>({...data,amount:value}))}/>
            </div>
            <div className="col-span-2">
                <label>Reason</label>
                <textarea className="resize-none text-input" placeholder={'Enter Due Reason'} value={manageData.reason} required={true} onChange={(e)=>setManageData(data=>({...data,reason:e.target.value}))}/>
            </div>
        </form>
    </Popup>
    </>
}