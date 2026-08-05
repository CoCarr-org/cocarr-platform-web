import React, { createRef, useState } from 'react'
import { IoCloseCircle } from 'react-icons/io5'

export default function Popup({title,onClose,children,submitTitle,formName,submitting=false,onSubmittingTitle='Submitting',size='md'}) {

  return (
    <div className='bg-[#000000aa] bg-opacity-70 fixed z-[999] w-[100%] h-full left-0 top-0 flex justify-center items-center overflow-scroll py-2'>
    <div className={`${size === 'md' ? 'w-[520px]' : 'w-[820px]'} max-w-full bg-white top-0 h-auto  rounded-lg `}>
        <div className='flex px-8 py-4 justify-between items-center border-b-2 border-gray-100'>
            <h3 className='text-[14px] font-semibold tracking-[-.15px] capitalize'>{title}</h3>
            <div className='bg-gray-100 px-2 py-2 rounded-md hover:bg-gray-200 transition-all cursor-pointer' onClick={()=>onClose(false)}>
              <IoCloseCircle className='w-5 h-5'/>
            </div>
        </div>
        <div className='flex px-8 py-6 w-full '>
            {children}
        </div>
        <div className='flex justify-end mt-4 px-8 py-4   border-t-2 border-gray-50'>
            <button type='button' className='btn-md-disabled' onClick={()=>onClose(false)}>Cancel</button>
            <button form={formName} type='submit' className="ml-4 btn-md disabled:bg-[#d3d3d3] disabled:text-[#a3a3a3]" disabled={submitting}>{submitting ? onSubmittingTitle : submitTitle}</button>
        </div>
    </div>
</div>
  )
}
