import axios from 'axios';
import type { Booking, OperationLog, QueueItem, Result, PageResult } from '@/types';

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

  verifyOwnership: (data: {
    bookingId: number;
    pickupOrderNo: string;
    verifyPass?: boolean;
    remark?: string;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/ownership/verify', data),

  joinQueue: (params: {
    bookingId: number;
    operatorId?: string;
    operatorName?: string;
  }) => request.post<any, Booking>('/booking/queue/join', null, { params }),

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

  getLogs: (id: number) => request.get<any, OperationLog[]>(`/booking/${id}/logs`),

  getPage: (params: {
    page?: number;
    size?: number;
    status?: string;
    keyword?: string;
  }) => request.get<any, PageResult<Booking>>('/booking/page', { params }),

  getQueueList: () => request.get<any, QueueItem[]>('/booking/queue/list'),

  getQueuePosition: (bookingId: number) =>
    request.get<any, number>('/booking/queue/position', { params: { bookingId } }),
};

export const initApi = {
  initData: () => request.post<any, string>('/init/data'),
  getWaybills: () => request.get<any, any[]>('/init/waybills'),
  getVehicles: () => request.get<any, any[]>('/init/vehicles'),
};
