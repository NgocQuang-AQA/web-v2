import type { ReactNode } from 'react'
import Topbar from './Topbar'
import GlobalAlert from './GlobalAlert'

type Props = { sidebar: ReactNode; children: ReactNode }

export default function AppLayout({ sidebar, children }: Props) {
  return (
    <div className="min-h-screen w-full bg-base">
      <div className="w-full grid grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] gap-3 md:gap-4 lg:gap-6 p-2 md:p-4 lg:p-6">
        <aside className="h-full">{sidebar}</aside>
        <main className="h-full">
          <Topbar />
          <GlobalAlert />
          {children}
        </main>
      </div>
    </div>
  )
}
