export enum BookingStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  OWNERSHIP_VERIFIED = 'OWNERSHIP_VERIFIED',
  OWNERSHIP_FAILED = 'OWNERSHIP_FAILED',
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

export enum OperationType {
  CREATE = 'CREATE',
  SUBMIT = 'SUBMIT',
  OWNERSHIP_VERIFY = 'OWNERSHIP_VERIFY',
  OWNERSHIP_REJECT = 'OWNERSHIP_REJECT',
  JOIN_QUEUE = 'JOIN_QUEUE',
  LEAVE_QUEUE = 'LEAVE_QUEUE',
  REQUEUE = 'REQUEUE',
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
