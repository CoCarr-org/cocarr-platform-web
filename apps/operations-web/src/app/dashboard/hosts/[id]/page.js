'use client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@cocarr/ui';
import { ErrorToast } from '@cocarr/notifications';
import { coreApi } from '@cocarr/api-sdk';
import { FiArrowRight } from 'react-icons/fi';
import { NoticeBar } from '@cocarr/ui';

export default function UserInfo() { 

    const {id} = useParams();
    const [hostInfo,setHostInfo] = useState([])

    const RightContent = ()=>
    {
        return <div>
        </div>
    }

    const getHostInfo = async ()=>
    {
        try 
        {
            let res = await coreApi().get(`/host/${id}`)
            // console.log('res',res.data)
            setHostInfo(res.data)
        } catch (error) {
            ErrorToast(error.response?.data?.error?.message)
        }
    }

    useEffect(()=>
    {
        getHostInfo();
    },[])

    const info = [
        {
            label:'Host Info',
            items:[
              {
                label:'Name',
                value:hostInfo.name
              },
              {
                label:'Email',
                value:hostInfo.user?.email
              },
              {
                label:'Contact Number',
                value:hostInfo.user?.contactNumber
              },
              {
                label:'Address',
                value:hostInfo.user?.address
              },
                
            ]
        },
        {
          label:'Ride Stats',
          items:[
            {
              label:'Total Rides',
              value:hostInfo.totalRides
            },
            {
              label:'Customer Cancelled',
              value:hostInfo.totalCustomerCancelledRides
            },
            {
              label:'Host Cancelled',
              value:hostInfo.totalHostCancelledRides
            },
            {
              label:'Total Unclean Rides',
              value:hostInfo.totalUncleanRides
            }
          ]
        },
        {
          label:"KYC Info",
          items:[
            {
              label:'KYC Status',
              value:hostInfo.user?.kycNumber
            },
            {
              label:'KYC Verification',
              value:hostInfo.user?.kycVerified ? 'Verified' : 'Not Verified'
            }
          ]
        }
    ]
    
    const activeAccount = hostInfo?.hostPayoutAccount?.find(account => account.isActive)
  return (
    <>
    <div className='px-6 max-w-7xl mx-auto block  gap-x-6 bg-white w-full flex-1 overflow-y-auto'>
                    {
                      info.map((item,index)=>
                        {
                          return <div key={index} className='border-b w-full border-b-slate-200 py-6 '>
                            <p className='text-xs font-semibold text-[#959595] uppercase mb-4'>{item.label}</p>
                            <div className='grid grid-cols-6 gap-x-4 gap-y-8'>
                                {
                                  item.items.map((item,i)=>
                                    {
                                      return <div key={i} className='text-left'>
                                            <p className='text-xs text-[#757575]'>{item.label}</p>
                                            <p className='text-sm font-medium text-[#454545] capitalize'>{item.value}</p>
                                        </div>
                                    })
                                  }
                            </div>
                        </div>
                    })
                  }

                  <PayoutInfo hostInfo={hostInfo}/>
                  </div>
    </>
  )
}





const PayoutInfo = ({hostInfo})=>
{
  const activeAccount = hostInfo?.hostPayoutAccount?.find(account => account.isActive)
  const inactiveAccounts = hostInfo?.hostPayoutAccount?.filter(account => !account.isActive)

  const info = [
        {
          label:'Account Number',
          value:activeAccount?.accountNumber
        },
        {
          label:'IFSC Code',
          value:activeAccount?.ifscCode
        },
        {
          label:'Bank Name',
          value:activeAccount?.bankName
        },
        {
          label:'Host Provided Name',
          value:activeAccount?.hostProvidedName
        },
        {
          label:'Actual Account Holder Name',
          value:activeAccount?.accountHolderName
        },
        {
          label:'City',
          value:activeAccount?.city
        }
        
      ]


  return <div>
    {activeAccount && (
      <div className='border-b w-full border-b-slate-200 py-6'>
        <p className='text-xs font-semibold text-[#959595] uppercase mb-4'>Active Payout Account</p>
        <div className='grid grid-cols-4 gap-x-4 gap-y-8'>
    {
      info.map((item,index)=>
      {
        return <div key={index} className='text-left'>
          <p className='text-xs text-[#757575]'>{item.label}</p>
          <p className='text-sm font-medium text-[#454545]'>{item.value}</p>
        </div>
      })
    }
        </div>
      </div>
    )}

    {inactiveAccounts && inactiveAccounts.length > 0 && (
      <div className='w-full py-6'>
        <p className='text-xs font-semibold text-[#959595] uppercase mb-4'>Previous Payout Accounts</p>
        <table className='w-full'>
          <thead className='bg-[#f9f9f9]'>
            <tr>
              <th className='text-left p-3 text-xs text-[#757575]'>Account Number</th>
              <th className='text-left p-3 text-xs text-[#757575]'>IFSC Code</th>
              <th className='text-left p-3 text-xs text-[#757575]'>Bank Name</th>
            </tr>
          </thead>
          <tbody>
            {inactiveAccounts.map((account, index) => (
              <tr key={index} className='border-b border-slate-200'>
                <td className='p-3 text-sm'>{account.accountNumber}</td>
                <td className='p-3 text-sm'>{account.ifscCode}</td>
                <td className='p-3 text-sm'>{account.bankName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
}