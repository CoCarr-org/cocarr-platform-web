import React, { createRef, useState } from 'react'
import { IoClose } from 'react-icons/io5'
// import CloseIcon from '../images/close.svg'

export default function SlidePopup({title,onClose,children,submitTitle,formName,submitting,hideButton=false}) {

  return (
    <div onClick={()=>onClose(false)} className='bg-[rgba(0,0,0,0.65)] bg-opacity-70 fixed z-[999] w-[100%] h-screen left-0 top-0 flex justify-center items-center overflow-scroll py-2'>
    <div className='w-[620px] fixed max-w-full bg-white  top-[1%] h-[98%] right-[12px]  overflow-hidden flex flex-col' onClick={(e) => e.stopPropagation()}>
        <div className='flex px-6 py-4 justify-between items-center border-b-2 border-gray-100 bg-[#fff]'>
            <h3 className='text-[14px] font-semibold tracking-[-.15px] capitalize'>{title}</h3>
            <div className='bg-gray-100 px-2 py-2 rounded-md hover:bg-gray-200 transition-all cursor-pointer' onClick={()=>onClose(false)}>
              <IoClose className='w-5 h-5'/>
            </div>
        </div>
        <div className='flex flex-1 items-start px-8 py-6 w-full overflow-y-auto'>
            {children}
        </div>
        <div className='flex justify-end mt-4 px-8 py-4  bg-[#fafafa] border-t-2 border-gray-50'>
            <button type='button' className='btn-md-disabled' onClick={()=>onClose(false)}>{hideButton ? 'Close' : 'Cancel'}</button>
            {!hideButton && <button form={formName} type='submit' className='ml-4 btn-md' disabled={submitting}>{submitTitle}</button>}
        </div>
    </div>
</div>
  )
}
