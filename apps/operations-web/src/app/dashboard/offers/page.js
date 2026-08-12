'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { toast } from 'react-toastify'
import { InfoToast } from '@cocarr/notifications'
import { Header, Pagination, SearchInput } from '@cocarr/ui'
import { LIMIT, getDateFormat, getValidDateFormat } from '@cocarr/shared-utils'
import ManageOffer from './_components/ManageOffer'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

export default function Offers() {
    const [searchText,setSearchText] = useState('')
    const [offers,setOffers] = useState([])
    const [showCreate,setShowCreate] = useState({status:false,edit:null})
    const [offset,setOffset] = useState(0);
    const [count,setCount] = useState(5)
    const [cityFilters,setCityFilters] = useState([])
    const [routeFilters,setRouteFilters] = useState([])
    const navigate = useRouter()
    
    const columnHelper = createColumnHelper()

    const columns = [
        columnHelper.accessor('code', {
            header: 'Code',
            cell: info => (
              <p className='text-sm font-medium my-0 text-black'>{info.getValue()}</p>
            ),
            size: 100
          }),
      columnHelper.accessor('validFrom', {
        header: 'Start Date',
        size: 50,
        cell: info => (
          <p className='text-sm'>
            {getDateFormat(info.row.original.validFrom)}
          </p>
        ),
      }),
      columnHelper.accessor('validTo', {
        header: 'End Date',
        maxSize: 100,
        cell: info => (
          <p className='text-sm'>
            {getDateFormat(info.row.original.validTo)}
          </p>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: info => (
          <p className='text-sm my-0 text-black'>{info.getValue()}</p>
        ),
      }),
    //   columnHelper.accessor('discount', {
    //     header: 'Discount',
    //     cell: info => (
    //       <p className='text-sm'>
    //         {parseFloat(info.row.original.discountValue).toFixed(0)}
    //         {info.row.original.discountType === 'percent' ? '%' : 'Rs.'} 
    //         Upto Rs.{info.row.original.maxDiscountAmount}
    //       </p>
    //     ),
    //   }),
      columnHelper.accessor('hours', {
        header: 'Hours',
        cell: info => (
          <p className='text-sm my-0 text-black'>
            {info.row.original.minHours} - {info.row.original.maxHours}
          </p>
        ),
      })
    ]

    const table = useReactTable({
      data: offers,
      columns,
      getCoreRowModel: getCoreRowModel(),
    })

    async function getOffers(){
        try 
        {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}`
            if(searchText) query+= `&search=${searchText}`
            let res = await coreApi().get(`${process.env.NEXT_PUBLIC_BASE_URL}/offers?${query}`)
            setOffers(res.data)
        } catch (error) {
            toast('Error getting products')
        }
    }

    useEffect(()=>
    {
        getOffers();
    },[searchText,offset])

    async function onSubmit(e,data){
        try {
            e.preventDefault()
            let res = await coreApi().post(`${process.env.NEXT_PUBLIC_BASE_URL}/offers`,data)
            InfoToast('Offer created successfully')
            setShowCreate({status:false,edit:null})
        } catch (error) {
            InfoToast('Error creating offer')
        }
    }
 

    const RightContent = ()=>
    {
        return <button type='button' className='btn-md-stretched text-nowrap' onClick={()=>setShowCreate({status:true,edit:null})}>Add Offer</button>
    }
    return (
        <div className='max-w-7xl mx-auto'>
            <Header title={'Offers'} RightContent={RightContent} search={true} pagination={true} count={count} offset={offset} setOffset={setOffset} searchText={searchText} setSearchText={setSearchText}/>

            <div className='flex flex-1 w-full'>
                <table className='w-full'>
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <td key={header.id} className='text-left p-4 bg-[#f9f9f9]'>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className='p-4 border-b border-[#f3f3f3]'>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreate.status ? <ManageOffer onClose={setShowCreate} onSubmit={onSubmit} edit={showCreate.edit}/> : null}
        </div>
    )
}
