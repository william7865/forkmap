// components/icons/index.tsx
// Lucide React icons — consistent size/stroke across the app
import type { LucideProps } from 'lucide-react'
import {
  Search,
  X,
  SlidersHorizontal,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Star,
  Share2,
  Pencil,
  CheckSquare,
  Phone,
  Globe,
  Clock,
  ArrowRight,
  Route,
  Utensils,
  Bike,
  Car,
  Footprints,
  Bookmark,
  Map,
  Navigation,
  Settings,
  User,
  BookMarked,
  BarChart2,
  LogOut,
  MoreHorizontal,
  Plus,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Check,
  AlertCircle,
} from 'lucide-react'

const DEFAULTS: Partial<LucideProps> = { size: 16, strokeWidth: 1.75 }

// Wrappers nommés — gardent les anciens noms d'imports pour compatibilité
export const IcoSearch = (p: LucideProps) => <Search {...DEFAULTS} {...p} />
export const IcoX = (p: LucideProps) => <X {...DEFAULTS} size={14} {...p} />
export const IcoSliders = (p: LucideProps) => <SlidersHorizontal {...DEFAULTS} {...p} />
export const IcoMapPin = (p: LucideProps) => <MapPin {...DEFAULTS} {...p} />
export const IcoChevLeft = (p: LucideProps) => <ChevronLeft {...DEFAULTS} size={14} {...p} />
export const IcoChevRight = (p: LucideProps) => <ChevronRight {...DEFAULTS} size={14} {...p} />
export const IcoChevUp = (p: LucideProps) => <ChevronUp {...DEFAULTS} size={14} {...p} />
export const IcoChevDown = (p: LucideProps) => <ChevronDown {...DEFAULTS} size={14} {...p} />
export const IcoStar = (p: LucideProps) => (
  <Star {...DEFAULTS} size={11} fill="currentColor" strokeWidth={0} {...p} />
)
export const IcoShare = (p: LucideProps) => <Share2 {...DEFAULTS} {...p} />
export const IcoPen = (p: LucideProps) => <Pencil {...DEFAULTS} {...p} />
export const IcoVisit = (p: LucideProps) => <CheckSquare {...DEFAULTS} {...p} />
export const IcoPhone = (p: LucideProps) => <Phone {...DEFAULTS} size={14} {...p} />
export const IcoGlobe = (p: LucideProps) => <Globe {...DEFAULTS} size={14} {...p} />
export const IcoClock = (p: LucideProps) => <Clock {...DEFAULTS} size={13} {...p} />
export const IcoArrow = (p: LucideProps) => <ArrowRight {...DEFAULTS} size={13} {...p} />
export const IcoRoute = (p: LucideProps) => <Route {...DEFAULTS} size={14} {...p} />
export const IcoFork = (p: LucideProps) => <Utensils {...DEFAULTS} size={36} {...p} />
export const IcoPin = (p: LucideProps) => <MapPin {...DEFAULTS} size={13} {...p} />
export const IcoMap = (p: LucideProps) => <Map {...DEFAULTS} size={13} {...p} />
export const IcoWalk = (p: LucideProps) => <Footprints {...DEFAULTS} size={15} {...p} />
export const IcoBike = (p: LucideProps) => <Bike {...DEFAULTS} size={15} {...p} />
export const IcoCar = (p: LucideProps) => <Car {...DEFAULTS} size={15} {...p} />
export const IcoHeart = (p: LucideProps) => <Bookmark {...DEFAULTS} size={15} {...p} />
export const IcoNavigation = (p: LucideProps) => <Navigation {...DEFAULTS} size={18} {...p} />
export const IcoSettings = (p: LucideProps) => <Settings {...DEFAULTS} size={18} {...p} />
export const IcoUser = (p: LucideProps) => <User {...DEFAULTS} size={18} {...p} />
export const IcoBookmarks = (p: LucideProps) => <BookMarked {...DEFAULTS} size={18} {...p} />
export const IcoStats = (p: LucideProps) => <BarChart2 {...DEFAULTS} size={18} {...p} />
export const IcoLogOut = (p: LucideProps) => <LogOut {...DEFAULTS} size={15} {...p} />
export const IcoMore = (p: LucideProps) => <MoreHorizontal {...DEFAULTS} size={20} {...p} />
export const IcoPlus = (p: LucideProps) => <Plus {...DEFAULTS} size={16} {...p} />
export const IcoTrash = (p: LucideProps) => <Trash2 {...DEFAULTS} size={15} {...p} />
export const IcoExternal = (p: LucideProps) => <ExternalLink {...DEFAULTS} size={13} {...p} />
export const IcoCheck = (p: LucideProps) => <Check {...DEFAULTS} size={14} {...p} />
export const IcoAlert = (p: LucideProps) => <AlertCircle {...DEFAULTS} size={14} {...p} />
