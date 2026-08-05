'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from '@/app/_helpers/useParams'
import { InfoToast } from '@/app/_helpers/toasters'
import { BOOKING_BOOKED, BOOKING_CANCELLED, BOOKING_FINISHED, BOOKING_ONGOING, LIMIT } from '@/app/_helpers/constants'
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

    async function onStart(e, startKms, pickupTime, startFuel, startImage) {

        try {
            e.preventDefault();
            let res = await axios.post(`/booking/start-ride/${id}`, { startKms, pickupTime, startFuel, startImage })
            console.log('data', res.data)
            if (res.data) await getRideInfo()
            setShowStart(false)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.log(error.response.data.error.message)
            InfoToast(error.response.data.error.message)
        }
    }

    async function onEnd(e, endKms, dropTime, endFuel, endImage, manualRefund, manualRefundAmount, remarks) {

        try {
            e.preventDefault();
            let res = await axios.post(`/booking/end-ride/${id}`, { endKms, dropTime, endFuel, endImage, manualRefund, manualRefundAmount, remarks })
            console.log('data', res.data)
            if (res.data) await getRideInfo()
            setShowEnd(false)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.log(error.response.data.error.message)
            InfoToast(error.response.data.error.message)
        }
    }

    async function onCancel(e, startKms, pickupTime) {

        try {
            e.preventDefault();
            let res = await axios.post(`/booking/cancel-ride/${id}`, { startKms, pickupTime })
            console.log('data', res.data)
            if (res.data) await getRideInfo()
            setShowStart(false)
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.log(error.response.data.error.message)
            InfoToast(error.response.data.error.message)
        }
    }

    const onDueSubmit = async (e, data) => {
        try {
            e.preventDefault()
            let res;
            setSubmitting(true)
            res = await axios.post(`/due`, { bookingId: rideInfo.id, userId: rideInfo.userId, ...data })
            InfoToast('Due Created')
            setSubmitting(false)
            setShowAddDue(false)
        } catch (error) {
            setSubmitting(false)
            // console.log(error.response.data.error[0])
            InfoToast(error.response.data.error[Object.keys(error.response.data.error)[0]])
        }
    }


    const info =
    [
        {
            label:'Overview',
            items:[
                {
                    label:'Selected Pickup Time',
                    value:`${getDateFormat(rideInfo.startTime)} ${getTimeFormat(rideInfo.startTime)}`
                },
                {
                    label:'Selected Drop Time',
                    value:`${getDateFormat(rideInfo.endTime)} ${getTimeFormat(rideInfo.endTime)}`
                },
                {
                    label:'Actual Pickup Time',
                    value:rideInfo.pickupTime ? `${getDateFormat(rideInfo.pickupTime)} ${getTimeFormat(rideInfo.pickupTime)}` : 'N/A'
                },
                {
                    label:'Actual Drop Time',
                    value:rideInfo.dropTime ? `${getDateFormat(rideInfo.dropTime)} ${getTimeFormat(rideInfo.dropTime)}` : 'N/A'
                },
                {
                    label:'Delivery Fee',
                    value:rideInfo.deliveryFee ? `Rs. ${rideInfo.deliveryFee}` : 'N/A'
                },
                {
                    label:'Pickup/Drop Location',
                    type:'link',
                    value:`https://www.google.com/maps?q=${rideInfo.lat},${rideInfo.lng}`
                },
                {
                    label:'Total Amount',
                    value:rideInfo.totalAmount ? `Rs. ${rideInfo.totalAmount}` : 'N/A'
                },
            ]
        },
        {
            label:'User Review',
            items:[
                {
                    label:'Cleanliness Rating',
                    type:'rating',
                    value:rideInfo.review?.cleanlinessRating
                },
                {
                    label:'Comfort Rating',
                    type:'rating',
                    value:rideInfo.review?.comfortRating
                },
                {
                    label:'Handling Rating',
                    type:'rating',
                    value:rideInfo.review?.handlingRating
                },
                {
                    label:'Host Rating',
                    type:'rating',
                    value:rideInfo.review?.hostRating
                },
                {
                    label:'Comment',
                    type:'text',
                    value:rideInfo.review?.comment
                }
            ]
        },
        {
            label:'Host Review',
            items:[
                {
                    label:'Rating',
                    type:'rating',
                    value:rideInfo.totalRating
                },
                {
                    label:'Comment',
                    type:'text',
                    value:rideInfo.comment
                }
            ]
        }
        
    ]



    return (
        !loading ? <div className='w-full h-full overflow-scroll flex-1'>

            <div className='bg-white rounded-md shadow-sm px-6 py-4'>

            <div className='w-full md:flex justify-between items-center bg-[#fff] border-b border-b-slate-200 py-4'>
                            <div>
                                <div className='flex items-center'>

                                    <div className={`w-[120px] h-[80px] rounded-[2px] overflow-hidden relative mr-4`}>
                                        <img className='h-full w-full' src={photoUrl(rideInfo.vehicle.images[0].url)} />
                                    </div>
                                    <div>
                                        <p className='text-base font-semibold text-black'>{`${rideInfo.vehicle.brand.name} ${rideInfo.vehicle.vehicleName}`}</p>
                                        <p className='text-xs text-[#959595] capitalize md:mt-1'>{rideInfo.vehicle.vehicleFuelType} &middot; {rideInfo.vehicle.vehicleSeats} Seater &middot; {rideInfo.vehicle.vehicleYear}</p>
                                        <p className='text-xs text-[#959595] md:mt-1 uppercase'>#{rideInfo.bookingId}</p>
                                        <div className='block md:hidden'>
                                            <p className={`text-[10px] inline-block font-medium rounded-full text-black uppercase status-text ${rideInfo.status === BOOKING_BOOKED ? 'bg-[#6ef7ae2e]' : rideInfo.status === BOOKING_CANCELLED ? 'bg-[#ff5f5f2e]' : rideInfo.status === BOOKING_ONGOING ? 'bg-[#f7ae6e2e]' : rideInfo.status === BOOKING_FINISHED ? 'bg-[#f7ae6e2e]' : 'bg-[#f7ae6e2e]'} px-2 py-1`}>{`${rideInfo.status}`}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='hidden md:block px-4'>
                                <p className='text-xs inline-block font-medium text-black uppercase status-text bg-[#1d6f4348] rounded-sm px-3 py-2'>{`${rideInfo.status}`}</p>
                            </div>
                        </div>


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
                                                <a href={item.value} className='text-sm text-[#000] underline' target='_blank' rel='noopener noreferrer'>Open Link</a>
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
                        {/* {rideInfo.bookingType === 'online' && rideInfo.isRefunded ? <RefundInformation rideInfo={rideInfo} /> : null} */}

                </div>

            {/* {showStart ? <StartPopup onClose={() => setShowStart(false)} onStart={onStart} /> : null}
            {showCancel ? <CancelPopup onClose={() => setShowCancel(false)} onStart={onCancel} /> : null}
            {showEnd ? <EndPopup onClose={() => setShowEnd(false)} onEnd={onEnd} /> : null}
            {showAddDue ? <AddRideDue submitting={submitting} onClose={() => setShowAddDue(false)} onSubmit={onDueSubmit} /> : null} */}
        </div> : <Loader />
    )
}





