export type Env = 'DEV' | 'QA' | 'LIVE'
export type TabKey =
  | 'gdr'
  | 'gs'
  | 'practice'
  | 'nasmo_gdr'
  | 'nasmo_gs'
  | 'monthly'
  | 'weekly'
  | 'preview'
  | 'tour'
export type VocUser = {
  userNo: number
  userId: string
  userNickname: string
  countryCd: string
}
