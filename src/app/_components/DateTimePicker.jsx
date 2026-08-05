import React, { useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
// import 'rc-slider/assets/index.css';
// import ReactSlider from 'react-slider';

const DateTimePicker = ({value,setStartDate,setEndDate,startDate,endDate,setShow,onSubmit,error=false}) => {
    
    const datePickerRef = useRef(null);
    const [minDropTime,setMinDropTime] = useState()
    const [minPickupTime,setMinPickupTime] = useState(startDate.getHours()+2)
    const [minDate,setMinDate] = useState(new Date())
    const [localStartDate,setLocalStartDate] = useState(startDate)
    const [localEndDate,setLocalEndDate] = useState(endDate)
    const [localPickupTime,setLocalPickupTime] = useState(startDate.getHours())
    const [localDropTime,setLocalDropTime] = useState(endDate.getHours())
    const [maxDate,setMaxDate] = useState(new Date(minDate.getTime() + 60 * 24 * 60 * 60 * 1000))

    const pickerRef = useRef(null);

  // Function to check if the click is outside the element
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShow(false);
      }
    };

    useEffect(() => {
      // Add event listener to document when component mounts
      document.addEventListener("mousedown", handleClickOutside);

      // Cleanup event listener on component unmount
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

  useEffect(() => {
    if (datePickerRef.current) {
      datePickerRef.current.setOpen(true);
    } else datePickerRef.current.setOpen(false);
  }, []);


const onChange = (dates) => {
  console.log('dates',dates)
  const [start, end] = dates;
      setStartDate(start);
      if(end) setEndDate(end); 
      setLocalStartDate(start);
  setLocalEndDate(end);
};


const onTimeChange = (value,type)=>
{
    if(type==='pickup')
    {
        const pickupTime = new Date(startDate);
        pickupTime.setHours(value);
        if(pickupTime < minPickupTime) 
        {
          setStartDate(minPickupTime)
        }
        else 
        {
          setStartDate(pickupTime)
        }
    }
    else
    {
        const dropTime = new Date(endDate);
        dropTime.setHours(value);
        setEndDate(dropTime)
    }
}



const marks = [];
for (let hour = 0; hour < 24; hour += 1) {
  marks.push(hour+1)
}

const getStatus = (value) => {
    if (value >= 0 && value <= 23) {
      const hour = value % 12 || 12;
      const period = value < 12 ? 'AM' : 'PM'; 
      return `${hour}:00 ${period}`;
    } else {
      return 'Invalid';
    }
  };

  const handle = props => {
    const { value, dragging, index, ...restProps } = props;
    console.log('props',props)
    return (
      <div
        prefixCls="rc-slider-tooltip"
        overlay={`${value} %`}
        visible={dragging}
        placement="top"
        key={index}
      >
        <div {...props} className='z-10 top-[-10px] bg-black inline shadow-sm py-1 w-[68px] text-center text-[10px] text-white rounded-full outline-none cursor-pointer'>{getStatus(value)} </div>
      </div>
    );
  };

  return (
    <>
      <div ref={pickerRef} className='hidden md:block md:absolute bottom-[0] left-0 min-h-[240px] bg-[rgba(255,255,255,1)]    rounded-md w-full overflow-hidden rounded-t-md z-50 backdrop-blur-xl border border-gray-200'>
    <div style={{ position: 'relative' }} className='h-full w-full' >
        {/* <div className='backdrop-blur-3xl bg-[rgba(180,180,180,0.45)] absolute w-full h-full -z-10'></div> */}
        <div className='absolute w-[100%] h-[100%] blur-lg'></div>
      <DatePicker
      popperClassName='w-full shadow-none relative w-full z-10 pb-0' dateFormat="d/M/yyyy HH:mm:ss"
        selected={value}
        startDate={localStartDate}
        minDate={minDate}
        maxDate={maxDate}
        endDate={localEndDate}
        showPopperArrow={false}
        ref={datePickerRef}
        showTimeInput={false}
        // onClickOutside={()=>setShow(false)}
        open={true}
        customInput={<div></div>}
        monthsShown={2}
        selectsRange={true}
        inline={true}
        onChange={onChange}
      />
    </div>
      <div className={`grid grid-cols-10 py-6 px-6 border-t border-t-gray-100 items-center overflow-hidden`}>
      <div className={` ${error.show ? 'top-0' : '-top-28'} transition-all duration-500 absolute z-10 left-0 w-full bg-gradient-to-b from-white to-[rgba(255,255,255,0)] px-2 py-2 md:flex justify-center`}>
      <p className=" px-4 py-2 rounded-md bg-red-500 text-white shadow-lg shadow-[rgba(0,0,0,0.2)]">{error.message}</p> 
        </div>
        <div className='col-span-8'>
            <div className='mb-2 pb-3 w-full rounded-md'>
                <div className='flex items-center'>
                    <p className='text-xs text-black font-medium w-[30%]'>Pickup Time</p>
                    {/* <ReactSlider onChange={(value)=>onTimeChange(value,'pickup')} value={startDate.getHours()} className="horizontal-slider w-full bg-transparent" renderTrack={()=><div className='bg-[#e3e3e3] rounded-lg w-full h-[2px] overflow-hidden'></div>} markClassName='bg-[#959595]' max={23} min={0} step={1} marks={marks} renderThumb={(props, state)=><div {...props} className='z-10 top-[-10px] bg-black inline shadow-sm py-1 w-[68px] text-center text-[10px] text-white rounded-full outline-none cursor-pointer'>{getStatus(state.value)}</div>}/> */}
                </div>

            </div>
            <div className='pt-3 w-full rounded-md'>
                <div className='flex items-center'>
                    <p className='text-xs text-black font-medium w-[30%]'>Drop Time</p>
                    {/* <ReactSlider onChange={(value)=>onTimeChange(value,'drop')} trackClassName='track' value={endDate.getHours()}  className="horizontal-slider w-full bg-transparent" renderTrack={()=><div className='bg-[#e3e3e3] rounded-lg w-full h-[2px] overflow-hidden'></div>} markClassName='bg-[#959595]' max={23} step={1} min={0} marks={marks} renderThumb={(props, state)=><div {...props} className='z-10 top-[-10px] bg-black inline shadow-sm py-1 w-[68px] text-center text-[10px] text-white rounded-full outline-none cursor-pointer'>{getStatus(state.value)}</div>}/> */}
                    {/* <Slider min={0} max={24} defaultValue={endDate.getHours()} onChange={(value)=>onTimeChange(value,'drop')}  handleRender={handle}  value={endDate.getHours()}/> */}
                    {/* <Slider startPoint={4} range={false} onChange={(value)=>onTimeChange(value,'drop')} trackClassName='track' value={endDate.getHours()}  className="horizontal-slider w-full bg-transparent" renderTrack={()=><div className='bg-[#e3e3e3] rounded-lg w-full h-[2px] overflow-hidden'></div>} markClassName='bg-[#959595]' max={23} step={1} min={0} marks={marks} renderThumb={(props, state)=><div {...props} className='z-10 top-[-10px] bg-black inline shadow-sm py-1 w-[68px] text-center text-[10px] text-white rounded-full outline-none cursor-pointer'>{getStatus(state.value)} </div>}/> */}
                </div>

            </div>
        </div>
        <div className='col-span-2'>
            <button onClick={onSubmit} className='rounded-sm text-[#EDBF31] bg-[rgba(0,0,0,1)] font-medium transition-colors hover:bg-[rgba(55,55,55,1)] px-4 py-2 ml-6 text-[11px]'>Submit</button>
        </div>
      </div>
    </div>
    </>
  );
};

export default DateTimePicker;
