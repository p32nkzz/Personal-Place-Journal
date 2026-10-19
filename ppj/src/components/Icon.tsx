import { config } from "@fortawesome/fontawesome-svg-core";
import {
  faAngleLeft,
  faAngleRight,
  faAnglesLeft,
  faAnglesRight,
  faArrowLeft,
  faArrowRight,
  faArrowUpFromBracket,
  faBars,
  faBook,
  faBuildingColumns,
  faBoxArchive,
  faCalendarDays,
  faChevronDown,
  faChevronUp,
  faCircle,
  faCheck,
  faCircleCheck,
  faCircleInfo,
  faCircleXmark,
  faClock,
  faClockRotateLeft,
  faCloudArrowDown,
  faCopy,
  faDatabase,
  faEye,
  faEyeSlash,
  faFloppyDisk,
  faGauge,
  faGear,
  faImage,
  faKey,
  faLink,
  faLocationDot,
  faMagnifyingGlass,
  faMap,
  faMapLocationDot,
  faPalette,
  faPen,
  faPlus,
  faRightFromBracket,
  faRoute,
  faRotate,
  faShieldHalved,
  faSort,
  faSortDown,
  faSortUp,
  faStar,
  faTags,
  faTrash,
  faTriangleExclamation,
  faUser,
  faUserGear,
  faUsers,
  faXmark,
  faClipboardCheck,
  faLayerGroup,
  faLanguage,
  faDownload,
  faRepeat,
  faLinkSlash,
  faCamera,
  faSatellite,
  faCircleDot,
  faThumbtack,
  faStreetView,
  faEnvelope,
  faRotateLeft,
  faFilter,
  faLocationCrosshairs,
} from "@fortawesome/free-solid-svg-icons";
import { faCircle as faCircleRegular, faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type ComponentProps } from "react";

// CSS Font Awesome diimpor sekali di layout; cegah injeksi CSS otomatis ganda.
config.autoAddCss = false;

const ICONS = {
  "angle-left": faAngleLeft,
  "angle-right": faAngleRight,
  "angles-left": faAnglesLeft,
  "angles-right": faAnglesRight,
  "arrow-left": faArrowLeft,
  "arrow-right": faArrowRight,
  upload: faArrowUpFromBracket,
  download: faDownload,
  bars: faBars,
  book: faBook,
  box: faBoxArchive,
  calendar: faCalendarDays,
  "chevron-down": faChevronDown,
  "chevron-up": faChevronUp,
  circle: faCircle,
  "circle-regular": faCircleRegular,
  "circle-dot": faCircleDot,
  "circle-check": faCircleCheck,
  "circle-info": faCircleInfo,
  "circle-xmark": faCircleXmark,
  history: faClockRotateLeft,
  cloud: faCloudArrowDown,
  copy: faCopy,
  database: faDatabase,
  eye: faEye,
  "eye-slash": faEyeSlash,
  save: faFloppyDisk,
  gauge: faGauge,
  gear: faGear,
  image: faImage,
  key: faKey,
  link: faLink,
  unlink: faLinkSlash,
  pin: faLocationDot,
  thumbtack: faThumbtack,
  "street-view": faStreetView,
  filter: faFilter,
  crosshairs: faLocationCrosshairs,
  envelope: faEnvelope,
  restore: faRotateLeft,
  search: faMagnifyingGlass,
  map: faMap,
  "map-pin": faMapLocationDot,
  palette: faPalette,
  pen: faPen,
  plus: faPlus,
  logout: faRightFromBracket,
  route: faRoute,
  refresh: faRotate,
  repeat: faRepeat,
  shield: faShieldHalved,
  sort: faSort,
  "sort-down": faSortDown,
  "sort-up": faSortUp,
  star: faStar,
  "star-regular": faStarRegular,
  tags: faTags,
  trash: faTrash,
  warning: faTriangleExclamation,
  user: faUser,
  "user-gear": faUserGear,
  users: faUsers,
  xmark: faXmark,
  clipboard: faClipboardCheck,
  layers: faLayerGroup,
  language: faLanguage,
  camera: faCamera,
  landmark: faBuildingColumns,
  clock: faClock,
  check: faCheck,
  satellite: faSatellite,
} as const;

export type IconName = keyof typeof ICONS;

/** Ikon Font Awesome (dekoratif secara default; beri `title` bila berdiri sendiri). */
export function Icon({
  name,
  fixedWidth = true,
  spin,
  className,
  style,
  title,
}: {
  name: IconName;
  fixedWidth?: boolean;
  spin?: boolean;
  className?: string;
  style?: ComponentProps<typeof FontAwesomeIcon>["style"];
  title?: string;
}) {
  return (
    <FontAwesomeIcon
      icon={ICONS[name]}
      fixedWidth={fixedWidth}
      spin={spin}
      className={className}
      style={style}
      title={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export { ICONS };
