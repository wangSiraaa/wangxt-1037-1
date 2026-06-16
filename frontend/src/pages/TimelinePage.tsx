import React, { useEffect, useState } from 'react';
import {
  Card,
  Timeline,
  Tag,
  Select,
  Input,
  Button,
  Space,
  Descriptions,
  Modal,
  Empty,
  Spin,
  Typography,
  Alert,
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  UserOutlined,
  SafetyOutlined,
  WarningOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { bookingApi } from '@/services/api';
import type { Booking, OperationLog } from '@/types';
import { BookingStatus, BookingStatusMap, OperationType } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { Title, Text } = Typography;
const { Option } = Select;

const TimelinePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchResult, setSearchResult] = useState<Booking[]>([]);
  const { id } = useParams<{ id?: string }>();
  const { selectedBooking, setSelectedBooking } = useAppStore();

  const loadData = async (bookingId?: number) => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const [bookingData, logsData] = await Promise.all([
        bookingApi.getDetail(bookingId),
        bookingApi.getLogs(bookingId),
      ]);
      setBooking(bookingData);
      setLogs(logsData);
      setSelectedBooking(bookingData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData(parseInt(id, 10));
    } else if (selectedBooking) {
      loadData(selectedBooking.id);
    }
  }, [id, selectedBooking]);

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    try {
      const result = await bookingApi.getPage({
        page: 1,
        size: 20,
        keyword: searchKeyword,
      });
      setSearchResult(result.records);
      setSearchVisible(true);
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  const handleSelectBooking = (b: Booking) => {
    setSearchVisible(false);
    setSearchKeyword('');
    loadData(b.id);
  };

  const operationTypeMap: Record<OperationType, { label: string; color: string; icon: React.ReactNode }> = {
    [OperationType.CREATE]: { label: '创建预约', color: 'blue', icon: <ClockCircleOutlined /> },
    [OperationType.SUBMIT]: { label: '提交预约', color: 'blue', icon: <CarOutlined /> },
    [OperationType.OWNERSHIP_VERIFY]: { label: '货权审核通过', color: 'green', icon: <CheckCircleOutlined /> },
    [OperationType.OWNERSHIP_REJECT]: { label: '货权审核驳回', color: 'red', icon: <CloseCircleOutlined /> },
    [OperationType.JOIN_QUEUE]: { label: '加入排队', color: 'blue', icon: <ClockCircleOutlined /> },
    [OperationType.LEAVE_QUEUE]: { label: '离开排队', color: 'orange', icon: <CarOutlined /> },
    [OperationType.REQUEUE]: { label: '重新排队', color: 'orange', icon: <ClockCircleOutlined /> },
    [OperationType.SECURITY_CHECK]: { label: '安保检查通过', color: 'green', icon: <SafetyOutlined /> },
    [OperationType.SECURITY_REJECT]: { label: '安保检查驳回', color: 'red', icon: <CloseCircleOutlined /> },
    [OperationType.START_PICKUP]: { label: '开始提货', color: 'blue', icon: <CarOutlined /> },
    [OperationType.PARTIAL_DELIVERY]: { label: '部分放货', color: 'orange', icon: <WarningOutlined /> },
    [OperationType.COMPLETE_PICKUP]: { label: '完成提货', color: 'green', icon: <CheckCircleOutlined /> },
    [OperationType.VEHICLE_CHANGE]: { label: '车辆变更', color: 'orange', icon: <CarOutlined /> },
    [OperationType.DRIVER_CHANGE]: { label: '司机变更', color: 'orange', icon: <UserOutlined /> },
    [OperationType.CANCEL]: { label: '取消预约', color: 'red', icon: <CloseCircleOutlined /> },
    [OperationType.EXPIRE]: { label: '预约过期', color: 'red', icon: <ClockCircleOutlined /> },
    [OperationType.REVISE]: { label: '修改预约', color: 'orange', icon: <WarningOutlined /> },
  };

  const roleMap: Record<string, string> = {
    FORWARDER: '货代',
    WAREHOUSE: '仓库',
    SECURITY: '安保',
    ADMIN: '管理员',
  };

  const getStatusColor = (status: BookingStatus) => {
    const colorMap: Record<string, string> = {
      COMPLETED: '#52c41a',
      OWNERSHIP_VERIFIED: '#52c41a',
      SECURITY_CHECKED: '#52c41a',
      IN_PROGRESS: '#1890ff',
      QUEUED: '#1890ff',
      SUBMITTED: '#faad14',
      PARTIAL_COMPLETED: '#faad14',
      OWNERSHIP_FAILED: '#ff4d4f',
      SECURITY_REJECTED: '#ff4d4f',
      CANCELLED: '#8c8c8c',
      EXPIRED: '#8c8c8c',
    };
    return colorMap[status] || '#8c8c8c';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!booking && !id && !selectedBooking) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>状态时间线</h2>
          <p style={{ color: '#666', margin: '8px 0 0 0' }}>
            查看预约单的完整状态流转历史和操作记录
          </p>
        </div>

        <Alert
          message="请先选择一个预约单查看时间线"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Card>
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Input
              placeholder="输入预约号/运单号/车牌号搜索"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: '80%' }}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
          </Space.Compact>

          {searchVisible && searchResult.length > 0 && (
            <div>
              <Title level={5}>搜索结果：</Title>
              {searchResult.map((b) => (
                <Card
                  key={b.id}
                  size="small"
                  style={{ marginBottom: 8, cursor: 'pointer' }}
                  onClick={() => handleSelectBooking(b)}
                  hoverable
                >
                  <Space>
                    <span><strong>预约单号：</strong>{b.bookingNo}</span>
                    <span><strong>运单号：</strong>{b.waybillNo}</span>
                    <span><strong>车牌号：</strong>{b.plateNumber}</span>
                    <Tag color={BookingStatusMap[b.status].color}>
                      {BookingStatusMap[b.status].label}
                    </Tag>
                  </Space>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>状态时间线</h2>
          <p style={{ color: '#666', margin: '8px 0 0 0' }}>
            完整的状态流转历史和操作记录，可追溯每一次操作和处理人
          </p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => booking && loadData(booking.id)}>
            刷新
          </Button>
          <Button onClick={() => {
            setBooking(null);
            setLogs([]);
          }}>
            重新选择
          </Button>
        </Space>
      </div>

      {booking && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Descriptions column={3} bordered size="small">
              <Descriptions.Item label="预约单号">{booking.bookingNo}</Descriptions.Item>
              <Descriptions.Item label="运单号">{booking.waybillNo}</Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={getStatusColor(booking.status)} style={{ fontSize: 14 }}>
                  {BookingStatusMap[booking.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="车牌号">{booking.plateNumber}</Descriptions.Item>
              <Descriptions.Item label="司机">{booking.driverName}</Descriptions.Item>
              <Descriptions.Item label="件数">
                {booking.pickedPieces || 0}/{booking.totalPieces || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="货代">{booking.forwarderName}</Descriptions.Item>
              <Descriptions.Item label="预计到场" span={2}>
                {booking.expectedArrivalStart} ~ {booking.expectedArrivalEnd}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="状态流转时间线">
            <Timeline
              mode="left"
              style={{ padding: '20px 0' }}
              items={logs
                .slice()
                .reverse()
                .map((log, index) => {
                  const typeInfo = operationTypeMap[log.operationType] || {
                    label: log.operationType,
                    color: 'blue',
                    icon: <ClockCircleOutlined />,
                  };

                  return {
                    color: typeInfo.color,
                    dot: typeInfo.icon,
                    label: (
                      <div style={{ color: '#999', fontSize: 12 }}>
                        {log.operateTime}
                      </div>
                    ),
                    children: (
                      <Card size="small" style={{ marginBottom: 8 }}>
                      <Space direction="vertical" size="small">
                        <Space>
                          <Tag color={typeInfo.color}>
                            {typeInfo.label}
                          </Tag>
                          {log.fromStatus && log.toStatus && (
                            <Text type="secondary">
                              {BookingStatusMap[log.fromStatus].label} → {BookingStatusMap[log.toStatus].label}
                            </Text>
                          )}
                        </Space>
                        <Space size="large">
                          <Text type="secondary">
                            <UserOutlined /> {log.operatorName || '系统'}
                          </Text>
                          {log.operatorRole && (
                            <Tag>
                              {roleMap[log.operatorRole] || log.operatorRole}
                            </Tag>
                          )}
                        </Space>
                        {log.reason && (
                          <div style={{ color: '#ff4d4f' }}>
                            原因：{log.reason}
                          </div>
                        )}
                        {log.remark && (
                          <div style={{ color: '#666' }}>
                            备注：{log.remark}
                          </div>
                        )}
                        {log.beforeData && log.afterData && (
                          <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12 }}>
                            <div style={{ color: '#999' }}>变更前：{log.beforeData}</div>
                            <div style={{ color: '#52c41a' }}>变更后：{log.afterData}</div>
                          </div>
                        )}
                      </Space>
                    </Card>
                  ),
                };
              })}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default TimelinePage;
