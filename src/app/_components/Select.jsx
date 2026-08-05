export default function Select({options=[],required=true,value,setValue,error,placeholder,viewMode,customLabel=false,customValue=false,padding=true,defaultValue}) {
    return (
        <div class={`relative ${padding ? 'pb-3 md:pb-5' : ''}`}>
        <select defaultValue={defaultValue} className={`capitalize min-w-[120px] ${error ? 'error-input' : 'px-2 pr-0'}`} value={value} disabled={viewMode} onChange={(e)=>setValue(e.target.value)} required={required}>
                    <option value={''} >{placeholder}</option>
                    {
                        options.map((item,index)=>
                        {
                            return <option value={customValue ? item[customValue] : item.value}>{customLabel ? item[customLabel] : item.name}</option>
                        })
                    }
                </select>
                {error ? <div class="w-full absolute left-0 bottom-0 flex items-center pointer-events-none overflow-hidden h-4">
                                <div className='text-center'>
                            <p className='text-red-600 h-[20px] text-[12px] tracking-tight font-medium whitespace-nowrap'>{error}</p>
                                    </div>
                        </div> : null}
                </div>
  )
}