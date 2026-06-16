import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Select,
  Card,
  Descriptions,
  List,
  Avatar,
  Badge,
  Alert,
} from 'antd';
import {
  SafetyOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  CarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingApi } from '@/services/api';
import type { Booking, PageResult, QueueItem } from '@/types';
import { BookingStatus, BookingStatusMap } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { TextArea } = Input;
const { Option } = Select;

const SecurityPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [queueList, setQueueList] = useState<QueueItem[]>([]);
  const [checkVisible, setCheckVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [form] = Form.useForm();
  const { currentUser } = useAppStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const [queuedResult, queueItems] = await Promise.all([
        bookingApi.getPage({
          page: 1,
          size: 50,
          status: BookingStatus.QUEUED,
        }),
        bookingApi.getQueueList(),
      ]);

      const checkedResult = await bookingApi.getPage({
        page: 1,
        size: 50,
        status: BookingStatus.SECURITY_CHECKED,
      });

      const rejectedResult = await bookingApi.getPage({
        page: 1,
        size: 50,
        status: BookingStatus.SECURITY_REJECTED,
      });

      setBookings([
        ...queuedResult.records,
        ...checkedResult.records,
        ...rejectedResult.records,
      ]);
      setQueueList(queueItems);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getQueuePosition = (bookingId: number) => {
    const item = queueList.find((q) => q.bookingId === bookingId);
    return item?.position;
  };

  const isWindowExpired = (booking: Booking) => {
    const now = dayjs();
    const endTime = dayjs(booking.expectedArrivalEnd);
    return now.isAfter(endTime);
  };

  const handleCheck = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await bookingApi.securityCheck({
        bookingId: selectedBooking.id,
        plateNumber: values.plateNumber,
        checkPass: values.checkPass,
        remark: values.remark,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success(values.checkPass ? '安保检查通过' : '安保检查驳回');
      setCheckVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || '检查失败');
    }
  };

  const handleStartPickup = async (booking: Booking) => {
    try {
      await bookingApi.startPickup({
        bookingId: booking.id,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('车辆入场，开始提货');
      loadData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handlePartialDelivery = async (booking: Booking) => {
    const pickedPiecesStr = prompt('请输入本次提货件数：', '');
    if (!pickedPiecesStr) return;
    const pickedPieces = parseInt(pickedPiecesStr, 10);
    if (isNaN(pickedPieces) || pickedPieces <= 0) {
      message.error('请输入有效的件数');
      return;
    }
    const reason = prompt('请输入部分放货原因：', '');
    if (!reason) return;

    try {
      await bookingApi.partialDelivery({
        bookingId: booking.id,
        pickedPieces,
        partialReason: reason,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('部分放货成功，已重新计算队列');
      loadData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleComplete = async (booking: Booking) => {
    try {
      await bookingApi.completePickup({
        bookingId: booking.id,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('提货完成');
      loadData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '排队位置',
      key: 'position',
      width: 100,
      render: (_: any, record: Booking) => {
        const position = getQueuePosition(record.id);
        return position ? (
          <Badge count={position} color="#1890ff" />
        ) : (
          <span style={{ color: '#999' }}>-</span>
        );
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
      title: '预计到场',
      key: 'expectedArrival',
      width: 300,
      render: (_: any, record: Booking) => (
        <Space direction="vertical" size={0}>
          <span>
            {record.expectedArrivalStart} ~ {record.expectedArrivalEnd}
          </span>
          {isWindowExpired(record) && (
            <Tag color="error">窗口已过期</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '件数',
      key: 'pieces',
      width: 80,
      render: (_: any, record: Booking) => (
        <span>
          {record.pickedPieces || 0}/{record.totalPieces || '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: BookingStatus) => {
        const info = BookingStatusMap[status];
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '安保检查人',
      dataIndex: 'securityOperator',
      key: 'securityOperator',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: Booking) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedBooking(record);
              setDetailVisible(true);
            }}
          >
            详情
          </Button>
          {record.status === BookingStatus.QUEUED && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedBooking(record);
                form.resetFields();
                form.setFieldsValue({
                  plateNumber: record.plateNumber,
                  checkPass: true,
                });
                setCheckVisible(true);
              }}
            >
              安保检查
            </Button>
          )}
          {record.status === BookingStatus.SECURITY_CHECKED && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleStartPickup(record)}
            >
              开始提货
            </Button>
          )}
          {record.status === BookingStatus.IN_PROGRESS && (
            <>
              <Button
                size="small"
                onClick={() => handlePartialDelivery(record)}
              >
                部分放货
              </Button>
              <Button
                type="primary"
                size="small"
                onClick={() => handleComplete(record)}
              >
                完成提货
              </Button>
            </>
          )}
          {record.status === BookingStatus.PARTIAL_COMPLETED && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleComplete(record)}
            >
              完成提货
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>车辆放行</h2>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          检查车辆证件、排队顺序和预约窗口是否过期，证件过期不能入场
        </p>
      </div>

      {queueList.length > 0 && (
        <Alert
          message={`当前排队 ${queueList.length} 辆车等待检查`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={loadData}>
              刷新
            </Button>
          }
        />
      )}

      <Card type="inner" title="待检查列表">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={bookings}
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="安保检查详情"
        open={detailVisible}
        width={700}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedBooking && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="预约单号">{selectedBooking.bookingNo}</Descriptions.Item>
            <Descriptions.Item label="运单号">{selectedBooking.waybillNo}</Descriptions.Item>
            <Descriptions.Item label="车牌号">{selectedBooking.plateNumber}</Descriptions.Item>
            <Descriptions.Item label="司机">{selectedBooking.driverName}</Descriptions.Item>
            <Descriptions.Item label="司机电话">{selectedBooking.driverPhone}</Descriptions.Item>
            <Descriptions.Item label="排队位置">
              {getQueuePosition(selectedBooking.id) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预计到场" span={2}>
              {selectedBooking.expectedArrivalStart} ~ {selectedBooking.expectedArrivalEnd}
              {isWindowExpired(selectedBooking) && (
                <Tag color="error" style={{ marginLeft: 8 }}>窗口已过期</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={BookingStatusMap[selectedBooking.status].color}>
                {BookingStatusMap[selectedBooking.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="件数">
              {selectedBooking.pickedPieces || 0}/{selectedBooking.totalPieces || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="安保检查人">{selectedBooking.securityOperator || '-'}</Descriptions.Item>
            <Descriptions.Item label="安保检查时间">{selectedBooking.securityTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="安保备注" span={2}>
              {selectedBooking.securityRemark || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="驳回原因" span={2}>
              {selectedBooking.rejectReason || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="安保检查"
        open={checkVisible}
        width={500}
        onCancel={() => setCheckVisible(false)}
        footer={null}
      >
        {selectedBooking && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>预约单号：</strong>{selectedBooking.bookingNo}</p>
            <p><strong>车牌号：</strong>{selectedBooking.plateNumber}</p>
            <p><strong>司机：</strong>{selectedBooking.driverName}</p>
            <p><strong>排队位置：</strong>{getQueuePosition(selectedBooking.id) || '-'}</p>
            {isWindowExpired(selectedBooking) && (
              <Alert
                message="预约窗口已过期"
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleCheck}>
          <Form.Item
            name="plateNumber"
            label="核对车牌号"
            rules={[{ required: true, message: '请输入车牌号' }]}
          >
            <Input placeholder="请输入实际车牌号" />
          </Form.Item>

          <Form.Item
            name="checkPass"
            label="检查结果"
            rules={[{ required: true, message: '请选择检查结果' }]}
          >
            <Select>
              <Option value={true}>通过放行</Option>
              <Option value={false}>驳回</Option>
            </Select>
          </Form.Item>

          <Form.Item name="remark" label="检查备注">
            <TextArea rows={3} placeholder="请输入检查备注（驳回时必填原因，如证件过期、排队顺序错误等）" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCheckVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityPage;
