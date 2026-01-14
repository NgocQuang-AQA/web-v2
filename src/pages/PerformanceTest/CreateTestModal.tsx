import { useState } from 'react'
import { apiJson } from '../../lib/api'

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Header = {
  key: string
  value: string
}

export default function CreateTestModal({ open, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [method, setMethod] = useState('GET')
  const [users, setUsers] = useState(10)
  const [loop, setLoop] = useState(1)
  const [rampUp, setRampUp] = useState(1)
  const [body, setBody] = useState('')
  const [headers, setHeaders] = useState<Header[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBodyRequired = ['POST', 'PUT', 'PATCH'].includes(method)
  const headersValid =
    headers.length === 0 ||
    headers.every((h) => h.key.trim().length > 0 && h.value.trim().length > 0)
  const isFormValid =
    name.trim().length > 0 &&
    url.trim().length > 0 &&
    Number(users) > 0 &&
    Number(loop) > 0 &&
    Number(rampUp) >= 0 &&
    (!isBodyRequired || body.trim().length > 0) &&
    headersValid

  if (!open) return null

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const handleImportDefaultHeaders = () => {
    const defaults: Header[] = [
      {
        key: 'Accept',
        value: 'application/json, text/plain, */*',
      },
      {
        key: 'Connection',
        value: 'keep-alive',
      },
      {
        key: 'gz_session_id',
        value: '',
      },
    ]
    const existingKeys = new Set(headers.map((h) => h.key))
    const merged: Header[] = [...headers]
    for (const h of defaults) {
      if (!existingKeys.has(h.key)) {
        merged.push(h)
      }
    }
    setHeaders(merged)
  }

  const handleRemoveHeader = (index: number) => {
    const newHeaders = [...headers]
    newHeaders.splice(index, 1)
    setHeaders(newHeaders)
  }

  const handleHeaderChange = (index: number, field: keyof Header, value: string) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let protocol = 'https'
      let host = ''
      let port = 443
      let path = '/'

      try {
        const urlObj = new URL(url)
        protocol = urlObj.protocol.replace(':', '')
        host = urlObj.hostname
        port = urlObj.port ? parseInt(urlObj.port) : (protocol === 'https' ? 443 : 80)
        path = urlObj.pathname + urlObj.search
      } catch {
        throw new Error('Invalid URL format')
      }

      // Convert headers array to object
      const headerObj = headers.reduce((acc, curr) => {
        if (curr.key.trim()) {
          acc[curr.key.trim()] = curr.value
        }
        return acc
      }, {} as Record<string, string>)

      const res = await apiJson<{ testId?: string; status?: string; message?: string }>('/api/performance/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiName: name,
          method,
          requestConfig: {
            headers: headerObj,
            body: method !== 'GET' ? body : undefined,
          },
          jmeterConfig: {
            protocol,
            host,
            port,
            path,
            threads: Number(users),
            rampUp: Number(rampUp),
            loop: Number(loop)
          }
        }),
      })
      
      if (!res) {
        setError('Failed to create test. Please try again.')
        setLoading(false)
        return
      }
      
      const testId = res?.testId
      if (testId) {
        for (let i = 0; i < 60; i++) {
          const doc = await apiJson<{ status?: string }>(`/api/performance/${encodeURIComponent(testId)}`)
          const st = String(doc?.status || '')
          if (st === 'COMPLETED' || st === 'FAILED') break
          await new Promise((r) => setTimeout(r, 2000))
        }
        onSuccess()
        onClose()
      } else {
        onSuccess()
        onClose()
      }
      setName('')
      setUrl('')
      setMethod('GET')
      setUsers(10)
      setLoop(1)
      setRampUp(1)
      setBody('')
      setHeaders([])
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'An error occurred while creating the test.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 transform transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create Performance Test</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="e.g. Homepage Load Test"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="https://example.com/api/v1/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Threads (Users) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={users}
                onChange={(e) => setUsers(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loop Count <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={loop}
                onChange={(e) => setLoop(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ramp Up (sec) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="300"
                required
                value={rampUp}
                onChange={(e) => setRampUp(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
             <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Headers <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleImportDefaultHeaders}
                    className="text-gray-600 hover:text-gray-800 text-xs font-medium px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Import Default
                  </button>
                  <button
                    type="button"
                    onClick={handleAddHeader}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Header
                  </button>
                </div>
             </div>
             <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      required
                      placeholder="Key (e.g. Authorization)"
                      value={header.key}
                      onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <input
                      required
                      placeholder="Value"
                      value={header.value}
                      onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(index)}
                      className="p-2 text-gray-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                {headers.length === 0 && (
                  <div className="text-sm text-gray-400 italic text-center py-2 border border-dashed border-gray-200 rounded-xl">
                    No headers configured
                  </div>
                )}
             </div>
          </div>

          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Body (JSON) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder={'{\n  "key": "value"\n}'}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm hover:shadow"
              disabled={loading || !isFormValid}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Run Test
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
