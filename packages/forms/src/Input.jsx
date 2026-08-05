import React from 'react'

export default function Input({type='text',placeholder,required=false,value,setValue,error=null,viewMode,pattern,number=false,disabled=false,ref=null,padding=true}) {

    const onPress = (e)=>
    {
        const re = /^[0-9\b]+$/;

        if(number === true)
        {
          if (e.target.value === '' || re.test(e.target.value)) {
            return true;
          }
          else return false;
        }
    }
    const onChange = (e)=>
    {
        const re = /^[0-9\b]+$/;

        if(number === true)
        {
          if (e.target.value === '' || re.test(e.target.value)) {
            console.log('number input')
            setValue(e.target.value)
          }
        }
        else setValue(e.target.value)
    }
    
  return (
    <div class={`relative ${padding ? 'pb-5' : ''}`}>
    {viewMode ? type === 'password' ? <input disabled={true} className='bg-white' type={'password'}  value={'sampletext'} required={false}/> : <p className={`text-[13px] md:text-sm text-black ${type!=='email' ? 'capitalize':''}`}>{value}</p> : <input disabled={disabled} ref={ref} type={type}  pattern={pattern}  value={value} class={`${error ? 'error-input' : 'text-input'}`} 
    placeholder={placeholder} required={required} onChange={onChange} onKeyDown={onPress}/>}
    {error ? <div class="w-full absolute left-0 bottom-0 flex items-center pointer-events-none overflow-hidden h-4">
                                <div className='text-center'>
                            <p className='text-red-600 h-[20px] text-[12px] tracking-tight font-medium'>{error}</p>
                                    </div>
                        </div> : null}
    </div>
  )
}
