'use client'
import React, { useEffect, useState } from 'react'
import { ErrorToast } from '@/app/_helpers/toasters'
import { getDateFormat, getTimeFormat, getValidDateFormat } from '@/app/_helpers/utils'
import { LIMIT } from '@/app/_helpers/constants'
import SearchInput from '@/app/_components/SearchInput'
import Pagination from '@/app/_components/Pagination'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function Wallet() {
    const [searchText, setSearchText] = useState('')
    const [wallets, setWallets] = useState([])
    const [offset, setOffset] = useState(0)
    const [count, setCount] = useState(5)
    const [sort, setSort] = useState('-createdAt')
    const navigate = useRouter()

    async function getWallets() {
        try {
            let query = `populate=true&offset=${offset}&limit=${LIMIT}&sort=${sort}`
            if(searchText) query += `&search=${searchText}`
            
            let res = await axios.get(`/wallet?${query}`)
            setWallets(res.data.wallets)
            setCount(res.data.totalCount)
        } catch (error) {
            ErrorToast(error.response?.data?.name || 'Error fetching wallets')
        }
    }

    useEffect(() => {
        getWallets()
    }, [searchText, offset, sort])

    return (
        <>
            <div className='block justify-between max-w-7xl mx-auto'>
                <div className='flex mb-4 justify-between header'>
                    <SearchInput 
                        value={searchText} 
                        setValue={(value) => setSearchText(value)} 
                        placeholder={'Search wallets'} 
                        label={'Search wallets'} 
                    />
                    <div className='flex items-center h-full justify-center text-center border-[#d3d3d3] bg-white rounded-md shadow-sm shadow-gray-200 ml-4'>
                        <Pagination count={count} offset={offset} setOffset={setOffset}/>
                        <div className="w-full ml-4">
                            <select 
                                onChange={(e) => setSort(e.target.value)} 
                                className="w-full rounded-md shadow-sm shadow-gray-200 border-[#f3f3f3]"
                            >
                                <option value="-createdAt">Date (DESC)</option>
                                <option value="createdAt">Date (ASC)</option>
                                <option value="-amount">Amount (DESC)</option>
                                <option value="amount">Amount (ASC)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className='flex flex-1 w-full px-4 py-4'>
                    <table className='w-full'>
                        <thead className=' w-full'>
                            <tr className='w-full'>
                                <td onClick={() => setSort('-createdAt')}><p>User</p></td>
                                <td onClick={() => setSort('type')}><p>Remaining Points</p></td>
                                <td onClick={() => setSort('amount')}><p>Used Points</p></td>
                                <td onClick={() => setSort('amount')}><p>Referral Points</p></td>
                                <td onClick={() => setSort('status')}><p>Status</p></td>
                            </tr>
                        </thead>
                        <tbody>
                            {wallets.map((item, index) => (
                                <tr key={index}>
                                    <td className='capitalize'>
                                        <div>
                                            <p className='text-sm font-medium my-0'>{item.user.name}</p>
                                            <p className='text-xs my-0 text-gray-400'>{item.user.contactNumber}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <p className='text-sm font-regular my-0'>{item.walletPoints}</p>
                                        </div>
                                    </td>
                                    <td className='capitalize'>
                                        <div>
                                            <p className='text-sm font-regular my-0'>{item.walletPointsUsed}</p>
                                        </div>
                                    </td>
                                    <td className='capitalize'>
                                        <div>
                                            <p className='text-sm font-regular my-0'>{item.referralPoints}</p>
                                        </div>
                                    </td>
                                    <td className='capitalize'>
                                        <div>
                                            <p className={`text-xs font-medium ${item.status ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {item.status ? 'Active' : 'Inactive'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}
