import React, { useEffect, useState, useMemo } from 'react';
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
  Tabs,
  Tooltip,
} from 'antd';
import type { TabsProps } from 'antd';
import {
  ClockCircleOutlined,
  CarOutlined,
  UserOutlined,
  HistoryOutlined,
  ReloadOutlined,
  EyeOutlined,
  TruckOutlined,
  CloudOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { bookingApi } from '@/services/api';
import type { QueueItem, Booking, MixStatus, BookingWaybillRelation, WaybillStatusInBooking } from '@/types';
import { QueueType, QueueTypeMap, MixStatusMap, WaybillStatusMap } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface QueueTabConfig {
  key: QueueType;
  label: string;
  icon: React.ReactNode;
  subTitle: string;
  maxSize: number;
  gradientBg: string;
  primaryColor: string;
  callHint?: string;
}

const QUEUE_TAB_CONFIGS: Record<QueueType, QueueTabConfig> = {
  [QueueType.NORMAL]: {
    key: QueueType.NORMAL,
    label: '普通月台',
    icon: <TruckOutlined />,
    subTitle: 'queueSize / max:50',
    maxSize: 50,
    gradientBg: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
    primaryColor: '#1890ff',
  },
  [QueueType.COLD_CHAIN]: {
    key: QueueType.COLD_CHAIN,
    label: '冷链月台',
    icon: <CloudOutlined />,
    subTitle: '优先队列，queueSize / max:20',
    maxSize: 20,
    gradientBg: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)',
    primaryColor: '#13c2c2',
    callHint: '请前往 5/6 号冷链月台',
  },
  [QueueType.CUSTOMS]: {
    key: QueueType.CUSTOMS,
    label: '海关查验区',
    icon: <SafetyCertificateOutlined />,
    subTitle: '待查验，queueSize / max:30',
    maxSize: 30,
    gradientBg: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
    primaryColor: '#faad14',
    callHint: '请前往查验棚 A',
  },
};

const QueuePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<QueueType>(QueueType.NORMAL);
  const [loadingMap, setLoadingMap] = useState<Record<QueueType, boolean>>({
    [QueueType.NORMAL]: false,
    [QueueType.COLD_CHAIN]: false,
    [QueueType.CUSTOMS]: false,
  });
  const [queueMap, setQueueMap] = useState<Record<QueueType, QueueItem[]>>({
    [QueueType.NORMAL]: [],
    [QueueType.COLD_CHAIN]: [],
    [QueueType.CUSTOMS]: [],
  });
  const [bookingCache, setBookingCache] = useState<Map<number, Booking>>(new Map());
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { currentUser } = useAppStore();

  const loadQueueByType = async (type: QueueType) => {
    setLoadingMap((prev) => ({ ...prev, [type]: true }));
    try {
      const list = await bookingApi.getQueueListByType(type);
      setQueueMap((prev) => ({ ...prev, [type]: list }));
    } catch (error) {
      console.error(`加载${QueueTypeMap[type].label}排队列表失败:`, error);
      message.error(`加载${QueueTypeMap[type].label}失败`);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [type]: false }));
    }
  };

  const loadAllQueues = async () => {
    await Promise.all([
      loadQueueByType(QueueType.NORMAL),
      loadQueueByType(QueueType.COLD_CHAIN),
      loadQueueByType(QueueType.CUSTOMS),
    ]);
  };

  const loadCurrentQueue = () => loadQueueByType(activeTab);

  useEffect(() => {
    loadAllQueues();
    const timer = setInterval(loadAllQueues, 10000);
    return () => clearInterval(timer);
  }, []);

  const getBookingFromCacheOrApi = async (bookingId: number): Promise<Booking | null> => {
    if (bookingCache.has(bookingId)) {
      return bookingCache.get(bookingId)!;
    }
    try {
      const booking = await bookingApi.getDetail(bookingId);
      setBookingCache((prev) => new Map(prev).set(bookingId, booking));
      return booking;
    } catch (error) {
      console.error('获取预约详情失败:', error);
      return null;
    }
  };

  const handleViewDetail = async (item: QueueItem) => {
    try {
      const booking = await getBookingFromCacheOrApi(item.bookingId);
      if (booking) {
        setSelectedItem(item);
        setSelectedBooking(booking);
        setDetailVisible(true);
      } else {
        message.error('获取详情失败');
      }
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

  const getMixStatusTag = (mixStatus?: MixStatus) => {
    if (!mixStatus) return '-';
    const config = MixStatusMap[mixStatus];
    return (
      <Space>
        <Tag color={config.color}>{config.label}</Tag>
        {mixStatus === 'PARTIAL_HOLD' && (
          <Tooltip title={config.tip}>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          </Tooltip>
        )}
      </Space>
    );
  };

  const getQueueTypeTag = (queueType?: QueueType) => {
    if (!queueType) return '-';
    const config = QueueTypeMap[queueType];
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const getColdChainTag = (hasColdChain?: boolean) => {
    if (!hasColdChain) return '-';
    return <Tag color="cyan">🧊 冷链</Tag>;
  };

  const renderPriorityCell = (priority: number) => {
    const isHigh = priority > 15;
    return (
      <Tooltip title={isHigh ? '优先级>15：冷链+临期等权重叠加' : undefined}>
        <span style={{ color: isHigh ? '#ff4d4f' : undefined, fontWeight: isHigh ? 'bold' : undefined }}>
          {priority}
        </span>
      </Tooltip>
    );
  };

  const renderArrivalWindow = (item: QueueItem) => {
    const hasRecalculated = item.requeueCount > 0;
    const start = item.estimatedArrivalWindowStart;
    const end = item.estimatedArrivalWindowEnd;
    if (!start || !end) return '-';
    return (
      <Space>
        <span>
          {start} ~ {end}
        </span>
        {hasRecalculated && (
          <Tag icon={<SyncOutlined spin={false} />} color="purple">
            已重算
          </Tag>
        )}
      </Space>
    );
  };

  const buildColumns = (queueType: QueueType) => [
    {
      title: '排队位置',
      dataIndex: 'position',
      key: 'position',
      width: 100,
      render: (position: number) => (
        <Space>
          <Badge count={position} color={getPositionColor(position)} style={{ fontSize: 16 }} />
          <Tag color={getPositionColor(position)}>{getPositionBadge(position)}</Tag>
        </Space>
      ),
    },
    {
      title: '队列类型',
      dataIndex: 'queueType',
      key: 'queueType',
      width: 130,
      render: (qt?: QueueType) => getQueueTypeTag(qt || queueType),
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
      title: '冷链标记',
      key: 'coldChain',
      width: 100,
      render: (_: any, record: QueueItem) => {
        const booking = bookingCache.get(record.bookingId);
        return getColdChainTag(booking?.hasColdChain);
      },
    },
    {
      title: '混合状态',
      key: 'mixStatus',
      width: 140,
      render: (_: any, record: QueueItem) => {
        const booking = bookingCache.get(record.bookingId);
        return getMixStatusTag(booking?.mixStatus);
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: renderPriorityCell,
    },
    {
      title: '预计到场窗口',
      key: 'arrivalWindow',
      width: 240,
      render: (_: any, record: QueueItem) => renderArrivalWindow(record),
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

  const renderCurrentCallCard = (type: QueueType) => {
    const list = queueMap[type];
    const config = QUEUE_TAB_CONFIGS[type];
    if (list.length === 0) return null;
    const current = list[0];
    const booking = bookingCache.get(current.bookingId);

    return (
      <Card type="inner" title="当前叫号" style={{ marginBottom: 16, background: config.gradientBg }}>
        <List
          dataSource={[current]}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar size={64} style={{ backgroundColor: config.primaryColor, fontSize: 24 }}>
                    {item.position}
                  </Avatar>
                }
                title={
                  <Space>
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>{item.plateNumber}</span>
                    <Tag color="success" style={{ fontSize: 14 }}>正在叫号</Tag>
                    {booking?.hasColdChain && <Tag color="cyan">🧊 冷链</Tag>}
                    {type === QueueType.CUSTOMS && <Tag color="gold">🔍 查验</Tag>}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <span>预约单号：{item.bookingNo}</span>
                    <span>司机：{item.driverName}</span>
                    <span>加入时间：{item.joinTime}</span>
                    {config.callHint && (
                      <span style={{ color: config.primaryColor, fontWeight: 'bold' }}>
                        {type === QueueType.COLD_CHAIN && '🌡️ '}
                        {type === QueueType.CUSTOMS && '🛃 '}
                        {config.callHint}
                      </span>
                    )}
                  </Space>
                }
              />
              <Space>
                <Button type="primary" size="large" style={{ backgroundColor: config.primaryColor }} onClick={() => handleViewDetail(item)}>
                  <HistoryOutlined />
                  查看详情
                </Button>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const renderUpcomingCards = (type: QueueType) => {
    const list = queueMap[type];
    const config = QUEUE_TAB_CONFIGS[type];
    const upcoming = list.slice(1, Math.min(4, list.length));
    if (upcoming.length === 0) return null;

    return (
      <Card type="inner" title="即将叫号" style={{ marginBottom: 16 }}>
        <List
          grid={{ gutter: 16, column: 3 }}
          dataSource={upcoming}
          renderItem={(item) => {
            const booking = bookingCache.get(item.bookingId);
            return (
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
                        {booking?.hasColdChain && <Tag color="cyan">🧊</Tag>}
                      </Space>
                    }
                    description={
                      <div>
                        <div>司机：{item.driverName}</div>
                        <div style={{ color: '#999', fontSize: 12 }}>
                          预计：{item.estimatedArrivalWindowStart
                            ? `${item.estimatedArrivalWindowStart} ~ ${item.estimatedArrivalWindowEnd}`
                            : '计算中'}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            );
          }}
        />
      </Card>
    );
  };

  const renderWaybillDetailTable = (relations?: BookingWaybillRelation[]) => {
    if (!relations || relations.length === 0) return null;
    const waybillColumns = [
      {
        title: '运单号',
        dataIndex: 'waybillNo',
        key: 'waybillNo',
        width: 160,
      },
      {
        title: '状态',
        dataIndex: 'waybillStatus',
        key: 'waybillStatus',
        width: 120,
        render: (status: WaybillStatusInBooking) => {
          const cfg = WaybillStatusMap[status as WaybillStatusInBooking];
          return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status;
        },
      },
      {
        title: '海关查验',
        key: 'customs',
        width: 120,
        render: (_: any, record: BookingWaybillRelation) => {
          if (record.customsInspected) {
            return (
              <Tag color={record.customsInspectResult === 'PASSED' ? 'success' : 'error'}>
                {record.customsInspectResult === 'PASSED' ? '已通过' : '暂扣'}
              </Tag>
            );
          }
          return <Tag>未查验</Tag>;
        },
      },
      {
        title: '件数(放/扣/提)',
        key: 'pieces',
        width: 160,
        render: (_: any, record: BookingWaybillRelation) => (
          <span>
            {record.piecesReleased || 0}/{record.piecesHeld || 0}/{record.piecesPicked || 0}
            <span style={{ color: '#999' }}> / {record.totalPieces || '-'}</span>
          </span>
        ),
      },
      {
        title: '温控',
        dataIndex: 'temperatureControlled',
        key: 'temperatureControlled',
        width: 80,
        render: (v?: boolean) => (v ? <Tag color="cyan">🧊 是</Tag> : '否'),
      },
    ];
    return (
      <Card title={`运单明细（共 ${relations.length} 票）`} size="small" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          size="small"
          columns={waybillColumns}
          dataSource={relations}
          pagination={false}
        />
      </Card>
    );
  };

  const renderTabContent = (type: QueueType) => {
    const list = queueMap[type];
    const loading = loadingMap[type];
    const columns = buildColumns(type);

    return (
      <div>
        {renderCurrentCallCard(type)}
        {renderUpcomingCards(type)}
        <Card type="inner" title="完整队列">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={list}
            loading={loading}
            scroll={{ x: 1800 }}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
    );
  };

  const tabItems: TabsProps['items'] = useMemo(
    () =>
      (Object.keys(QUEUE_TAB_CONFIGS) as QueueType[]).map((type) => {
        const config = QUEUE_TAB_CONFIGS[type];
        const size = queueMap[type].length;
        const subTitle = config.subTitle.replace('queueSize', String(size));
        return {
          key: type,
          label: (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px' }}>
              <Space>
                {config.icon}
                <span style={{ fontSize: 16, fontWeight: 'bold' }}>{config.label}</span>
              </Space>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{subTitle}</div>
            </div>
          ),
          children: renderTabContent(type),
        };
      }),
    [queueMap, loadingMap, bookingCache]
  );

  const currentQueueSize = queueMap[activeTab].length;
  const currentConfig = QUEUE_TAB_CONFIGS[activeTab];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>月台排队</h2>
          <p style={{ color: '#666', margin: '8px 0 0 0' }}>
            实时显示三类队列排队状态，车辆变更或部分放货后自动重新计算队列位置
          </p>
        </div>
        <Space>
          <Space>
            <span style={{ color: '#666' }}>
              当前<strong style={{ color: currentConfig.primaryColor, fontSize: 18, margin: '0 4px' }}>
                {currentConfig.label}
              </strong>
              排队：
              <strong style={{ color: currentConfig.primaryColor, fontSize: 18, margin: '0 4px' }}>
                {currentQueueSize}
              </strong>
              / {currentConfig.maxSize} 辆
            </span>
            <Badge count={currentQueueSize} style={{ backgroundColor: currentConfig.primaryColor }} />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={loadCurrentQueue}>
            刷新当前
          </Button>
          <Button type="primary" icon={<ReloadOutlined />} onClick={loadAllQueues}>
            全部刷新
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as QueueType)}
        items={tabItems}
        size="large"
        type="card"
      />

      <Modal
        title="排队详情"
        open={detailVisible}
        width={800}
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
              <Descriptions.Item label="优先级">{renderPriorityCell(selectedItem.priority)}</Descriptions.Item>
              <Descriptions.Item label="排队编码">{selectedItem.queueCode}</Descriptions.Item>
              <Descriptions.Item label="重排次数">{selectedItem.requeueCount}</Descriptions.Item>
              <Descriptions.Item label="加入时间">{selectedItem.joinTime}</Descriptions.Item>
              <Descriptions.Item label="预计到场窗口">
                {renderArrivalWindow(selectedItem)}
              </Descriptions.Item>
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
                <Descriptions.Item label="队列类型">
                  {getQueueTypeTag(selectedBooking.queueType || selectedItem.queueType)}
                </Descriptions.Item>
                <Descriptions.Item label="混合状态">
                  {getMixStatusTag(selectedBooking.mixStatus)}
                </Descriptions.Item>
                <Descriptions.Item label="冷链标识">
                  {getColdChainTag(selectedBooking.hasColdChain)}
                </Descriptions.Item>
                <Descriptions.Item label="放行凭证号">
                  {selectedBooking.releaseVoucherNo || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="货代">{selectedBooking.forwarderName || '-'}</Descriptions.Item>
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

            {(selectedBooking.waybillCount || 0) > 1 &&
              renderWaybillDetailTable(selectedBooking.waybillRelations)}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QueuePage;
