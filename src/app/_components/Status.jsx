export default function Status({type,label}) {
    return (
        <div className={`inline-block px-3 py-1.5 rounded-full ${type === 'negative' ? 'bg-red-200' : type === 'positive' ? 'bg-green-200' : type ==='medium' ? 'bg-orange-100' : 'bg-gray-200'}`}>
            <p className={`text-xs capitalize tracking-tight font-medium ${type === 'negative' ? 'text-red-700' : type === 'positive' ? 'text-green-700' : type === 'medium' ? 'text-orange-500' : 'text-gray-700'}`}>{label}</p>
                </div>
  )
}