import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space } from 'antd';
import { CarOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import { bookingApi, initApi } from '@/services/api';
import type { Booking, PageResult } from '@/types';
import { BookingStatus, BookingStatusMap } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    queued: 0,
    completed: 0,
    exception: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const { currentUser } = useAppStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const [allResult, queuedResult, completedResult] = await Promise.all([
        bookingApi.getPage({ page: 1, size: 100 }),
        bookingApi.getPage({ page: 1, size: 100, status: BookingStatus.QUEUED }),
        bookingApi.getPage({ page: 1, size: 100, status: BookingStatus.COMPLETED }),
      ]);

      const exceptionStatuses = [
        BookingStatus.OWNERSHIP_FAILED,
        BookingStatus.SECURITY_REJECTED,
        BookingStatus.REJECTED,
        BookingStatus.EXPIRED,
        BookingStatus.CANCELLED,
      ];
      const exceptionCount = allResult.records.filter((b) =>
        exceptionStatuses.includes(b.status)
      ).length;

      setStats({
        total: allResult.total,
        queued: queuedResult.total,
        completed: completedResult.total,
        exception: exceptionCount,
      });
      setRecentBookings(allResult.records.slice(0, 5));
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInitData = async () => {
    try {
      await initApi.initData();
      loadData();
    } catch (error) {
      console.error('初始化数据失败:', error);
    }
  };

  const columns = [
    {
      title: '预约单号',
      dataIndex: 'bookingNo',
      key: 'bookingNo',
    },
    {
      title: '运单号',
      dataIndex: 'waybillNo',
      key: 'waybillNo',
    },
    {
      title: '车牌号',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
    },
    {
      title: '司机',
      dataIndex: 'driverName',
      key: 'driverName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus) => {
        const info = BookingStatusMap[status];
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>工作台</h2>
        <Space>
          <span>当前用户：{currentUser.name}</span>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
          <Button type="primary" onClick={handleInitData}>
            初始化测试数据
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总预约数"
              value={stats.total}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="排队中"
              value={stats.queued}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="异常数"
              value={stats.exception}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近预约">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={recentBookings}
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
