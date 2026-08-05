'use client'
import React, { useEffect, useMemo, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

const input = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'
const Label = ({ children }) => <label className='block text-xs font-semibold text-[#454545] mb-1.5'>{children}</label>

export default function CustomReport() {
  const [schema, setSchema] = useState({ datasets: [] })
  const [dataset, setDataset] = useState('')
  const [groupBy, setGroupBy] = useState('')
  const [metrics, setMetrics] = useState([])
  const [filters, setFilters] = useState({})
  const [range, setRange] = useState({ from: '', to: '' })
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    authAxios.get('/admin/reports/custom/schema')
      .then((r) => {
        setSchema(r.data)
        const first = r.data?.datasets?.[0]
        if (first) { setDataset(first.key); setMetrics([first.metrics[0].key]) }
      })
      .catch((e) => ErrorToast(e?.response?.data?.error || 'Could not load report options'))
  }, [])

  const config = useMemo(
    () => schema.datasets.find((d) => d.key === dataset),
    [schema.datasets, dataset],
  )

  // Metrics and filters belong to a dataset, so switching datasets has to
  // reset them — otherwise the request carries fields the new dataset rejects.
  const changeDataset = (key) => {
    const next = schema.datasets.find((d) => d.key === key)
    setDataset(key)
    setGroupBy('')
    setFilters({})
    setResult(null)
    setMetrics(next ? [next.metrics[0].key] : [])
  }

  const toggleMetric = (key) => setMetrics((prev) =>
    prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key])

  const run = async () => {
    if (!metrics.length) { ErrorToast('Select at least one metric'); return }
    setRunning(true)
    try {
      const res = await authAxios.post('/admin/reports/custom/run', {
        dataset, groupBy: groupBy || undefined, metrics, filters,
        from: range.from || undefined, to: range.to || undefined,
      })
      setResult(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not run report')
    } finally { setRunning(false) }
  }

  const exportCsv = () => {
    if (!result?.rows?.length) return
    const header = [result.groupBy?.label || 'Total', ...result.metrics.map((m) => m.label)]
    const csv = [
      header.join(','),
      ...result.rows.map((r) => [r.groupValue, ...result.metrics.map((m) => r[m.key])]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `${dataset}-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='max-w-6xl mx-auto pb-10'>
      <Header title='Custom Reports' RightContent={() => null} />

      <div className='bg-white border border-gray-100 rounded-md p-5 my-4'>
        <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>Build your report</p>

        <div className='grid md:grid-cols-2 gap-4'>
          <div>
            <Label>Data source</Label>
            <select className={input} value={dataset} onChange={(e) => changeDataset(e.target.value)}>
              {schema.datasets.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Group by</Label>
            <select className={input} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value=''>No grouping (single total)</option>
              {(config?.groupBy || []).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </div>
        </div>

        <div className='mt-4'>
          <Label>Metrics — pick one or more</Label>
          <div className='flex flex-wrap gap-2'>
            {(config?.metrics || []).map((m) => (
              <button key={m.key} type='button' onClick={() => toggleMetric(m.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                  metrics.includes(m.key)
                    ? 'bg-[#ECC032] border-[#ECC032] text-black'
                    : 'bg-white border-gray-200 text-[#757575]'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className='grid md:grid-cols-2 gap-4 mt-4'>
          <div>
            <Label>From</Label>
            <input type='date' className={input} value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </div>
          <div>
            <Label>To</Label>
            <input type='date' className={input} value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
        </div>

        {(config?.filters || []).length > 0 && (
          <div className='mt-4'>
            <Label>Filters (optional)</Label>
            <div className='grid md:grid-cols-3 gap-3'>
              {config.filters.map((f) => (
                <div key={f.key}>
                  <p className='text-[11px] text-[#757575] mb-1'>{f.label}</p>
                  {f.type === 'select' ? (
                    <select className={input} value={filters[f.key] || ''}
                      onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}>
                      <option value=''>Any</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'boolean' ? (
                    <select className={input} value={filters[f.key] ?? ''}
                      onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}>
                      <option value=''>Any</option>
                      <option value='true'>Yes</option>
                      <option value='false'>No</option>
                    </select>
                  ) : (
                    <input className={input} value={filters[f.key] || ''} placeholder='Any'
                      onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='flex items-center gap-3 mt-5'>
          <button onClick={run} disabled={running}
            className='bg-[#ECC032] text-black text-sm font-semibold px-5 py-2 rounded-md'>
            {running ? 'Running…' : 'Run report'}
          </button>
          {result?.rows?.length > 0 && (
            <button onClick={exportCsv} className='border border-gray-200 text-sm font-semibold px-4 py-2 rounded-md'>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
          <div className='px-5 py-4 border-b border-gray-100'>
            <p className='text-sm font-semibold'>
              {result.datasetLabel}
              {result.groupBy && <span className='text-[#757575] font-normal'> by {result.groupBy.label}</span>}
            </p>
            <p className='text-[11px] text-[#959595] mt-0.5'>
              {result.range.from || result.range.to
                ? `${result.range.from || 'start'} → ${result.range.to || 'now'}`
                : 'All time'} · {result.rows.length} row(s)
            </p>
          </div>
          <table className='w-full text-sm'>
            <thead>
              <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
                <th className='px-5 py-3 font-semibold'>{result.groupBy?.label || ''}</th>
                {result.metrics.map((m) => <th key={m.key} className='px-5 py-3 font-semibold'>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 && (
                <tr><td colSpan={result.metrics.length + 1} className='px-5 py-6 text-[#757575]'>
                  No data matches these options.
                </td></tr>
              )}
              {result.rows.map((r, i) => (
                <tr key={`${r.groupValue}-${i}`} className='border-b border-gray-50 last:border-b-0'>
                  <td className='px-5 py-3 font-medium'>{String(r.groupValue)}</td>
                  {result.metrics.map((m) => (
                    <td key={m.key} className='px-5 py-3'>{Number(r[m.key]).toLocaleString('en-IN')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
