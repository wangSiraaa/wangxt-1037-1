import axios from 'axios';
import type {
  Booking,
  OperationLog,
  QueueItem,
  Result,
  PageResult,
  BookingWaybillRelation,
  QueueType,
} from '@/types';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

request.interceptors.response.use(
  (response) => {
    const data = response.data as Result<any>;
    if (data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const bookingApi = {
  submit: (data: {
    waybillNo: string;
    plateNumber: string;
    driverName: string;
    driverPhone: string;
    expectedArrivalStart: string;
    expectedArrivalEnd: string;
    forwarderId?: string;
    forwarderName?: string;
    forwarderContact?: string;
    remark?: string;
  }) => request.post<any, Booking>('/booking/submit', data),

  submitMulti: (data: {
    waybillNoList: string[];
    plateNumber: string;
    driverName: string;
    driverPhone: string;
    expectedArrivalStart: string;
    expectedArrivalEnd: string;
    forwarderId?: string;
    forwarderName?: string;
    forwarderContact?: string;
    remark?: string;
  }) => request.post<any, Booking>('/booking/multi-submit', data),

  verifyOwnership: (data: {
    bookingId: number;
    pickupOrderNo: string;
    verifyPass?: boolean;
    remark?: string;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/ownership/verify', data),

  startCustomsInspect: (data: {
    bookingId: number;
    operatorId?: string;
    operatorName?: string;
    remark?: string;
  }) => request.post<any, Booking>('/booking/customs/start', data),

  processCustomsResult: (data: {
    bookingId: number;
    operatorId?: string;
    operatorName?: string;
    remark?: string;
    inspectItems?: Array<{
      relationId: number;
      passed?: boolean;
      piecesHeld?: number;
      piecesReleased?: number;
      inspectRemark?: string;
    }>;
  }) => request.post<any, Booking>('/booking/customs/result', data),

  joinQueue: (params: {
    bookingId: number;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/queue/join', null, { params }),

  triggerRecalculate: (data: {
    bookingId: number;
    triggerReason?: string;
    recalculateQueue?: boolean;
    recalculateWindow?: boolean;
    reissueVoucher?: boolean;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, any>('/booking/recalculate', data),

  securityCheck: (data: {
    bookingId: number;
    plateNumber: string;
    checkPass?: boolean;
    remark?: string;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/security/check', data),

  startPickup: (params: {
    bookingId: number;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/start', null, { params }),

  partialDelivery: (data: {
    bookingId: number;
    pickedPieces: number;
    partialReason: string;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/partial', data),

  completePickup: (params: {
    bookingId: number;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/complete', null, { params }),

  changeVehicle: (data: {
    bookingId: number;
    newPlateNumber: string;
    newDriverName?: string;
    newDriverPhone?: string;
    changeReason: string;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/vehicle/change', data),

  cancelBooking: (params: {
    bookingId: number;
    cancelReason: string;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/cancel', null, { params }),

  getDetail: (id: number) => request.get<any, Booking>(`/booking/${id}`),

  getWaybillRelations: (id: number) =>
    request.get<any, BookingWaybillRelation[]>(`/booking/${id}/waybills`),

  getLogs: (id: number) => request.get<any, OperationLog[]>(`/booking/${id}/logs`),

  getPage: (params: {
    page?: number;
    size?: number;
    status?: string;
    keyword?: string;
  }) => request.get<any, PageResult<Booking>>('/booking/page', { params }),

  getQueueList: () => request.get<any, QueueItem[]>('/booking/queue/list'),

  getQueueListByType: (type: QueueType) =>
    request.get<any, QueueItem[]>(`/booking/queue/by-type/${type}`),

  getQueuePosition: (bookingId: number) =>
    request.get<any, number>('/booking/queue/position', { params: { bookingId } }),
};

export const initApi = {
  initData: () => request.post<any, string>('/init/data'),
  getWaybills: () => request.get<any, any[]>('/init/waybills'),
  getVehicles: () => request.get<any, any[]>('/init/vehicles'),
};
