import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Popconfirm,
  Select,
  InputNumber,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CarOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { bookingApi, initApi } from '@/services/api';
import type { Booking, PageResult } from '@/types';
import { BookingStatus, BookingStatusMap } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const BookingPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [form] = Form.useForm();
  const [vehicleForm] = Form.useForm();
  const [waybills, setWaybills] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const { currentUser } = useAppStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const result: PageResult<Booking> = await bookingApi.getPage({
        page,
        size: pageSize,
        status: statusFilter || undefined,
        keyword: keyword || undefined,
      });
      setBookings(result.records);
      setTotal(result.total);
    } catch (error) {
      console.error('加载预约列表失败:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      const [w, v] = await Promise.all([initApi.getWaybills(), initApi.getVehicles()]);
      setWaybills(w);
      setVehicles(v);
    } catch (error) {
      console.error('加载基础数据失败:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadMasterData();
  }, [page, statusFilter, keyword]);

  const handleSubmit = async (values: any) => {
    try {
      const arrivalStart = values.expectedArrival[0].toISOString();
      const arrivalEnd = values.expectedArrival[1].toISOString();

      await bookingApi.submit({
        waybillNo: values.waybillNo,
        plateNumber: values.plateNumber,
        driverName: values.driverName,
        driverPhone: values.driverPhone,
        expectedArrivalStart: arrivalStart,
        expectedArrivalEnd: arrivalEnd,
        forwarderId: currentUser.id,
        forwarderName: currentUser.name,
        forwarderContact: values.forwarderContact,
        remark: values.remark,
      });

      message.success('预约提交成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || '提交失败');
    }
  };

  const handleChangeVehicle = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await bookingApi.changeVehicle({
        bookingId: selectedBooking.id,
        newPlateNumber: values.newPlateNumber,
        newDriverName: values.newDriverName,
        newDriverPhone: values.newDriverPhone,
        changeReason: values.changeReason,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('车辆变更成功，已重新计算队列');
      setVehicleModalVisible(false);
      vehicleForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || '变更失败');
    }
  };

  const handleCancel = async (booking: Booking, cancelReason: string) => {
    try {
      await bookingApi.cancelBooking({
        bookingId: booking.id,
        cancelReason,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('取消成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '取消失败');
    }
  };

  const canCancel = (booking: Booking) => {
    return !['COMPLETED', 'IN_PROGRESS'].includes(booking.status);
  };

  const canChangeVehicle = (booking: Booking) => {
    return ['SUBMITTED', 'OWNERSHIP_VERIFIED', 'QUEUED'].includes(booking.status);
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
      title: '司机电话',
      dataIndex: 'driverPhone',
      key: 'driverPhone',
      width: 120,
    },
    {
      title: '预计到场',
      key: 'expectedArrival',
      width: 300,
      render: (_: any, record: Booking) => (
        <span>
          {record.expectedArrivalStart} ~ {record.expectedArrivalEnd}
        </span>
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
          {canChangeVehicle(record) && (
            <Button
              type="link"
              size="small"
              icon={<CarOutlined />}
              onClick={() => {
                setSelectedBooking(record);
                vehicleForm.setFieldsValue({
                  newPlateNumber: record.plateNumber,
                  newDriverName: record.driverName,
                  newDriverPhone: record.driverPhone,
                });
                setVehicleModalVisible(true);
              }}
            >
              改车
            </Button>
          )}
          {canCancel(record) && (
            <Popconfirm
              title="确定取消此预约？"
              description="请输入取消原因"
              okText="确定"
              cancelText="取消"
              onConfirm={async () => {
                const reason = prompt('请输入取消原因：', '');
                if (reason) {
                  await handleCancel(record, reason);
                }
              }}
            >
              <Button type="link" size="small" danger>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>预约管理</h2>
        <Space>
          <Select
            placeholder="状态筛选"
            style={{ width: 150 }}
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => {
              setStatusFilter(v || '');
              setPage(1);
            }}
          >
            {Object.entries(BookingStatusMap).map(([key, value]) => (
              <Option key={key} value={key}>
                {value.label}
              </Option>
            ))}
          </Select>
          <Input.Search
            placeholder="搜索预约号/运单号/车牌号"
            style={{ width: 250 }}
            onSearch={(v) => {
              setKeyword(v);
              setPage(1);
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            新建预约
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={bookings}
        loading={loading}
        scroll={{ x: 1500 }}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
        }}
      />

      <Modal
        title="提交提货预约"
        open={modalVisible}
        width={600}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="waybillNo"
            label="运单号"
            rules={[{ required: true, message: '请选择运单' }]}
          >
            <Select placeholder="请选择运单">
              {waybills.map((w) => (
                <Option key={w.waybillNo} value={w.waybillNo}>
                  {w.waybillNo} - {w.cargoName} ({w.cargoPieces}件)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="plateNumber"
            label="车牌号"
            rules={[{ required: true, message: '请选择车辆' }]}
          >
            <Select placeholder="请选择车辆" showSearch>
              {vehicles.map((v) => (
                <Option key={v.plateNumber} value={v.plateNumber}>
                  {v.plateNumber} - {v.driverName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="driverName"
            label="司机姓名"
            rules={[{ required: true, message: '请输入司机姓名' }]}
          >
            <Input placeholder="请输入司机姓名" />
          </Form.Item>

          <Form.Item
            name="driverPhone"
            label="司机电话"
            rules={[{ required: true, message: '请输入司机电话' }]}
          >
            <Input placeholder="请输入司机电话" />
          </Form.Item>

          <Form.Item
            name="expectedArrival"
            label="预计到场窗口"
            rules={[{ required: true, message: '请选择预计到场时间' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item name="forwarderContact" label="货代联系人">
            <Input placeholder="请输入货代联系人" />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                提交预约
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="变更车辆信息"
        open={vehicleModalVisible}
        width={500}
        onCancel={() => setVehicleModalVisible(false)}
        footer={null}
      >
        <Form form={vehicleForm} layout="vertical" onFinish={handleChangeVehicle}>
          <Form.Item
            name="newPlateNumber"
            label="新车牌号"
            rules={[{ required: true, message: '请输入新车牌号' }]}
          >
            <Input placeholder="请输入新车牌号" />
          </Form.Item>

          <Form.Item name="newDriverName" label="新司机姓名">
            <Input placeholder="请输入新司机姓名" />
          </Form.Item>

          <Form.Item name="newDriverPhone" label="新司机电话">
            <Input placeholder="请输入新司机电话" />
          </Form.Item>

          <Form.Item
            name="changeReason"
            label="变更原因"
            rules={[{ required: true, message: '请输入变更原因' }]}
          >
            <TextArea rows={3} placeholder="请输入变更原因" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setVehicleModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认变更
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookingPage;
