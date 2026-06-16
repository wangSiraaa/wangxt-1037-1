import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  List,
  Avatar,
  message,
  Badge,
  Descriptions,
  Modal,
} from 'antd';
import {
  ClockCircleOutlined,
  CarOutlined,
  UserOutlined,
  HistoryOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { bookingApi } from '@/services/api';
import type { QueueItem, Booking } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const QueuePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [queueList, setQueueList] = useState<QueueItem[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { currentUser } = useAppStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await bookingApi.getQueueList();
      setQueueList(list);
    } catch (error) {
      console.error('加载排队列表失败:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleViewDetail = async (item: QueueItem) => {
    try {
      const booking = await bookingApi.getDetail(item.bookingId);
      setSelectedItem(item);
      setSelectedBooking(booking);
      setDetailVisible(true);
    } catch (error) {
      console.error('获取详情失败:', error);
      message.error('获取详情失败');
    }
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'success';
    if (position <= 3) return 'warning';
    return 'default';
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return '正在叫号';
    if (position <= 3) return '即将叫号';
    return '等待中';
  };

  const columns = [
    {
      title: '排队位置',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      render: (position: number) => (
        <Space>
          <Badge
            count={position}
            color={getPositionColor(position)}
            style={{ fontSize: 16 }}
          />
          <Tag color={getPositionColor(position)}>{getPositionBadge(position)}</Tag>
        </Space>
      ),
    },
    {
      title: '预约单号',
      dataIndex: 'bookingNo',
      key: 'bookingNo',
      width: 160,
    },
    {
      title: '车牌号',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
      width: 120,
      render: (text: string) => (
        <Space>
          <CarOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '司机',
      dataIndex: 'driverName',
      key: 'driverName',
      width: 100,
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
    {
      title: '重排次数',
      dataIndex: 'requeueCount',
      key: 'requeueCount',
      width: 100,
    },
    {
      title: '加入时间',
      dataIndex: 'joinTime',
      key: 'joinTime',
      width: 180,
      render: (text: string) => (
        <Space>
          <ClockCircleOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '预计叫号时间',
      dataIndex: 'estimatedCallTime',
      key: 'estimatedCallTime',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: QueueItem) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>月台排队</h2>
          <p style={{ color: '#666', margin: '8px 0 0 0' }}>
            实时显示排队状态，车辆变更或部分放货后自动重新计算队列位置
          </p>
        </div>
        <Space>
          <span style={{ color: '#666' }}>当前排队：
            <strong style={{ color: '#1890ff', fontSize: 18, margin: '0 4px' }}>
            {queueList.length}
          </strong>
            辆
          </span>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            刷新
          </Button>
        </Space>
      </div>

      {queueList.length > 0 && (
        <Card
          type="inner"
          title="当前叫号"
          style={{ marginBottom: 16, background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' }}
        >
          <List
            dataSource={queueList.slice(0, 1)}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar size={64} style={{ backgroundColor: '#1890ff', fontSize: 24 }}>
                      {item.position}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <span style={{ fontSize: 18, fontWeight: 'bold' }}>{item.plateNumber}</span>
                      <Tag color="success" style={{ fontSize: 14 }}>正在叫号</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <span>预约单号：{item.bookingNo}</span>
                      <span>司机：{item.driverName}</span>
                      <span>加入时间：{item.joinTime}</span>
                    </Space>
                  }
                />
                <Space>
                  <Button type="primary" size="large">
                    <HistoryOutlined />
                    查看详情
                  </Button>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}

      {queueList.length > 1 && (
        <Card type="inner" title="即将叫号" style={{ marginBottom: 16 }}>
          <List
            grid={{ gutter: 16, column: 3 }}
            dataSource={queueList.slice(1, Math.min(4, queueList.length))}
            renderItem={(item, index) => (
              <List.Item>
                <Card size="small">
                  <Card.Meta
                    avatar={
                      <Avatar size={48} style={{ backgroundColor: '#faad14' }}>
                        {item.position}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <span>{item.plateNumber}</span>
                        <Tag color="warning">第{item.position}位</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div>司机：{item.driverName}</div>
                        <div style={{ color: '#999', fontSize: 12 }}>
                          预计：{item.estimatedCallTime || '计算中'}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Card type="inner" title="完整队列">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={queueList}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="排队详情"
        open={detailVisible}
        width={700}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedItem && selectedBooking && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="排队位置">{selectedItem.position}</Descriptions.Item>
              <Descriptions.Item label="优先级">{selectedItem.priority}</Descriptions.Item>
              <Descriptions.Item label="排队编码">{selectedItem.queueCode}</Descriptions.Item>
              <Descriptions.Item label="重排次数">{selectedItem.requeueCount}</Descriptions.Item>
              <Descriptions.Item label="加入时间">{selectedItem.joinTime}</Descriptions.Item>
              <Descriptions.Item label="预计叫号">{selectedItem.estimatedCallTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag>{selectedItem.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="离开原因" span={2}>
                {selectedItem.leaveReason || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Card title="预约信息" size="small">
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="预约单号">{selectedBooking.bookingNo}</Descriptions.Item>
                <Descriptions.Item label="运单号">{selectedBooking.waybillNo}</Descriptions.Item>
                <Descriptions.Item label="货代">{selectedBooking.forwarderName}</Descriptions.Item>
                <Descriptions.Item label="车牌号">{selectedBooking.plateNumber}</Descriptions.Item>
                <Descriptions.Item label="司机">{selectedBooking.driverName}</Descriptions.Item>
                <Descriptions.Item label="件数">
                  {selectedBooking.pickedPieces || 0}/{selectedBooking.totalPieces || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="预计到场" span={2}>
                  {selectedBooking.expectedArrivalStart} ~ {selectedBooking.expectedArrivalEnd}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QueuePage;
