import React, { createRef, useState } from 'react'
import { IoCloseSharp } from 'react-icons/io5'
// import CloseIcon from '../images/close.svg'

export default function FullPopup({title,onClose,children,submitTitle,formName}) {

  return (
    <div className='bg-[rgba(255,255,255,0.99)] backdrop-blur-sm bg-opacity-70 fixed z-[999] w-[100%] h-full left-0 top-0 flex justify-center items-center overflow-scroll py-2'>
    <div className=' mx-auto w-full h-full  overflow-hidden flex flex-col'>
        <div className='flex px-8 py-4 justify-between items-center border-b-2 border-gray-100 bg-[#fff]'>
            <div className='flex justify-between max-w-5xl w-full mx-auto'>
            <h3 className='text-[14px] font-semibold tracking-[-.15px] capitalize'>{title}</h3>
            <div className='bg-gray-100 px-2 py-2 rounded-md hover:bg-gray-200 transition-all cursor-pointer' onClick={()=>onClose(false)}>
              <IoCloseSharp className='w-5 h-5'/>
            </div>
            </div>
        </div>
        <div className='flex flex-1 items-start px-8 py-6 w-full '>
            {children}
        </div>
        <div className='flex justify-end mt-4 px-8 py-4  bg-[#fafafa] border-t-2 border-gray-50'>
            <button type='button' className='btn-md-disabled' onClick={()=>onClose(false)}>Cancel</button>
            <button form={formName} type='submit' className='ml-4 btn-md'>{submitTitle}</button>
        </div>
    </div>
</div>
  )
}
