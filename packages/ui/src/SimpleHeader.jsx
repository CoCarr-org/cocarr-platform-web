import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react'
import { BiChevronLeft, BiChevronLeftCircle, BiSolidChevronLeft, BiSolidChevronLeftCircle } from 'react-icons/bi'
import { FiArrowLeftCircle } from 'react-icons/fi'

export default function SimpleHeader({title,RightContent,parent=''}) {
  const navigate = useRouter();
  return (
    <div className=' px-4 pl-6 py-2 bg-white flex justify-between items-center border-b  border-b-[#e3e3e3] relative'>
      {/* <div className='absolute -left-5 top-1/2 -translate-y-1/2 cursor-pointer bg-[var(--primary-color)] rounded-full p-2' onClick={()=>navigate(-1)}>
        <BiSolidChevronLeftCircle className='text-[#252525] text-[24px]'/>
      </div> */}
        <div>
        <p className='text-[12px] font-medium capitalize tracking-[-.25px] text-gray-400'><Link href={'/'}>Home</Link> {parent ? '>' : null} <Link className='hover:text-[#2ac08b]' href={`/dashboard/${parent}`}>{parent}</Link></p>
        <h2 className='text-[14px] font-medium capitalize tracking-[-.15px]'>{title}</h2>
        </div>
        <RightContent/>
    </div>
  )
}
