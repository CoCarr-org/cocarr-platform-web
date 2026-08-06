// import React from 'react'

export default function InputGroup({type='email',label,placeholder,required=false,setValue}) {
  return (
    <div className='mt-4 mb-4'>
        <label htmlFor="input-group-1" className='text-[#000] text-sm font-medium'>{label}</label>
        <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                {/* <img src={type === 'email' ? Email : Password} className='w-4 h-4'/> */}
            </div>
              <input type={type === 'email' ? 'email' : 'password'} minLength={type === 'email' ? 4 : 4} id="input-group-1" className=" border border-gray-300 text-gray-900 text-sm rounded-md focus:border-blue-400 focus:outline-none focus:ring focus:ring-blue-300 focus:ring-opacity-40 block w-full pl-12 p-4" 
            placeholder={placeholder} required={required} onChange={(e)=>setValue(e.target.value)}/>
    </div>
    </div>
  )
}
