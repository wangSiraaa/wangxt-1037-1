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
  Descriptions,
  Card,
} from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { bookingApi } from '@/services/api';
import type { Booking, PageResult } from '@/types';
import { BookingStatus, BookingStatusMap } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { TextArea } = Input;
const { Option } = Select;

const OwnershipPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [form] = Form.useForm();
  const { currentUser } = useAppStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const pendingResult: PageResult<Booking> = await bookingApi.getPage({
        page: 1,
        size: 50,
        status: BookingStatus.SUBMITTED,
      });
      const verifiedResult: PageResult<Booking> = await bookingApi.getPage({
        page: 1,
        size: 50,
        status: BookingStatus.OWNERSHIP_VERIFIED,
      });
      const failedResult: PageResult<Booking> = await bookingApi.getPage({
        page: 1,
        size: 50,
        status: BookingStatus.OWNERSHIP_FAILED,
      });
      setBookings([...pendingResult.records, ...verifiedResult.records, ...failedResult.records]);
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

  const handleVerify = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await bookingApi.verifyOwnership({
        bookingId: selectedBooking.id,
        pickupOrderNo: values.pickupOrderNo,
        verifyPass: values.verifyPass,
        remark: values.remark,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success(values.verifyPass ? '货权确认通过' : '货权审核驳回');
      setVerifyVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleJoinQueue = async (booking: Booking) => {
    try {
      await bookingApi.joinQueue({
        bookingId: booking.id,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('已加入排队');
      loadData();
    } catch (error: any) {
      message.error(error.message || '加入排队失败');
    }
  };

  const columns = [
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
      title: '货代',
      dataIndex: 'forwarderName',
      key: 'forwarderName',
      width: 100,
    },
    {
      title: '车牌号',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
      width: 100,
    },
    {
      title: '司机',
      dataIndex: 'driverName',
      key: 'driverName',
      width: 80,
    },
    {
      title: '提货单号',
      dataIndex: 'pickupOrderNo',
      key: 'pickupOrderNo',
      width: 140,
    },
    {
      title: '货权确认人',
      dataIndex: 'ownershipOperator',
      key: 'ownershipOperator',
      width: 100,
    },
    {
      title: '货权确认时间',
      dataIndex: 'ownershipTime',
      key: 'ownershipTime',
      width: 180,
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
      title: '操作',
      key: 'action',
      width: 220,
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
          {record.status === BookingStatus.SUBMITTED && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setSelectedBooking(record);
                form.resetFields();
                form.setFieldsValue({ verifyPass: true });
                setVerifyVisible(true);
              }}
            >
              审核
            </Button>
          )}
          {record.status === BookingStatus.OWNERSHIP_VERIFIED && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleJoinQueue(record)}
            >
              加入排队
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>货权查验</h2>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          核验提货单、欠费状态和货物是否被监管锁定，货权未确认不能排队
        </p>
      </div>

      <Card
        type="inner"
        title="待处理列表"
        extra={
          <Button onClick={loadData}>刷新</Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={bookings}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="货权查验详情"
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
            <Descriptions.Item label="货代">{selectedBooking.forwarderName}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{selectedBooking.forwarderContact}</Descriptions.Item>
            <Descriptions.Item label="车牌号">{selectedBooking.plateNumber}</Descriptions.Item>
            <Descriptions.Item label="司机">{selectedBooking.driverName}</Descriptions.Item>
            <Descriptions.Item label="预计到场">
              {selectedBooking.expectedArrivalStart} ~ {selectedBooking.expectedArrivalEnd}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={BookingStatusMap[selectedBooking.status].color}>
                {BookingStatusMap[selectedBooking.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="提货单号">{selectedBooking.pickupOrderNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="货权确认人">{selectedBooking.ownershipOperator || '-'}</Descriptions.Item>
            <Descriptions.Item label="货权确认时间">{selectedBooking.ownershipTime || '-'}</Descriptions.Item>
            <Descriptions.Item label="货权备注">{selectedBooking.ownershipRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="驳回原因" span={2}>
              {selectedBooking.rejectReason || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {selectedBooking.remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="货权审核"
        open={verifyVisible}
        width={500}
        onCancel={() => setVerifyVisible(false)}
        footer={null}
      >
        {selectedBooking && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>预约单号：</strong>{selectedBooking.bookingNo}</p>
            <p><strong>运单号：</strong>{selectedBooking.waybillNo}</p>
            <p><strong>货代：</strong>{selectedBooking.forwarderName}</p>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleVerify}>
          <Form.Item
            name="pickupOrderNo"
            label="提货单号"
            rules={[{ required: true, message: '请输入提货单号' }]}
          >
            <Input placeholder="请输入提货单号" />
          </Form.Item>

          <Form.Item
            name="verifyPass"
            label="审核结果"
            rules={[{ required: true, message: '请选择审核结果' }]}
          >
            <Select>
              <Option value={true}>通过</Option>
              <Option value={false}>驳回</Option>
            </Select>
          </Form.Item>

          <Form.Item name="remark" label="审核备注">
            <TextArea rows={3} placeholder="请输入审核备注（驳回时必填原因）" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setVerifyVisible(false)}>取消</Button>
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

export default OwnershipPage;
