export enum BookingStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  OWNERSHIP_VERIFIED = 'OWNERSHIP_VERIFIED',
  OWNERSHIP_FAILED = 'OWNERSHIP_FAILED',
  CUSTOMS_PENDING = 'CUSTOMS_PENDING',
  CUSTOMS_INSPECTING = 'CUSTOMS_INSPECTING',
  CUSTOMS_PASSED = 'CUSTOMS_PASSED',
  PARTIAL_RELEASED = 'PARTIAL_RELEASED',
  QUEUED = 'QUEUED',
  QUEUE_CANCELLED = 'QUEUE_CANCELLED',
  SECURITY_CHECKED = 'SECURITY_CHECKED',
  SECURITY_REJECTED = 'SECURITY_REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PARTIAL_COMPLETED = 'PARTIAL_COMPLETED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const BookingStatusMap: Record<BookingStatus, { label: string; color: string }> = {
  [BookingStatus.DRAFT]: { label: '草稿', color: 'default' },
  [BookingStatus.SUBMITTED]: { label: '待货权确认', color: 'processing' },
  [BookingStatus.OWNERSHIP_VERIFIED]: { label: '货权已确认', color: 'success' },
  [BookingStatus.OWNERSHIP_FAILED]: { label: '货权审核失败', color: 'error' },
  [BookingStatus.CUSTOMS_PENDING]: { label: '待海关查验', color: 'warning' },
  [BookingStatus.CUSTOMS_INSPECTING]: { label: '查验中', color: 'processing' },
  [BookingStatus.CUSTOMS_PASSED]: { label: '查验通过', color: 'success' },
  [BookingStatus.PARTIAL_RELEASED]: { label: '部分放行', color: 'warning' },
  [BookingStatus.QUEUED]: { label: '排队中', color: 'processing' },
  [BookingStatus.QUEUE_CANCELLED]: { label: '排队已取消', color: 'warning' },
  [BookingStatus.SECURITY_CHECKED]: { label: '安保已放行', color: 'success' },
  [BookingStatus.SECURITY_REJECTED]: { label: '安保驳回', color: 'error' },
  [BookingStatus.IN_PROGRESS]: { label: '提货中', color: 'processing' },
  [BookingStatus.PARTIAL_COMPLETED]: { label: '部分提货完成', color: 'warning' },
  [BookingStatus.COMPLETED]: { label: '提货完成', color: 'success' },
  [BookingStatus.REJECTED]: { label: '已驳回', color: 'error' },
  [BookingStatus.CANCELLED]: { label: '已取消', color: 'default' },
  [BookingStatus.EXPIRED]: { label: '已过期', color: 'default' },
};

export enum QueueType {
  NORMAL = 'NORMAL',
  COLD_CHAIN = 'COLD_CHAIN',
  CUSTOMS = 'CUSTOMS',
}

export const QueueTypeMap: Record<QueueType, { label: string; color: string; prefix: string }> = {
  [QueueType.NORMAL]: { label: '普通月台', color: 'blue', prefix: 'QN' },
  [QueueType.COLD_CHAIN]: { label: '冷链月台(优先)', color: 'cyan', prefix: 'QC' },
  [QueueType.CUSTOMS]: { label: '海关查验区', color: 'gold', prefix: 'QS' },
};

export enum MixStatus {
  ALL_CLEAR = 'ALL_CLEAR',
  PARTIAL_HOLD = 'PARTIAL_HOLD',
  ALL_HOLD = 'ALL_HOLD',
}

export const MixStatusMap: Record<MixStatus, {
  label: string;
  color: string;
  level: number;
  canEnter: boolean;
  needReject: boolean;
  tip: string;
}> = {
  [MixStatus.ALL_CLEAR]: {
    label: '全部放行',
    color: 'success',
    level: 0,
    canEnter: true,
    needReject: false,
    tip: '全部货物查验通过，可进场',
  },
  [MixStatus.PARTIAL_HOLD]: {
    label: '部分暂扣',
    color: 'warning',
    level: 1,
    canEnter: true,
    needReject: false,
    tip: '部分货物被海关暂扣，其余可进场，需重新计算',
  },
  [MixStatus.ALL_HOLD]: {
    label: '全部暂扣',
    color: 'error',
    level: 2,
    canEnter: false,
    needReject: true,
    tip: '全部货物被海关暂扣，请退回重约',
  },
};

export enum WaybillStatusInBooking {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',
  PARTIALLY_PICKED = 'PARTIALLY_PICKED',
  FULLY_PICKED = 'FULLY_PICKED',
  RELEASED = 'RELEASED',
}

