'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { InfoToast, apiErrorMessage } from '@cocarr/notifications'
import { BOOKING_BOOKED, BOOKING_FINISHED, BOOKING_ONGOING, LIMIT } from '@cocarr/shared-utils'
import { getDateFormat, getDateTimeFormat, getTimeFormat } from '@cocarr/shared-utils'
import { photoUrl } from '@cocarr/shared-utils'
import { Loader } from '@cocarr/ui'
import { Popup } from '@cocarr/ui'
import { Input } from '@cocarr/forms'
// import { ImageUploader } from '@cocarr/ui'
import { SingleImageHolder } from '@cocarr/ui'
import { Select } from '@cocarr/forms'
import DatePicker from 'react-datepicker'
import { coreApi } from '@cocarr/api-sdk'
// import { AddRideDue } from '@cocarr/ui'

export default function PaymentInfo() {

    const router = useRouter()
    const { id } = useParams()
    const [rideInfo, setRideInfo] = useState([])
    const [showCreate, setShowCreate] = useState({ status: false, edit: null })
    const [showStart, setShowStart] = useState(false)
    const [showCancel, setShowCancel] = useState(false)
    const [showEnd, setShowEnd] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showAddDue, setShowAddDue] = useState(false)
    const [submitting, setSubmitting] = useState(false)


    async function getRideInfo() {

        try {
            let res = await coreApi().get(`/booking/${id}?populate=true`)
            console.log('data', res.data)
            if (res.data) setRideInfo(res.data)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            InfoToast(apiErrorMessage(error))
        }
    }
    useEffect(() => {
        if (id) {
            getRideInfo();
        }
    }, [id])

    const info =
    [
        {
            label:'Payment Information',
            items:[
                {
                    label:'Payment Status',
                    type:'text',
                    value:rideInfo.transaction?.paymentStatus
                },
                {
                    label:'Payment Method',
                    type:'text',
                    value:rideInfo.transaction?.paymentMethod
                },
                {
                    label:'Payment Amount',
                    type:'text',
                    value:rideInfo.transaction?.amount ? `Rs. ${rideInfo.transaction?.amount/100}` : 'N/A'
                },
                {
                    label:'Payment Date',
                    type:'text',
                    value:rideInfo.transaction?.createdAt ? `${getDateFormat(rideInfo.transaction?.createdAt)} ${getTimeFormat(rideInfo.transaction?.createdAt)}` : 'N/A'
                },
                {
                    label:'Payment Status',
                    type:'text',
                    value:rideInfo.transaction?.status
                }
            ]
        }
        
    ]



    return (
        !loading ? <div className='w-full h-full overflow-scroll flex-1'>

            <div className='bg-white rounded-md shadow-sm px-6 py-4'>

                <div>
                {
                    info.map((item,index)=>
                    {
                        return <div key={index} className='border-b border-b-slate-200 py-6 '>
                            <p className='text-xs font-semibold text-[#959595] uppercase mb-4'>{item.label}</p>
                            <div className='grid grid-cols-4 gap-x-4 gap-y-8'>
                                {
                                    item.items.map((item,i)=>
                                    {
                                        if(item.type === 'images') {
                                            return <div key={i} className='text-left'>
                                                <p className='text-xs text-[#757575]'>{item.label}</p>
                                                <div className='flex flex-wrap gap-2'>
                                                    {item.value.map((image, idx) => (
                                                        <div key={idx} className='relative'>
                                                            <img 
                                                                src={photoUrl(image.url)}
                                                                alt={`Image ${idx}`}
                                                                className='w-[180px] h-[100px] object-cover rounded'
                                                            />
                                                            <span className='absolute top-2 right-2 bg-black/50 text-white px-2 py-1 text-xs rounded'>
                                                                {image.type}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        }
                                        else if(item.type === 'rating') {   
                                            return <div key={i} className='text-left'>
                                                <p className='text-xs text-[#757575]'>{item.label}</p>
                                                <div className='flex items-center gap-1'>
                                                    {[...Array(5)].map((_, index) => (
                                                        <span key={index} className={`text-xl ${index < item.value ? 'text-black' : 'text-gray-300'}`}>★</span>
                                                    ))}
                                                </div>
                                            </div>
                                        }
                                        else if(item.type === 'link') {
                                            return <div key={i} className='text-left'>
                                                <p className='text-xs text-[#757575]'>{item.label}</p>
                                                <a href={item.value} target='_blank' rel='noopener noreferrer'>Open Link</a>
                                            </div>
                                        }

                                        return <div key={i} className='text-left'>
                                            <p className='text-xs text-[#757575]'>{item.label}</p>
                                            <p className='text-sm font-medium text-[#454545] capitalize'>{item.value}</p>
                                        </div>
                                    })
                                }
                            </div>
                        </div>
                    })
                }
                </div>

                </div>
        </div> : <Loader />
    )
}