const StartPopup = ({onClose,onStart})=>
{
    const [startData,setStartData] = useState({startTime:'',startKms:'',startFuel:'',startImage:''})
    return <Popup title={'Start Ride'} onClose={onClose} formName={'startRide'} submitTitle={'Start Ride'} onSubmittingTitle='Starting Ride...'>
        <form name='startRide' id="startRide" onSubmit={(e)=>onStart(e,startData.startKms,startData.startTime,startData.startFuel,startData.startImage)}>
        <div className="grid grid-cols-2 gap-4">
        <div className='col-span-2'>
            <div>
              <SingleImageHolder name={'startImage'} label='Select Start Image' image={startData.startImage} setImage={(data)=>setStartData(prev=>({...prev,startImage:data}))}/>
            </div>
        </div>
            <div className='relative'>
                <label>Start Time</label>
                <DatePicker required={true} monthClassName='bg-white' wrapperClassName='react-individual-datepicker-wrapper bg-white text-xs w-full block' calendarClassName='bg-white' className=' border py-2 px-1.5 rounded-sm w-full z-10' popperClassName='react-individual-datepicker w-full' showTimeSelect={true} timeInputLabel='Time' timeIntervals={5} selected={startData.startTime} onChange={(date) => setStartData(prev=>({...prev,startTime:date}))} dateFormat="dd-MM-yyyy hh:mm aa"/>
            </div>
            <div>
                <label>Start Kms</label>
                <Input type='text' placeholder={'Enter Starting Kms'} value={startData.startKms} required={true} setValue={(value)=>setStartData(data=>({...data,startKms:value}))}/>
            </div>
            <div>
                <label>Start Fuel (In %)</label>
                <Input type='number' placeholder={'Enter Starting Fuel'} value={parseInt(startData.startFuel)} required={true} setValue={(value)=>setStartData(data=>({...data,startFuel:parseInt(value)}))}/>
            </div>
        </div>
        </form>
    </Popup>
}

