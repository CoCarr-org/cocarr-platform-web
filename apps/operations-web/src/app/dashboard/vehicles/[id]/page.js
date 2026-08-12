'use client'
import { ImageSlider } from '@cocarr/ui'
import { NoticeBar } from '@cocarr/ui'
import { RcInfo } from '@cocarr/ui'
import { SlidePopup } from '@cocarr/ui'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { getDateFormat } from '@cocarr/shared-utils'
import { Splide, SplideSlide } from '@splidejs/react-splide'
import { coreApi } from '@cocarr/api-sdk'
import { useParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { BiRightArrow, BiSolidRightArrow } from 'react-icons/bi'
import { FiArrowRight } from 'react-icons/fi'

export default function VehicleInfo() {

    const {id} = useParams()
    // Verification sits FIRST after the overview: for a pending vehicle it is
    // the only thing anyone opens this page to do, and burying it behind Rides
    // and Reviews (both empty for a car that has never been booked) hides the
    // one action the queue sends you here for.
    const [menu,setMenu] = useState([{url:`/vehicles/${id}/`,label:`Vehicle Information`},{url:`/vehicles/${id}/review`,label:`Verification`},{url:`/vehicles/${id}/rides`,label:`Rides`},{url:`/vehicles/${id}/reviews`,label:`Reviews`}])
    const [showManage,setShowManage] = useState({type:null,status:false,edit:null})
    const [showApproval,setShowApproval] = useState(false)
    const [vehicleInfo,setVehicleInfo] = useState([])
    const [submitting,setSubmitting] = useState(false)
    const [showRcInfo,setShowRcInfo] = useState(false)

    async function getVehicleInfo(){

        try 
        {
            let res = await coreApi().get(`/admin/vehicle/${id}?`)
            setVehicleInfo(res.data)
        } catch (error) {
            console.log('error',error)
            ErrorToast('Error getting products')
        }
    }

    useEffect(()=>
    {
        getVehicleInfo();
    },[])


    const onApprove = async (e)=>
    {
        e.preventDefault()
        try
        {
            setSubmitting(true)
            let res = await coreApi().post(`/admin/vehicle/${id}/approve`)
            setShowApproval(false)
            InfoToast('Vehicle approved successfully')
            getVehicleInfo()
        } catch (error) {
            console.log('error',error)
            ErrorToast('Error approving vehicle')
        }
        finally
        {
            setSubmitting(false)
        }
    }

    const info = [
        {
            label:'Vehicle Info',
            items:[
                {
                    label:'Vehicle Name',
                    value:vehicleInfo?.vehicleName
                },
                {
                    label:'Vehicle Number',
                    value:vehicleInfo?.vehicleNumber
                },
                {
                    label:'Vehicle Type',
                    value:vehicleInfo?.vehicleType
                },
                {
                    label:'Vehicle Brand',
                    value:vehicleInfo?.brand?.name
                },
                {
                    label:'Vehicle Color',
                    value:vehicleInfo?.color
                },
                {
                    label:'Vehicle Seats',
                    value:vehicleInfo?.vehicleSeats
                },
                {
                    label:'Vehicle Fuel Type',
                    value:vehicleInfo?.vehicleFuelType
                },
                {
                    label:'Vehicle Transmission',
                    value:vehicleInfo?.vehicleTransmission
                },
                {
                    label:'Vehicle Rating',
                    value:vehicleInfo?.rating
                },
                {
                    label:'No of Reviews',
                    value:vehicleInfo?.reviews
                },
                {
                    label:'Vehicle Status',
                    value:vehicleInfo?.active ? 'Active' : 'Inactive'
                },
                {
                    label:'RC Info',
                    type:'popup',
                    onClick:()=>setShowRcInfo(true)
                },
                {
                    label:'RC Status',
                    value:vehicleInfo?.rcVerified ? 'Verified' : 'Not Verified'
                },
                {
                    label:'Manual Verification',
                    value:vehicleInfo?.isAdminApproved ? 'Approved' : 'Not Approved'
                }
                
            ]
        },
        {
            label:'Host Info',
            items:[
                {
                    label:'Host Name',
                    value:vehicleInfo?.host?.name    
                },
                {
                    label:'Host Email',
                    value:vehicleInfo?.host?.email
                },
                {
                    label:'Host Phone Number',
                    value:vehicleInfo?.host?.contactNumber
                }
            ]
        }
    ]


  return (
        <div className='px-6 max-w-7xl mx-auto block  gap-x-6 bg-white w-full'>

            {
                !vehicleInfo.isAdminApproved ?
                <NoticeBar message='Vehicle is Pending for Approval' onClick={()=>setShowApproval(true)} /> : null
            }
            <div>
                {
                    info.map((item,index)=>
                    {
                        return <div key={index} className='border-b border-b-slate-200 py-6 '>
                            <p className='text-xs font-semibold text-[#959595] uppercase mb-4'>{item.label}</p>
                            <div className='grid grid-cols-6 gap-x-4 gap-y-8'>
                                {
                                    item.items.map((item,i)=>
                                    {
                                        return <div key={i} className='text-left'>
                                            <p className='text-xs text-[#757575]'>{item.label}</p>
                                            {
                                                item.type === 'popup' ? (
                                                    <p onClick={item.onClick} className='text-xs font-medium text-[#1a4cf0] capitalize cursor-pointer underline hover:text-[#151515]'>
                                                        View Info
                                                    </p>
                                                ) : (
                                                    <p className='text-sm font-medium text-[#454545] capitalize'>{item.value}</p>
                                                )
                                            }
                                        </div>
                                    })
                                }
                            </div>
                        </div>
                    })
                }

                <div className='border-b border-b-slate-200 py-6 '>
                    <p className='text-xs font-semibold text-[#959595] uppercase mb-4'>Vehicle Images</p>
                    <div className='w-full'>
                       <ImageSlider images={vehicleInfo?.images}/>
                    </div>
                </div>
        </div>
        {showApproval && <ApprovalModal onApprove={onApprove} id={id} show={showApproval} setShow={setShowApproval} submitting={submitting}/>}
        {showRcInfo && <RcInfo show={showRcInfo} setShow={setShowRcInfo} id={id}/>}
        </div>
  )
}


const ApprovalModal = ({show,setShow,id,onApprove,submitting})=>
{

    const [approvalInfo,setApprovalInfo] = useState([])

    const getApprovalInfo = async ()=>
    {
        try 
        {
            let res = await coreApi().get(`/admin/vehicle/${id}?rc=true`)
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
            label:'Vehicle Name',
            value:approvalInfo?.vehicleName,
            secondaryValue:approvalInfo?.rcVerificationData?.model
        },
        {
            label:'Vehicle Number',
            value:approvalInfo?.vehicleNumber,
            secondaryValue:approvalInfo?.rcVerificationData?.reg_no
        },
        {
            label:'Vehicle Type',
            value:approvalInfo?.vehicleType,
            secondaryValue:approvalInfo?.rcVerificationData?.body_type
        },
        {
            label:'Vehicle Brand',
            value:approvalInfo?.brand?.name,
            secondaryValue:approvalInfo?.rcVerificationData?.vehicle_manufacturer_name
        },
        {
            label:'Vehicle Color',
            value:approvalInfo?.rcVerificationData?.vehicle_colour,
        },
        {
            label:'Vehicle Seats',
            value:approvalInfo?.vehicleSeats,
            secondaryValue:approvalInfo?.rcVerificationData?.vehicle_seat_capacity
        },
        {
            label:'Vehicle Fuel Type',
            value:approvalInfo?.vehicleFuelType,
            secondaryValue:approvalInfo?.rcVerificationData?.type
        },
        {
            label:'Vehicle Model Year',
            value:approvalInfo?.vehicleYear,
            secondaryValue:approvalInfo?.rcVerificationData?.vehicle_manufacturing_month_year
        },
        {
            label:'Vehicle Transmission',
            value:approvalInfo?.vehicleTransmission,
            secondaryValue:approvalInfo?.rcVerificationData?.transmission
        },
        {
            label:'Vehicle Chassis Number',
            value:approvalInfo?.rcVerificationData?.chassis,
        },
        {
            label:'Vehicle Engine Number',
            value:approvalInfo?.rcVerificationData?.engine,
        },
        {
            label:'Vehicle Fuel Type',
            value:approvalInfo?.vehicleFuelType,
            secondaryValue:approvalInfo?.rcVerificationData?.type
        }, 
        {
            label:'Vehicle Owner Name',
            value:approvalInfo?.host?.name,
            secondaryValue:approvalInfo?.rcVerificationData?.owner,
        }, 
        {
            label:'Vehicle Owner Contact Number',
            value:approvalInfo?.host?.contactNumber,
        }, 
        {
            label:'Present Address',
            value:approvalInfo?.rcVerificationData?.present_address,
        }, 
        {
            label:'Permanent Address',
            value:approvalInfo?.rcVerificationData?.permanent_address,
        }, 
        {
            label:'Vehicle Insurance Upto',
            value:getDateFormat(approvalInfo?.rcVerificationData?.vehicle_insurance_upto)
        },
        {
            label:'Vehicle Insurance Company',
            value:approvalInfo?.rcVerificationData?.vehicle_insurance_company_name,
        },
        {
            label:'Vehicle Insurance Policy Number',
            value:approvalInfo?.rcVerificationData?.vehicle_insurance_policy_number,
        },
        {
            label:'Vehicl PUCC Number',
            value:approvalInfo?.rcVerificationData?.pucc_number,
        },
        {
            label:'Vehicle PUCC Expiry Date',
            value:getDateFormat(approvalInfo?.rcVerificationData?.pucc_upto),
        },
        {
            
        }
    ]

    return(
        <SlidePopup show={show} setShow={setShow} onClose={()=>setShow(false)} formName={'approvalForm'} title={'Vehicle Approval'} submitTitle={'Approve Vehicle'} submitting={submitting}>
            <form onSubmit={onApprove} name='approvalForm' id="approvalForm">

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
                </form>
        </SlidePopup>
    )
}
