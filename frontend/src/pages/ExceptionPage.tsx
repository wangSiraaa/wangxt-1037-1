import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Select,
  Input,
  message,
  Descriptions,
  Modal,
  Alert,
} from 'antd';
import {
  WarningOutlined,
  EyeOutlined,
  ReloadOutlined,
  CarOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingApi } from '@/services/api';
import type { Booking, PageResult, OperationLog } from '@/types';
import { BookingStatus, BookingStatusMap, OperationType } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { Option } = Select;

const ExceptionPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');
  const { setSelectedBooking: setStoreSelectedBooking } = useAppStore();
  const navigate = useNavigate();

  const exceptionStatuses = [
    BookingStatus.OWNERSHIP_FAILED,
    BookingStatus.SECURITY_REJECTED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
    BookingStatus.PARTIAL_COMPLETED,
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      let allBookings: Booking[] = [];

      if (statusFilter === 'ALL') {
        const results = await Promise.all(
          exceptionStatuses.map((status) =>
            bookingApi.getPage({ page: 1, size: 50, status })
          )
        );
        allBookings = results.flatMap((r) => r.records);
      } else {
        const result = await bookingApi.getPage({
          page: 1,
          size: 50,
          status: statusFilter,
        });
        allBookings = result.records;
      }

      if (keyword) {
        allBookings = allBookings.filter(
          (b) =>
            b.bookingNo.includes(keyword) ||
            b.waybillNo.includes(keyword) ||
            b.plateNumber.includes(keyword)
        );
      }

      setBookings(allBookings);
    } catch (error) {
      console.error('加载异常列表失败:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, keyword]);

  const handleViewDetail = async (booking: Booking) => {
    try {
      const logsData = await bookingApi.getLogs(booking.id);
      setSelectedBooking(booking);
      setLogs(logsData);
      setDetailVisible(true);
    } catch (error) {
      console.error('获取操作日志失败:', error);
      message.error('获取详情失败');
    }
  };

  const handleViewTimeline = (booking: Booking) => {
    setStoreSelectedBooking(booking);
    navigate(`/timeline/${booking.id}`);
  };

  const getExceptionType = (status: BookingStatus) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      [BookingStatus.OWNERSHIP_FAILED]: { label: '货权审核失败', color: 'error' },
      [BookingStatus.SECURITY_REJECTED]: { label: '安保驳回', color: 'error' },
      [BookingStatus.REJECTED]: { label: '已驳回', color: 'error' },
      [BookingStatus.CANCELLED]: { label: '已取消', color: 'default' },
      [BookingStatus.EXPIRED]: { label: '已过期', color: 'default' },
      [BookingStatus.PARTIAL_COMPLETED]: { label: '部分提货', color: 'warning' },
    };
    return typeMap[status] || { label: '异常', color: 'error' };
  };

  const columns = [
    {
      title: '异常类型',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: BookingStatus) => {
        const type = getExceptionType(status);
        return <Tag color={type.color}>{type.label}</Tag>;
      },
    },
    {
      title: '预约单号',
      dataIndex: 'bookingNo',
      key: 'bookingNo',
      width: 160,
    },
    {
      title: '运单号',
      dataIndex: 'waybillNo',
      key: 'waybillNo',
      width: 140,
    },
    {
      title: '车牌号',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
      width: 120,
    },
    {
      title: '司机',
      dataIndex: 'driverName',
      key: 'driverName',
      width: 80,
    },
    {
      title: '驳回/原因',
      key: 'reason',
      width: 200,
      render: (_: any, record: Booking) => (
        <span style={{ color: '#ff4d4f' }}>
          {record.rejectReason || record.cancelReason || record.partialReason || '-'}
        </span>
      ),
    },
    {
      title: '件数',
      key: 'pieces',
      width: 100,
      render: (_: any, record: Booking) => (
        <span>
          {record.pickedPieces || 0}/{record.totalPieces || '-'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Booking) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewTimeline(record)}
          >
            时间线
          </Button>
        </Space>
      ),
    },
  ];

  const operationTypeLabels: Record<OperationType, string> = {
    [OperationType.CREATE]: '创建',
    [OperationType.SUBMIT]: '提交预约',
    [OperationType.OWNERSHIP_VERIFY]: '货权审核通过',
    [OperationType.OWNERSHIP_REJECT]: '货权审核驳回',
    [OperationType.JOIN_QUEUE]: '加入排队',
    [OperationType.LEAVE_QUEUE]: '离开排队',
    [OperationType.REQUEUE]: '重新排队',
    [OperationType.SECURITY_CHECK]: '安保检查通过',
    [OperationType.SECURITY_REJECT]: '安保检查驳回',
    [OperationType.START_PICKUP]: '开始提货',
    [OperationType.PARTIAL_DELIVERY]: '部分放货',
    [OperationType.COMPLETE_PICKUP]: '完成提货',
    [OperationType.VEHICLE_CHANGE]: '车辆变更',
    [OperationType.DRIVER_CHANGE]: '司机变更',
    [OperationType.CANCEL]: '取消预约',
    [OperationType.EXPIRE]: '预约过期',
    [OperationType.REVISE]: '修改',
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>异常处理</h2>
          <p style={{ color: '#666', margin: '8px 0 0 0' }}>
            处理货权审核失败、安保驳回、车辆变更、部分放货等异常场景
          </p>
        </div>
        <Space>
          <Select
            placeholder="异常类型"
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
          >
            <Option value="ALL">全部异常</Option>
            {exceptionStatuses.map((status) => {
              const type = getExceptionType(status);
              return (
                <Option key={status} value={status}>
                  {type.label}
                </Option>
              );
            })}
          </Select>
          <Input.Search
            placeholder="搜索预约号/运单号/车牌号"
            style={{ width: 250 }}
            onSearch={(v) => setKeyword(v)}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
        </Space>
      </div>

      {bookings.length > 0 && (
        <Alert
          message={`共 ${bookings.length} 条异常记录需要关注`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card type="inner" title="异常列表">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={bookings}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无异常记录' }}
        />
      </Card>

      <Modal
        title="异常详情"
        open={detailVisible}
        width={800}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
          </Button>,
        ]}
      >
        {selectedBooking && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="预约单号">{selectedBooking.bookingNo}</Descriptions.Item>
              <Descriptions.Item label="运单号">{selectedBooking.waybillNo}</Descriptions.Item>
              <Descriptions.Item label="车牌号">{selectedBooking.plateNumber}</Descriptions.Item>
              <Descriptions.Item label="司机">{selectedBooking.driverName}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={BookingStatusMap[selectedBooking.status].color}>
                  {BookingStatusMap[selectedBooking.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="件数">
                {selectedBooking.pickedPieces || 0}/{selectedBooking.totalPieces || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="驳回原因" span={2}>
                <span style={{ color: '#ff4d4f' }}>
                  {selectedBooking.rejectReason || selectedBooking.cancelReason || selectedBooking.partialReason || '-'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {selectedBooking.remark || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Card title="操作历史" size="small">
              <Table
                rowKey="id"
                size="small"
                dataSource={logs}
                columns={[
                  {
                    title: '操作时间',
                    dataIndex: 'operateTime',
                    key: 'operateTime',
                    width: 180,
                  },
                  {
                    title: '操作类型',
                    dataIndex: 'operationType',
                    key: 'operationType',
                    width: 120,
                    render: (type: OperationType) => operationTypeLabels[type] || type,
                  },
                  {
                    title: '操作人',
                    dataIndex: 'operatorName',
                    key: 'operatorName',
                    width: 100,
                  },
                  {
                    title: '操作角色',
                    dataIndex: 'operatorRole',
                    key: 'operatorRole',
                    width: 100,
                    render: (role: string) => {
                      const roleMap: Record<string, string> = {
                        FORWARDER: '货代',
                        WAREHOUSE: '仓库',
                        SECURITY: '安保',
                        ADMIN: '管理员',
                      };
                      return roleMap[role] || role;
                    },
                  },
                  {
                    title: '原因',
                    dataIndex: 'reason',
                    key: 'reason',
                    render: (text: string) => text || '-',
                  },
                  {
                    title: '备注',
                    dataIndex: 'remark',
                    key: 'remark',
                    render: (text: string) => text || '-',
                  },
                ]}
                pagination={false}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExceptionPage;
