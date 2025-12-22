import type { Env, TabKey } from '../models/helperVoc'
import flagVietnam from '../assets/svg/flag/flag-vietnam.svg'
import flagKorea from '../assets/svg/flag/flag-korea.svg'
import flagUnitedStates from '../assets/svg/flag/flag-united-states.svg'
import flagJapan from '../assets/svg/flag/flag-japan.svg'
import flagChina from '../assets/svg/flag/flag-china.svg'
import flagTaiwan from '../assets/svg/flag/flag-taiwan.svg'
import flagThailand from '../assets/svg/flag/flag-thailand.svg'
import flagSingapore from '../assets/svg/flag/flag-singapore.svg'
import flagIndonesia from '../assets/svg/flag/flag-indonesia.svg'
import flagHongkong from '../assets/svg/flag/flag-hongkong.svg'
import flagAustralia from '../assets/svg/flag/flag-australia.svg'
import flagUnitedKingdom from '../assets/svg/flag/flag-united-kingdom.svg'
import flagGermany from '../assets/svg/flag/flag-germany.svg'
import flagFrance from '../assets/svg/flag/flag-france.svg'
import flagRussia from '../assets/svg/flag/flag-russia.svg'
import flagCanada from '../assets/svg/flag/flag-canada.svg'
import flagEtc from '../assets/svg/flag/flag-etc.svg'

export const envBase: Record<Env, string> = {
  DEV: 'https://dev-gvs-api.ggl-spazon.com',
  QA: 'https://qa-gvs-api.ggl-spazon.com',
  LIVE: 'https://gvs-api.golfzon.com'
}

export const flagByCode: Record<string, string> = {
  VNM: flagVietnam,
  KOR: flagKorea,
  USA: flagUnitedStates,
  JPN: flagJapan,
  CHN: flagChina,
  TWN: flagTaiwan,
  THA: flagThailand,
  SGP: flagSingapore,
  IDN: flagIndonesia,
  HKG: flagHongkong,
  AUS: flagAustralia,
  GBR: flagUnitedKingdom,
  DEU: flagGermany,
  FRA: flagFrance,
  RUS: flagRussia,
  CAN: flagCanada
}

export const modeNameMap: Record<number, string> = {
  0: 'common option',
  10: 'driving center',
  11: 'shot&swing',
  12: 'approach  hole cub',
  13: 'approach bagic',
  14: 'putting hole cub',
  15: 'putting bagic',
  16: 'bagic practice',
  17: 'slope practice',
  18: 'tempo practice',
  20: 'Course practice',
  21: 'actual practice',
  22: 'Tee shot',
  23: 'Near pin',
  24: 'Putting',
  25: 'GIR-Practice',
  26: 'Premium -Practice',
  27: 'Practice-Round',
  30: 'challenge',
  31: 'tee shot',
  32: 'pitch shot',
  33: 'chip shot',
  34: 'Longest',
  40: 'level test',
  41: 'shot analysis',
  42: 'Skill test',
  50: 'fitting mode',
  80: 'Shot Research',
  81: 'Shot Analysis',
  82: 'Round Analysis',
  84: 'PGM',
  90: 'ETC',
  91: 'club diagnosis',
  92: 'draw practice',
  93: 'fade practice',
  94: 'HiShot practice',
  95: 'LowShot practice',
  96: '(old) field practice',
  100: 'Round Mode',
  101: 'SelfAssessment_9hole',
  102: '18hole_Round',
  110: 'General Practice',
  111: 'General Practice Driving Range',
  112: 'General Practice Approach HoleCup',
  113: 'General Practice Approach Baisc',
  114: 'General Practice Putting HoleCup',
  115: 'General Practice Putting Basic',
  120: 'Challenge',
  121: 'ReMax Long Drive Mode',
  122: 'Straight Drive Mode',
  123: 'Chipping Genius',
  124: 'Wedge Wizard',
  130: 'GDR Pro/Max Drving_Ragne',
  131: 'GDR Pro/Max LongGame',
  132: 'GDR Pro/Max Approach HoleCup',
  133: 'GDR Pro/Max Putting HoleCup',
  134: 'training center',
  135: 'field practice & lesson',
  136: 'Focus Field practice'
}

export const highlightModeIds = new Set<number>([11, 12, 13, 27, 131, 132, 133, 134, 135])

export const softwareNameMap: Record<number, string> = {
  0: 'DEV',
  2: 'REAL',
  4: 'VISION Plus',
  5: 'TWOVISION',
  6: 'NX',
  3: 'GDR'
}

export const difficultyNameMap: Record<number, string> = {
  1: 'Pro',
  0: 'Amateur',
  2: 'Beginner',
  3: 'Tour'
}

export const unitModeNameMap: Record<number, string> = {
  0: 'STROKE',
  1: 'MATCH',
  2: 'SKINS',
  6: 'DRIVING RANGE',
  7: 'STABLE_FORD',
  8: 'NEW_PERIO',
  9: 'LAS_VEGAS',
  10: 'SCRAMBLE',
  11: 'CHIP_AND_PUT',
  12: 'ANALYSIS_ROOM',
  14: 'PAR3_CHALLENGE',
  15: 'CTTP',
  16: 'LONGEST'
}

export const tabsPreview: { key: TabKey; label: string; path: string }[] = [
  { key: 'gdr', label: 'GDR', path: '/v1/helper/gdr' },
  { key: 'gs', label: 'GS', path: '/v1/helper/gs' },
  { key: 'practice', label: 'My Practice', path: '/v1/helper/my-practice' },
  { key: 'nasmo_gdr', label: 'Nasmo GDR', path: '/v1/helper/gdr-nasmo' },
  { key: 'nasmo_gs', label: 'Nasmo GS', path: '/v1/helper/gdr-nasmo' }
]

export const tabsReport: { key: TabKey; label: string; path: string }[] = [
  { key: 'monthly', label: 'Monthly Report', path: '/v1/helper/user/monthly-report' },
  { key: 'weekly', label: 'Weekly Report', path: '/v1/helper/user/weekly-report' },
  { key: 'preview', label: 'Report Preview', path: '/v1/helper/hole/report' },
  { key: 'tour', label: 'Tour Report', path: '/v1/helper/hole/tour-report' }
]

export const flagEtcSrc = flagEtc