export const WaybillStatusMap: Record<WaybillStatusInBooking, { label: string; color: string }> = {
  [WaybillStatusInBooking.PENDING]: { label: '待处理', color: 'default' },
  [WaybillStatusInBooking.CLEARED]: { label: '已放行', color: 'success' },
  [WaybillStatusInBooking.CUSTOMS_HOLD]: { label: '海关暂扣', color: 'error' },
  [WaybillStatusInBooking.PARTIALLY_PICKED]: { label: '部分提货', color: 'warning' },
  [WaybillStatusInBooking.FULLY_PICKED]: { label: '提货完成', color: 'success' },
  [WaybillStatusInBooking.RELEASED]: { label: '已放行', color: 'success' },
};

export enum ReleaseVoucherStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  REISSUED = 'REISSUED',
}

export enum OperationType {
  CREATE = 'CREATE',
  SUBMIT = 'SUBMIT',
  OWNERSHIP_VERIFY = 'OWNERSHIP_VERIFY',
  OWNERSHIP_REJECT = 'OWNERSHIP_REJECT',
  CUSTOMS_DRAW = 'CUSTOMS_DRAW',
  CUSTOMS_INSPECT = 'CUSTOMS_INSPECT',
  CUSTOMS_PASS = 'CUSTOMS_PASS',
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',
  PARTIAL_RELEASE = 'PARTIAL_RELEASE',
  JOIN_QUEUE = 'JOIN_QUEUE',
  LEAVE_QUEUE = 'LEAVE_QUEUE',
  REQUEUE = 'REQUEUE',
  QUEUE_RECALCULATE = 'QUEUE_RECALCULATE',
  WINDOW_RECALCULATE = 'WINDOW_RECALCULATE',
  VOUCHER_REISSUE = 'VOUCHER_REISSUE',
  SECURITY_CHECK = 'SECURITY_CHECK',
  SECURITY_REJECT = 'SECURITY_REJECT',
  START_PICKUP = 'START_PICKUP',
  PARTIAL_DELIVERY = 'PARTIAL_DELIVERY',
  COMPLETE_PICKUP = 'COMPLETE_PICKUP',
  VEHICLE_CHANGE = 'VEHICLE_CHANGE',
  DRIVER_CHANGE = 'DRIVER_CHANGE',
  CANCEL = 'CANCEL',
  EXPIRE = 'EXPIRE',
  REVISE = 'REVISE',
}

export interface BookingWaybillRelation {
  id: number;
  bookingId: number;
  bookingNo: string;
  waybillId: number;
  waybillNo: string;
  waybillStatus: WaybillStatusInBooking;
  customsInspected?: boolean;
  customsInspectResult?: string;
  piecesHeld?: number;
  piecesReleased?: number;
  piecesPicked?: number;
  totalPieces?: number;
  temperatureControlled?: boolean;
}

export interface Booking {
  id: number;
  bookingNo: string;
  forwarderId?: string;
  forwarderName?: string;
  forwarderContact?: string;
  waybillId: string;
  waybillNo: string;
  vehicleId?: string;
  plateNumber: string;
  driverId?: string;
  driverName: string;
  driverPhone: string;
  expectedArrivalStart: string;
  expectedArrivalEnd: string;
  actualArrivalTime?: string;
  queuePosition?: number;
  queueId?: string;
  status: BookingStatus;
  pickupOrderNo?: string;
  ownershipVerified?: boolean;
  ownershipOperator?: string;
  ownershipTime?: string;
  ownershipRemark?: string;
  securityChecked?: boolean;
  securityOperator?: string;
  securityTime?: string;
  securityRemark?: string;
  startTime?: string;
  startOperator?: string;
  completeTime?: string;
  completeOperator?: string;
  totalPieces?: number;
  pickedPieces?: number;
  partialDelivery?: boolean;
  partialReason?: string;
  rejectReason?: string;
  cancelReason?: string;
  platformNo?: string;
  remark?: string;
  version: number;
  createTime: string;
  updateTime: string;
  waybillCount?: number;
  hasColdChain?: boolean;
  hasCustomsHold?: boolean;
  mixStatus?: MixStatus;
  queueType?: QueueType;
  releaseVoucherNo?: string;
  releaseVoucherStatus?: ReleaseVoucherStatus;
  waybillRelations?: BookingWaybillRelation[];
}

export interface OperationLog {
  id: number;
  bookingId: number;
  bookingNo: string;
  operationType: OperationType;
  fromStatus?: BookingStatus;
  toStatus?: BookingStatus;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
  operateTime: string;
  operateIp?: string;
  remark?: string;
  reason?: string;
  beforeData?: string;
  afterData?: string;
}

export interface QueueItem {
  id: number;
  queueCode: string;
  bookingId: number;
  bookingNo: string;
  plateNumber: string;
  driverName: string;
  position: number;
  priority: number;
  joinTime: string;
  leaveTime?: string;
  leaveReason?: string;
  requeueCount: number;
  estimatedCallTime?: string;
  status: string;
  queueType?: QueueType;
  estimatedArrivalWindowStart?: string;
  estimatedArrivalWindowEnd?: string;
}

export interface Result<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}
