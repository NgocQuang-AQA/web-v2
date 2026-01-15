import { useEffect, useState, useCallback } from 'react'
import AppLayout from '../../app/AppLayout'
import AgentSidebar from '../../app/AgentSidebar'
import CreateTestModal from './CreateTestModal'
import { apiJson } from '../../lib/api'
import Loading from '../../components/Loading'
import NoData from '../../assets/no-data-found_585024-42.avif'

interface PerfTest {
  _id: string
  apiName: string
  targetUrl: string
  method: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  summary?: {
    avg?: number
    errorRate?: number
    throughput?: number
  }
}

interface PerfTestDetail {
  _id: string
  apiName: string
  targetUrl: string
  method: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  requestConfig?: {
    headers?: Record<string, string>
    body?: unknown
    token?: string
  }
  jmeterConfig?: {
    threads: number
    rampUp: number
    loop: number
    protocol: string
    host: string
    port: number
    path: string
  }
  summary?: {
    samples?: number
    avg?: number
    errorRate?: number
    throughput?: number
    errorSample?: {
      responseCode?: string
      responseMessage?: string
      failureMessage?: string
      url?: string
      label?: string
    }
  }
  resultFilePath?: string
  errorMessage?: string
  __v?: number
  [key: string]: unknown
}

type JtlRow = {
  timeStamp: number
  elapsed: number
  label: string
  responseCode: string
  responseMessage: string
  threadName: string
  dataType: string
  success: boolean
  failureMessage: string
  bytes: number
  sentBytes: number
  grpThreads: number
  allThreads: number
  url: string
  latency: number
  idleTime: number
  connect: number
  isFail: boolean
}

