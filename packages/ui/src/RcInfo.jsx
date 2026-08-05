import { getDateFormat } from '@cocarr/shared-utils'
import axios from "axios"
import { useEffect, useState } from "react"
import SlidePopup from "./SlidePopup"

const RcInfo = ({show,setShow,id})=>
    {
    
        const [approvalInfo,setApprovalInfo] = useState([])
    
        const getApprovalInfo = async ()=>
        {
            try 
            {
                let res = await axios.get(`/admin/vehicle/${id}?rc=true`)
                setApprovalInfo(res.data)
            } catch (error) {
                console.log('error',error)
            }
        }
    
        useEffect(()=>
        {
            getApprovalInfo()
        },[])
    
        const info =[
            {
                label: 'Vehicle Name',
                value: approvalInfo?.vehicleName,
                secondaryValue: approvalInfo?.rcVerificationData?.model
            },
            {
                label: 'Vehicle Number',
                value: approvalInfo?.vehicleNumber,
                secondaryValue: approvalInfo?.rcVerificationData?.reg_no
            },
            {
                label: 'Vehicle Class',
                value: approvalInfo?.rcVerificationData?.class
            },
            {
                label: 'Vehicle Type',
                value: approvalInfo?.vehicleType,
                secondaryValue: approvalInfo?.rcVerificationData?.body_type
            },
            {
                label: 'Vehicle Brand',
                value: approvalInfo?.brand?.name,
                secondaryValue: approvalInfo?.rcVerificationData?.vehicle_manufacturer_name
            },
            {
                label: 'Vehicle Color',
                value: approvalInfo?.rcVerificationData?.vehicle_colour
            },
            {
                label: 'Vehicle Seats',
                value: approvalInfo?.vehicleSeats,
                secondaryValue: approvalInfo?.rcVerificationData?.vehicle_seat_capacity
            },
            {
                label: 'Vehicle Fuel Type',
                value: approvalInfo?.vehicleFuelType,
                secondaryValue: approvalInfo?.rcVerificationData?.type
            },
            {
                label: 'Emission Norms',
                value: approvalInfo?.rcVerificationData?.norms_type
            },
            {
                label: 'Vehicle Model Year',
                value: approvalInfo?.vehicleYear,
                secondaryValue: approvalInfo?.rcVerificationData?.vehicle_manufacturing_month_year
            },
            {
                label: 'Vehicle Chassis Number',
                value: approvalInfo?.rcVerificationData?.chassis
            },
            {
                label: 'Vehicle Engine Number',
                value: approvalInfo?.rcVerificationData?.engine
            },
            {
                label: 'Vehicle Owner Name',
                value: approvalInfo?.host?.name,
                secondaryValue: approvalInfo?.rcVerificationData?.owner
            },
            {
                label: 'Owner Father Name',
                value: approvalInfo?.rcVerificationData?.owner_father_name
            },
            {
                label: 'Vehicle Owner Contact',
                value: approvalInfo?.host?.contactNumber,
                secondaryValue: approvalInfo?.rcVerificationData?.mobile_number
            },
            {
                label: 'Present Address',
                value: approvalInfo?.rcVerificationData?.present_address
            },
            {
                label: 'Permanent Address',
                value: approvalInfo?.rcVerificationData?.permanent_address
            },
            {
                label: 'Registration Authority',
                value: approvalInfo?.rcVerificationData?.reg_authority
            },
            {
                label: 'Registration Date',
                value: getDateFormat(approvalInfo?.rcVerificationData?.reg_date)
            },
            {
                label: 'RC Expiry Date',
                value: getDateFormat(approvalInfo?.rcVerificationData?.rc_expiry_date)
            },
            {
                label: 'RC Status',
                value: approvalInfo?.rcVerificationData?.rc_status
            },
            {
                label: 'RC Financer',
                value: approvalInfo?.rcVerificationData?.rc_financer
            },
            {
                label: 'Vehicle Insurance Company',
                value: approvalInfo?.rcVerificationData?.vehicle_insurance_company_name
            },
            {
                label: 'Insurance Valid Upto',
                value: getDateFormat(approvalInfo?.rcVerificationData?.vehicle_insurance_upto)
            },
            {
                label: 'Insurance Policy Number',
                value: approvalInfo?.rcVerificationData?.vehicle_insurance_policy_number
            },
            {
                label: 'PUCC Number',
                value: approvalInfo?.rcVerificationData?.pucc_number
            },
            {
                label: 'PUCC Valid Upto',
                value: getDateFormat(approvalInfo?.rcVerificationData?.pucc_upto)
            },
            {
                label: 'Vehicle Category',
                value: approvalInfo?.rcVerificationData?.vehicle_category
            },
            {
                label: 'Engine Capacity (CC)',
                value: approvalInfo?.rcVerificationData?.vehicle_cubic_capacity
            },
            {
                label: 'Number of Cylinders',
                value: approvalInfo?.rcVerificationData?.vehicle_cylinders_no
            },
            {
                label: 'Gross Vehicle Weight',
                value: approvalInfo?.rcVerificationData?.gross_vehicle_weight
            },
            {
                label: 'Unladen Weight',
                value: approvalInfo?.rcVerificationData?.unladen_weight
            },
            {
                label: 'Wheelbase',
                value: approvalInfo?.rcVerificationData?.wheelbase
            },
            {
                label: 'Blacklist Status',
                value: approvalInfo?.rcVerificationData?.blacklist_status
            }
        ]
    
        return(
            <SlidePopup show={show} setShow={setShow} hideButton={true} onClose={()=>setShow(false)} title={'Vehicle RC Info'}>
    
                <div className='w-full h-full bg-white grid grid-cols-2 gap-x-4 gap-y-4'>
                {
                    info.map((item,i)=>
                        {
                            return <div key={i} className='text-left'>
                                <p className='text-xs text-[#757575]'>{item.label}</p>
                                <p className='text-sm font-medium text-[#454545] capitalize'>{item.value ? item.value : '-'}</p>
                                <p className='text-xs font-medium text-[#cb8801]'>{item.secondaryValue ? item.secondaryValue : '-'}</p>
                            </div>
                        })
                    }
                </div>
            </SlidePopup>
        )
    }
    
    export default RcInfo