'use client'
import { FiArrowRight } from 'react-icons/fi'

const NoticeBar = ({ message, onClick=()=>{} }) => {
    return (
        <div className='p-0 my-4 flex justify-center items-center'>
            <div onClick={onClick} className='bg-[#ff4949] hover:bg-[#cf1919] transition-all duration-300 cursor-pointer p-2 px-4 rounded-xs flex items-center gap-2'>
                <p className='text-xs font-medium text-[#fff] capitalize'>{message}</p>
                <FiArrowRight className='text-white' />
            </div>
        </div>
    )
}

export default NoticeBar    