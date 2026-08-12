export default function Select({options=[],required=true,value,setValue,error,placeholder,viewMode,customLabel=false,customValue=false,padding=true,defaultValue}) {
    // AN OPTION WITH NO TEXT IS AN EMPTY ROW, AND THAT IS WHAT THIS RENDERED.
    //
    // The label was read from ONE key — `customLabel` when given, otherwise
    // `item.name`. ResourceManager passes `customLabel='name'` while three of
    // its four callers declare their options as `{value, label}`, so every
    // option resolved to `undefined` and the dropdown opened as a column of
    // blank rows. (Employment type on Jobs, plus Organizations' type and
    // Feature flags' scope type.)
    //
    // So the label falls back rather than depending on one shape: the explicit
    // key, then `label`, then `name`, and finally the value itself — a raw
    // value is a poor label but it is always better than nothing to click.
    const labelFor = (item) => {
        const explicit = customLabel ? item[customLabel] : undefined
        const text = explicit ?? item.label ?? item.name
        return text === undefined || text === null || text === '' ? String(valueFor(item) ?? '') : text
    }
    const valueFor = (item) => (customValue ? item[customValue] : item.value)

    return (
        <div className={`relative ${padding ? 'pb-3 md:pb-5' : ''}`}>
        <select defaultValue={defaultValue} className={`capitalize min-w-[120px] ${error ? 'error-input' : 'px-2 pr-0'}`} value={value} disabled={viewMode} onChange={(e)=>setValue(e.target.value)} required={required}>
                    <option value={''} >{placeholder}</option>
                    {
                        options.map((item,index)=>
                        {
                            // Keyed by value, not index: a list that reorders
                            // (remote options arriving) would otherwise reuse
                            // the wrong DOM node for the selected row.
                            const v = valueFor(item)
                            return <option key={v ?? index} value={v}>{labelFor(item)}</option>
                        })
                    }
                </select>
                {error ? <div className="w-full absolute left-0 bottom-0 flex items-center pointer-events-none overflow-hidden h-4">
                                <div className='text-center'>
                            <p className='text-red-600 h-[20px] text-[12px] tracking-tight font-medium whitespace-nowrap'>{error}</p>
                                    </div>
                        </div> : null}
                </div>
  )
}