export default function PerformanceTest() {
  const [tests, setTests] = useState<PerfTest[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [selectedTestData, setSelectedTestData] = useState<PerfTestDetail | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [jtlLoading, setJtlLoading] = useState(false)
  const [jtlError, setJtlError] = useState<string | null>(null)
  const [jtlItems, setJtlItems] = useState<JtlRow[]>([])
  const [showOnlyFail, setShowOnlyFail] = useState(false)

  const loadTests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiJson<{ total: number; items: PerfTest[] }>(
        `/api/performance?page=${page}&pageSize=${pageSize}`
      )
      if (data && Array.isArray(data.items)) {
        setTests(data.items)
        setTotal(Number(data.total || 0))
      } else {
        setTests([])
      }
    } catch (e) {
      console.error('Failed to load performance tests', e)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    loadTests()
  }, [refreshKey, loadTests])

  const handleCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1)
    setPage(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
      }
  }

  const handleOpenDetail = async (testId: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    setSelectedTestId(testId)
    setSelectedTestData(null)
    setJtlItems([])
    setJtlError(null)
    setJtlLoading(true)
    try {
      const data = await apiJson<PerfTestDetail>(
        `/api/performance/${encodeURIComponent(testId)}`
      )
      setSelectedTestData(data)
      const rows = await apiJson<{ total: number; items: JtlRow[] }>(
        `/api/performance/${encodeURIComponent(testId)}/results`
      )
      setJtlItems(Array.isArray(rows?.items) ? rows!.items! : [])
    } catch (e) {
      setDetailError(String(e))
    } finally {
      setDetailLoading(false)
      setJtlLoading(false)
    }
  }

  return (
    <AppLayout sidebar={<AgentSidebar />}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Tests</h1>
            <p className="text-gray-500 mt-1">Manage and execute API performance tests.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Test
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-soft flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <Loading />
          ) : tests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <img src={NoData} alt="No tests found" className="w-64 h-auto opacity-75 mb-4" />
              <p className="text-gray-500 text-lg">No performance tests found.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-indigo-600 font-medium hover:text-indigo-800"
              >
                Create your first test
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Avg Latency</th>
                    <th>Error Rate</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr
                      key={test._id}
                      className="cursor-pointer"
                      onClick={() => handleOpenDetail(test._id)}
                    >
                      <td className="text-gray-900">{test.apiName}</td>
                      <td className="text-gray-600">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mr-2">{test.method}</span>
                        <span className="truncate max-w-[200px] inline-block align-bottom">{test.targetUrl}</span>
                      </td>
                      <td>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="text-gray-600">
                        {test.summary?.avg ? `${test.summary.avg}ms` : '-'}
                      </td>
                      <td className="text-gray-600">
                        {test.summary?.errorRate ? `${(test.summary.errorRate * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="text-gray-500">
                        {new Date(test.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tests.length > 0 && (
            <div className="flex items-center justify-between px-6 py-2 border-t border-gray-200 mt-auto">
              <div className="text-sm text-gray-500">
                {total > 0 ? (
                  <>
                    Showing{' '}
                    <span className="font-medium text-gray-700">
                      {Math.min((page - 1) * pageSize + 1, total)}
                    </span>
                    {' '}–{' '}
                    <span className="font-medium text-gray-700">
                      {Math.min(page * pageSize, total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-gray-700">{total}</span>
                  </>
                ) : (
                  <>No records</>
                )}
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 border border-gray-300 rounded-full text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-600">Page {page}</span>
                  <button
                    className="px-3 py-2 border border-gray-300 rounded-full text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => {
                      const maxPage = Math.max(1, Math.ceil(total / pageSize))
                      setPage((p) => Math.min(maxPage, p + 1))
                    }}
                    disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateTestModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDetailOpen(false)}
          />
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 transform transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Performance Test Detail</h2>
                {selectedTestId && (
                  <p className="text-xs text-gray-500 mt-1">ID: {selectedTestId}</p>
                )}
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {detailLoading && (
              <div className="py-8 text-center text-sm text-gray-500">Loading test detail...</div>
            )}

            {detailError && !detailLoading && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm">
                {detailError}
              </div>
            )}

            {!detailLoading && !detailError && selectedTestData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="text-gray-900 font-medium">{selectedTestData.apiName}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Status</div>
                    <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTestData.status)}`}>
                      {selectedTestData.status}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                    <div className="text-sm text-gray-500">Target URL</div>
                    <div className="mt-1 font-mono text-xs bg-white rounded-lg p-2 border border-gray-200 overflow-x-auto">
                      {selectedTestData.targetUrl}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Method</div>
                    <div className="mt-1">
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200">
                        {selectedTestData.method}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Created At</div>
                    <div className="text-gray-900 mt-1">
                      {new Date(selectedTestData.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Samples</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.summary?.samples ?? 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Avg</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.summary?.avg ?? 0} ms</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Error Rate</div>
                      <div className="text-gray-900 font-medium">
                        {selectedTestData.summary?.errorRate != null
                          ? `${(Number(selectedTestData.summary?.errorRate) * 100).toFixed(2)}%`
                          : '0%'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Throughput</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.summary?.throughput ?? 0} req/s</div>
                    </div>
                  </div>
                  {selectedTestData.summary?.errorSample && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="text-xs font-semibold text-amber-800 mb-1">
                        API Error Detail (from JMeter results)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-900">
                        <div>
                          <span className="font-medium">Code:</span>{' '}
                          {selectedTestData.summary.errorSample.responseCode || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Label:</span>{' '}
                          {selectedTestData.summary.errorSample.label || 'N/A'}
                        </div>
                        <div className="md:col-span-2">
                          <div className="font-medium">Message:</div>
                          <div className="mt-0.5">
                            {selectedTestData.summary.errorSample.responseMessage ||
                              selectedTestData.summary.errorSample.failureMessage ||
                              'N/A'}
                          </div>
                        </div>
                        {selectedTestData.summary.errorSample.url && (
                          <div className="md:col-span-2">
                            <div className="font-medium">URL:</div>
                            <div className="mt-0.5 font-mono bg-white rounded-lg p-2 border border-amber-200 overflow-x-auto">
                              {selectedTestData.summary.errorSample.url}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">JMeter Config</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Threads</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.jmeterConfig?.threads ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Ramp Up</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.jmeterConfig?.rampUp ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Loop</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.jmeterConfig?.loop ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Protocol</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.jmeterConfig?.protocol ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Host</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.jmeterConfig?.host ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500">Port</div>
                      <div className="text-gray-900 font-medium">{selectedTestData.jmeterConfig?.port ?? '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 md:col-span-2">
                      <div className="text-xs text-gray-500">Path</div>
                      <div className="text-gray-900 font-mono text-xs bg-white rounded-lg p-2 border border-gray-200 overflow-x-auto">
                        {selectedTestData.jmeterConfig?.path ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">JMeter Results</h3>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={showOnlyFail}
                        onChange={(e) => setShowOnlyFail(e.target.checked)}
                      />
                      <span>Chỉ hiển thị lỗi (responseCode != 200)</span>
                    </label>
                  </div>
                  <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                    {jtlLoading ? (
                      <div className="p-4">
                        <Loading />
                      </div>
                    ) : jtlError ? (
                      <div className="p-3 text-sm text-rose-600">{jtlError}</div>
                    ) : jtlItems.length === 0 ? (
                      <div className="p-6 text-sm text-gray-500">No JMeter result entries</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table">
                          <thead>
                            <tr className="text-left text-gray-600">
                              <th>#</th>
                              <th>Timestamp</th>
                              <th>Elapsed</th>
                              <th>Label</th>
                              <th>Response Code</th>
                              <th>Response Message</th>
                              <th>Thread</th>
                              <th>Data Type</th>
                              <th>Success</th>
                              <th>Failure</th>
                              <th>Bytes</th>
                              <th>Sent</th>
                              <th>Grp</th>
                              <th>All</th>
                              <th>URL</th>
                              <th>Latency</th>
                              <th>Idle</th>
                              <th>Connect</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(showOnlyFail ? jtlItems.filter((x) => x.isFail) : jtlItems).map((row, idx) => {
                              const ts = new Date(row.timeStamp).toISOString()
                              const failClass = row.isFail ? 'text-rose-700 font-medium' : 'text-gray-800'
                              return (
                                <tr key={`${row.timeStamp}-${idx}`} className="border-t border-gray-100">
                                  <td className="text-gray-500">{idx + 1}</td>
                                  <td>{ts}</td>
                                  <td>{row.elapsed} ms</td>
                                  <td>{row.label}</td>
                                  <td className={failClass}>{row.responseCode}</td>
                                  <td>{row.responseMessage}</td>
                                  <td>{row.threadName}</td>
                                  <td>{row.dataType}</td>
                                  <td>{row.success ? 'true' : 'false'}</td>
                                  <td>{row.failureMessage || 'N/A'}</td>
                                  <td>{row.bytes}</td>
                                  <td>{row.sentBytes}</td>
                                  <td>{row.grpThreads}</td>
                                  <td>{row.allThreads}</td>
                                  <td className="font-mono max-w-[360px] truncate">{row.url}</td>
                                  <td>{row.latency} ms</td>
                                  <td>{row.idleTime} ms</td>
                                  <td>{row.connect} ms</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Request Config</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500 mb-1">Headers</div>
                      <div className="space-y-1">
                        {selectedTestData.requestConfig?.headers
                          ? Object.entries(selectedTestData.requestConfig.headers).map(
                              ([k, v]) => (
                                <div key={k} className="space-y-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="text-xs text-gray-600">{k}</div>
                                    {k === 'gz_session_id' ? (
                                      <span className="text-[10px] text-gray-400">(sensitive)</span>
                                    ) : (
                                      <div className="text-xs font-mono bg-white rounded px-2 py-0.5 border border-gray-200">
                                        {String(v)}
                                      </div>
                                    )}
                                  </div>
                                  {k === 'gz_session_id' && (
                                    <textarea
                                      readOnly
                                      rows={3}
                                      className="w-full text-xs font-mono bg-white rounded-lg p-2 border border-gray-200 resize-none"
                                      value={String(v)}
                                    />
                                  )}
                                </div>
                              )
                            )
                          : <div className="text-xs text-gray-400 italic">No headers</div>}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-500 mb-1">Body</div>
                      <div className="text-xs font-mono bg-white rounded-lg p-2 border border-gray-200 overflow-x-auto">
                        {selectedTestData.requestConfig?.body
                          ? JSON.stringify(selectedTestData.requestConfig.body)
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500">Result File</div>
                    <div className="text-gray-900 mt-1 break-all">
                      {selectedTestData.resultFilePath ?? 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 md:col-span-1">
                    <div className="text-sm text-gray-500">Version (__v)</div>
                    <div className="text-gray-900 mt-1">{selectedTestData.__v ?? 'N/A'}</div>
                  </div>
                </div>

                {selectedTestData.errorMessage && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Error Message</h3>
                    <pre className="text-xs bg-rose-50 text-rose-700 rounded-xl p-3 overflow-x-auto border border-rose-200">
                      {selectedTestData.errorMessage}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {!detailLoading && !detailError && !selectedTestData && (
              <div className="py-4 text-sm text-gray-500">No data available for this test.</div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
