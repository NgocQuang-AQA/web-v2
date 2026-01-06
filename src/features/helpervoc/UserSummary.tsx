import type { VocUser } from '../../models/helperVoc'
import iconCopy from '../../assets/svg/icon-copy.svg'

type Props = {
  user: VocUser
  flagSrc: string
  onCopy: () => void
}

export default function UserSummary({ user, flagSrc, onCopy }: Props) {
  return (
    <div className="mb-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="flex items=center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={flagSrc}
            alt="flag"
            className="w-5 h-5 rounded-full ring-1 ring-gray-200"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">User No</div>
              <span className="text-gray-300">•</span>
              <div className="text-sm text-gray-900">{user.userNo}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">User Id</div>
              <span className="text-gray-300">•</span>
              <div className="text-sm text-gray-900">{user.userId}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">Nick Name</div>
              <span className="text-gray-300">•</span>
              <div className="text-sm text-gray-900 truncate max-w-[180px] md:max-w-[220px]">
                {user.userNickname}
              </div>
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={onCopy}
          aria-label="Copy gzsession"
          title="Copy"
        >
          <img src={iconCopy} alt="" className="w-4 h-4" />
          <span className="font-medium">{`/gzsession ${user.userNo} ${user.userId} ${user.countryCd}`}</span>
        </button>
      </div>
    </div>
  )
}