const EndPopup = ({onClose,onEnd})=>
{
    const [endData,setEndData] = useState({endTime:'',endKms:'',endFuel:'',endImage:'',manualRefund:false,manualRefundAmount:0,remarks:''})
    return <Popup title={'End Ride'} onClose={onClose} formName={'endRide'} submitTitle={'End Ride'} onSubmittingTitle='Ending Ride...'>
    <form name='endRide' id="endRide" onSubmit={(e)=>onEnd(e,endData.endKms,endData.endTime,endData.endFuel,endData.endImage,endData.manualRefund,endData.manualRefundAmount,endData.remarks)}>
        <div className="grid grid-cols-2 gap-4">
        <div className='col-span-2'>
            <div>
              <SingleImageHolder name={'endImage'} label='Select End Image' image={endData.endImage} setImage={(data)=>setEndData(prev=>({...prev,endImage:data}))}/>
            </div>
        </div>
            <div>
                <label>End Time</label>
                <DatePicker required={true} monthClassName='bg-white' wrapperClassName='react-individual-datepicker-wrapper bg-white text-xs w-full block' calendarClassName='bg-white' className=' border py-2 px-1.5 rounded-sm w-full z-10' popperClassName='react-individual-datepicker w-full' showTimeSelect={true} timeInputLabel='Time' timeIntervals={5} selected={endData.endTime} onChange={(date) => setEndData(prev=>({...prev,endTime:date}))} dateFormat="dd-MM-yyyy hh:mm aa"/>
            </div>
            <div>
                <label>End Kms</label>
                <Input type='text' placeholder={'Enter Ending Kms'} value={endData.endKms} required={true} setValue={(value)=>setEndData(data=>({...data,endKms:value}))}/>
            </div>
            <div>
                <label>End Fuel</label>
                <Input type='number' placeholder={'Enter Ending Fuel'} value={endData.endFuel} required={true} setValue={(value)=>setEndData(data=>({...data,endFuel:value}))}/>
            </div>
            <div>
              <label>Remarks</label>
              <textarea className='resize-none text-input' placeholder={'Enter Remarks'} value={endData.remarks} required={false} onChange={(e)=>setEndData(data=>({...data,remarks:e.target.value}))}/>
            </div>
            <div>
                <label>Refund Type</label>
                <Select options={[{name:'Auto Refund',value:false},{name:'Manual Refund',value:true}]} placeholder={'Select Refund Type'} value={endData.manualRefund} required={true} setValue={(value)=>setEndData(data=>({...data,manualRefund:value}))}/>
            </div>
            { endData.manualRefund === true || endData.manualRefund === 'true' ? <div>
                <label>Refund Amount (In Rs.)</label>
                <Input type='number' placeholder={'Enter Refund Amount'} value={endData.manualRefundAmount} required={true} setValue={(value)=>setEndData(data=>({...data,manualRefundAmount:value}))}/>
            </div> : null}
        </div>
        </form>
    </Popup>
}

const CancelPopup = ({onClose,onCancel})=>
{
    const [startData,setStartData] = useState({startTime:'',startKms:''})
    return <Popup title={'Cancel Ride'} onClose={onClose} formName={'cancelRide'} submitTitle={'Cancel Ride'} onSubmittingTitle='Cancelling Ride...'>
        <form name='cancelRide' id="cancelRide" onSubmit={(e)=>onCancel(e,startData.startKms,startData.startTime)}>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label>Start Time</label>
                <Input type='datetime-local' placeholder={'Enter Starting Time'} value={startData.startTime} required={true} setValue={(value)=>setStartData(data=>({...data,startTime:value}))}/>
            </div>
            <div>
                <label>Start Kms</label>
                <Input type='text' placeholder={'Enter Starting Kms'} value={startData.startKms} required={true} setValue={(value)=>setStartData(data=>({...data,startKms:value}))}/>
            </div>
        </div>
        </form>
    </Popup>
}
