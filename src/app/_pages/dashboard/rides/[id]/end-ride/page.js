'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from '@/app/_helpers/useParams'
import { InfoToast } from '@/app/_helpers/toasters'
import { BOOKING_BOOKED, BOOKING_FINISHED, BOOKING_ONGOING, LIMIT } from '@/app/_helpers/constants'
import { getDateFormat, getDateTimeFormat, getTimeFormat } from '@/app/_helpers/utils'
import { photoUrl } from '@/app/_helpers/media'
import Loader from '@/app/_components/Loader'
import Popup from '@/app/_components/Popup'
import Input from '@/app/_components/Input'
// import ImageUploader from '@/app/_components/ImageUploader'
import SingleImageHolder from '@/app/_components/SingleImageHolder'
import Select from '@/app/_components/Select'
import DatePicker from 'react-datepicker'
import axios from 'axios'
import ImageSlider from '@/app/_components/ImageSlider'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
// import AddRideDue from '@/app/_components/AddRideDue'

export default function RideInfo() {

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
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)


    async function getRideInfo() {

        try {
            let res = await axios.get(`/booking/${id}?populate=true`)
            console.log('data', res.data)
            if (res.data) setRideInfo(res.data)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            InfoToast(error.response.data.error.message)
        }
    }
    useEffect(() => {
        if (id) {
            getRideInfo();
        }
    }, [id])


    const info = [
        {
            label:'Ride Information',
            items:[
                {
                    label:'End Odo Meter Reading',
                    value:rideInfo.endKms
                },
                {
                    label:'End Time',
                    value:`${getDateFormat(rideInfo.dropTime)} ${getTimeFormat(rideInfo.dropTime)}`
                }
                
            ]
        },
        // {
        //     label:'End Images',
        //     type:'images',
        //     items:[
        //         ...(rideInfo.images || []).filter(image => image.isEndImage).map((image, index) => ({
        //             url: image.url,
        //             type: image.type.split(/(?=[A-Z])/).join(' ').toUpperCase()
        //         }))
        //     ]
        // }
    ]

    const handleImageClick = (index) => {
        setLightboxIndex(index)
        setLightboxOpen(true)
    }

    const slides = rideInfo.images?.filter(image => image.isEndImage).map(image => ({
        src: image.url,
        alt: image.type
    }))

    return (
        !loading ? <div className='w-full h-full '>
            <div className='block gap-x-4 gap-y-8 w-full bg-[#fefefe] px-4 py-4'>
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
                <div className='w-full py-8'>
                    <p className='text-xs font-semibold text-[#959595] uppercase mb-4'>End Images</p>

                    <div className='flex flex-wrap gap-x-4 gap-y-4'>
                        {rideInfo.images.filter(image => image.isEndImage).map((image, index) => (
                            <div key={index} className='relative cursor-pointer' onClick={() => handleImageClick(index)}>
                                <span className="text-xs text-[#757575] font-medium inline-block mb-2">
                                    {image.type.split(/(?=[A-Z])/).join(' ').toUpperCase()}
                                </span>
                                <img src={photoUrl(image.url)} alt={`Image ${index}`} className='w-[180px] h-[100px] object-cover rounded hover:opacity-90 transition-opacity' />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={slides}
            />
            
        </div> : <Loader />
    )
}
