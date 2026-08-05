'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavigationTabBar({ options }) {
  const pathname = usePathname()

  return (
    <div className='w-full flex ml-0'>
      <div className='relative self-stretch h-full w-full'>
        <div className="flex rounded-md overflow-hidden w-full bg-[#fafafa] border-b border-slate-200">
          {options.map((item, index) => (
            <Link 
              key={index} 
              href={item.url}
              className={`block items-center relative ${
                pathname === item.url 
                  ? ' text-black' 
                  : 'bg-transparent text-[#656565]'
              }`}
            >
                <div className={`absolute bottom-0 left-0 w-full h-[2px] opacity-50 ${pathname === item.url ? ' bg-[#ECC032]   opacity-100' : 'opacity-0'}`}></div>
              <div className='flex items-center text-center py-3 px-3'>
                <p className='text-[0.8em] font-medium tracking-tight'>
                  {item.label}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}