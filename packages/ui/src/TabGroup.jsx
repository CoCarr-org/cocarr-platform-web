import { NavLink } from "react-router-dom"

export default function TabGroup({options}) {
    return (
        <div className='w-auto flex  ml-0 mb-6'>
        <div class={`relative self-stretch h-[full]`}>
            <div className="flex bg-[#fff] border border-slate-200 rounded-md overflow-hidden">
                {
                    options.map((item,index)=>
                    {
                        return <NavLink key={index} to={item.url} end className={({isActive}) => `block items-center py-2 px-4  border-r border-r-slate-200 ${isActive ? 'bg-black text-[#ECC032]' : 'bg-transparent text-[#454545]'}`}>
                        <div className='flex items-center text-center'>
                            <p className='text-sm font-semibold tracking-tight '>{item.label}</p>
                        </div>
                        </NavLink>
                    })
                }
            </div>
        </div>
        </div>
  )
}