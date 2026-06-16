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
  Badge,
  Alert,
  Divider,
  Row,
  Col,
  Tooltip,
  InputNumber,
} from 'antd';
import {
  SafetyOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  CarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ScanOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingApi } from '@/services/api';
import type {
  Booking,
  PageResult,
  QueueItem,
  BookingWaybillRelation,
} from '@/types';
import {
  BookingStatus,
  BookingStatusMap,
  MixStatus,
  MixStatusMap,
  QueueType,
  QueueTypeMap,
  WaybillStatusInBooking,
  WaybillStatusMap,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { TextArea } = Input;
const { Option } = Select;

interface CustomsInspectItem {
  relationId: number;
  waybillNo: string;
  passed: boolean | null;
  piecesHeld: number;
  piecesReleased: number;
  totalPieces: number;
}

const SecurityPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [queueList, setQueueList] = useState<QueueItem[]>([]);
  const [checkVisible, setCheckVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [customsResultVisible, setCustomsResultVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [waybillRelations, setWaybillRelations] = useState<BookingWaybillRelation[]>([]);
  const [customsInspectItems, setCustomsInspectItems] = useState<CustomsInspectItem[]>([]);
  const [customsForm] = Form.useForm();
  const [form] = Form.useForm();
  const { currentUser } = useAppStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const statuses = [
        BookingStatus.QUEUED,
        BookingStatus.CUSTOMS_PENDING,
        BookingStatus.CUSTOMS_INSPECTING,
        BookingStatus.SECURITY_REJECTED,
        BookingStatus.SECURITY_CHECKED,
        BookingStatus.IN_PROGRESS,
        BookingStatus.PARTIAL_COMPLETED,
      ];

      const results = await Promise.all([
        ...statuses.map((status) =>
          bookingApi.getPage({
            page: 1,
            size: 100,
            status,
          })
        ),
        bookingApi.getQueueList(),
      ]);

      const queueItems = results[results.length - 1] as QueueItem[];
      const bookingResults = results.slice(0, -1) as PageResult<Booking>[];

      const allBookings: Booking[] = [];
      const seenIds = new Set<number>();
      bookingResults.forEach((result) => {
        result.records.forEach((booking) => {
          if (!seenIds.has(booking.id)) {
            seenIds.add(booking.id);
            allBookings.push(booking);
          }
        });
      });

      setBookings(allBookings);
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

  const allClearBookings = bookings.filter(
    (b) =>
      b.status === BookingStatus.QUEUED &&
      (b.mixStatus === MixStatus.ALL_CLEAR || b.mixStatus === MixStatus.PARTIAL_HOLD)
  );

  const customsBookings = bookings.filter(
    (b) =>
      b.status === BookingStatus.CUSTOMS_PENDING ||
      b.status === BookingStatus.CUSTOMS_INSPECTING ||
      (b.status === BookingStatus.QUEUED && b.mixStatus === MixStatus.ALL_HOLD)
  );

  const rejectBookings = bookings.filter(
    (b) => b.status === BookingStatus.SECURITY_REJECTED
  );

  const processingBookings = bookings.filter(
    (b) =>
      b.status === BookingStatus.SECURITY_CHECKED ||
      b.status === BookingStatus.IN_PROGRESS ||
      b.status === BookingStatus.PARTIAL_COMPLETED
  );

  const loadWaybillRelations = async (bookingId: number) => {
    try {
      const relations = await bookingApi.getWaybillRelations(bookingId);
      setWaybillRelations(relations);
      return relations;
    } catch (error) {
      console.error('加载运单明细失败:', error);
      return [];
    }
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

  const handleRejectDirect = async (booking: Booking) => {
    Modal.confirm({
      title: '确认退回重约',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>预约单号：<strong>{booking.bookingNo}</strong></p>
          <p>车牌号：<strong>{booking.plateNumber}</strong></p>
          <p style={{ color: '#ff4d4f' }}>此操作将驳回该车辆，需重新预约</p>
        </div>
      ),
      okText: '确认退回',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await bookingApi.securityCheck({
            bookingId: booking.id,
            plateNumber: booking.plateNumber,
            checkPass: false,
            remark: '全部暂扣，退回重约',
            operatorId: currentUser.id,
            operatorName: currentUser.name,
          });
          message.success('已退回重约');
          loadData();
        } catch (error: any) {
          message.error(error.message || '操作失败');
        }
      },
    });
  };

  const handleStartCustomsInspect = async (booking: Booking) => {
    try {
      await bookingApi.startCustomsInspect({
        bookingId: booking.id,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('已开始查验');
      loadData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleOpenCustomsResult = async (booking: Booking) => {
    setSelectedBooking(booking);
    const relations = await loadWaybillRelations(booking.id);
    const items: CustomsInspectItem[] = relations.map((r) => ({
      relationId: r.id,
      waybillNo: r.waybillNo,
      passed: null,
      piecesHeld: 0,
      piecesReleased: r.totalPieces || 0,
      totalPieces: r.totalPieces || 0,
    }));
    setCustomsInspectItems(items);
    customsForm.resetFields();
    setCustomsResultVisible(true);
  };

  const handleProcessCustomsResult = async (values: any) => {
    if (!selectedBooking) return;
    const hasInvalid = customsInspectItems.some((item) => item.passed === null);
    if (hasInvalid) {
      message.error('请为每票运单选择查验结果');
      return;
    }
    try {
      await bookingApi.processCustomsResult({
        bookingId: selectedBooking.id,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        remark: values.remark,
        inspectItems: customsInspectItems.map((item) => ({
          relationId: item.relationId,
          passed: item.passed === true,
          piecesHeld: item.piecesHeld,
          piecesReleased: item.piecesReleased,
        })),
      });
      message.success('查验结果已提交');
      setCustomsResultVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
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

  const renderMixStatusTag = (booking: Booking) => {
    const mixStatus = booking.mixStatus;
    if (!mixStatus) return null;
    const info = MixStatusMap[mixStatus];
    return (
      <Tooltip title={info.tip}>
        <Tag color={info.color} style={{ marginBottom: 4 }}>
          {info.label}
        </Tag>
      </Tooltip>
    );
  };

  const renderColdChainTag = (booking: Booking) => {
    if (!booking.hasColdChain) return null;
    return (
      <Tag color="cyan" style={{ marginBottom: 4 }}>
        冷链 🧊
      </Tag>
    );
  };

  const renderQueueTypeTag = (booking: Booking) => {
    const queueType = booking.queueType;
    if (!queueType) return null;
    const info = QueueTypeMap[queueType];
    return (
      <Tag color={info.color} style={{ marginBottom: 4 }}>
        {info.label}
      </Tag>
    );
  };

  const renderStatusTags = (_: any, record: Booking) => (
    <Space direction="vertical" size={2} style={{ display: 'flex' }}>
      {renderMixStatusTag(record)}
      {renderColdChainTag(record)}
      {renderQueueTypeTag(record)}
    </Space>
  );

  const renderWaybillSubTable = (booking: Booking) => {
    const relations = booking.waybillRelations && booking.waybillRelations.length > 0
      ? booking.waybillRelations
      : waybillRelations.filter((r) => r.bookingId === booking.id);

    const waybillColumns = [
      {
        title: '运单号',
        dataIndex: 'waybillNo',
        key: 'waybillNo',
        width: 160,
      },
      {
        title: '是否冷链',
        key: 'coldChain',
        width: 100,
        render: (_: any, record: BookingWaybillRelation) =>
          record.temperatureControlled ? (
            <Tag color="cyan">冷链 🧊</Tag>
          ) : (
            <span style={{ color: '#999' }}>否</span>
          ),
      },
      {
        title: '海关抽中',
        key: 'customsDraw',
        width: 100,
        render: (_: any, record: BookingWaybillRelation) =>
          record.customsInspected ? (
            <Tag color="gold">是</Tag>
          ) : (
            <span style={{ color: '#999' }}>否</span>
          ),
      },
      {
        title: '海关结果',
        key: 'customsResult',
        width: 120,
        render: (_: any, record: BookingWaybillRelation) => {
          if (!record.customsInspected) return <span style={{ color: '#999' }}>-</span>;
          return record.customsInspectResult || '-';
        },
      },
      {
        title: '状态',
        dataIndex: 'waybillStatus',
        key: 'waybillStatus',
        width: 120,
        render: (status: WaybillStatusInBooking) => {
          const info = WaybillStatusMap[status];
          return <Tag color={info.color}>{info.label}</Tag>;
        },
      },
      {
        title: '件数',
        key: 'pieces',
        width: 200,
        render: (_: any, record: BookingWaybillRelation) => (
          <span>
            <span style={{ color: '#52c41a' }}>放{record.piecesReleased || 0}</span>
            {' / '}
            <span style={{ color: '#ff4d4f' }}>扣{record.piecesHeld || 0}</span>
            {' / '}
            <span>总{record.totalPieces || 0}</span>
          </span>
        ),
      },
    ];

    return (
      <Table
        rowKey="id"
        columns={waybillColumns}
        dataSource={relations}
        pagination={false}
        size="small"
      />
    );
  };

  const renderActionColumn = (zoneType: 'allClear' | 'customs' | 'reject' | 'processing') =>
    (_: any, record: Booking) => {
      const buttons: React.ReactNode[] = [];

      buttons.push(
        <Button
          key="detail"
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
      );

      if (zoneType === 'allClear' && record.status === BookingStatus.QUEUED) {
        const isPartial = record.mixStatus === MixStatus.PARTIAL_HOLD;
        buttons.push(
          <Tooltip
            key="check-tip"
            title={isPartial ? '混合车辆，请展开查看运单' : ''}
          >
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
              {isPartial && <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
              安保检查
            </Button>
          </Tooltip>
        );
      }

      if (zoneType === 'customs') {
        if (record.status === BookingStatus.CUSTOMS_PENDING) {
          buttons.push(
            <Button
              key="start-inspect"
              type="primary"
              size="small"
              onClick={() => handleStartCustomsInspect(record)}
            >
              开始查验
            </Button>
          );
          buttons.push(
            <Button
              key="process-result"
              size="small"
              onClick={() => handleOpenCustomsResult(record)}
            >
              查验结果处理
            </Button>
          );
        }
        if (
          record.status === BookingStatus.CUSTOMS_INSPECTING ||
          (record.status === BookingStatus.QUEUED && record.mixStatus === MixStatus.ALL_HOLD)
        ) {
          buttons.push(
            <Button
              key="process-result"
              type="primary"
              size="small"
              onClick={() => handleOpenCustomsResult(record)}
            >
              查验结果处理
            </Button>
          );
        }
      }

      if (zoneType === 'reject') {
        buttons.push(
          <span
            key="reject-tag"
            style={{ color: '#ff4d4f', fontWeight: 'bold' }}
          >
            退回重约
          </span>
        );
      }

      if (zoneType === 'processing') {
        if (record.status === BookingStatus.SECURITY_CHECKED) {
          buttons.push(
            <Button
              key="start-pickup"
              type="primary"
              size="small"
              onClick={() => handleStartPickup(record)}
            >
              开始提货
            </Button>
          );
        }
        if (record.status === BookingStatus.IN_PROGRESS) {
          buttons.push(
            <Button
              key="partial"
              size="small"
              onClick={() => handlePartialDelivery(record)}
            >
              部分放货
            </Button>
          );
          buttons.push(
            <Button
              key="complete"
              type="primary"
              size="small"
              onClick={() => handleComplete(record)}
            >
              完成提货
            </Button>
          );
        }
        if (record.status === BookingStatus.PARTIAL_COMPLETED) {
          buttons.push(
            <Button
              key="complete"
              type="primary"
              size="small"
              onClick={() => handleComplete(record)}
            >
              完成提货
            </Button>
          );
        }
      }

      return <Space size="small" wrap>{buttons}</Space>;
    };

  const createColumns = (zoneType: 'allClear' | 'customs' | 'reject' | 'processing') => [
    {
      title: '状态标识',
      key: 'statusTags',
      width: 200,
      render: renderStatusTags,
    },
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
      width: 100,
      render: (_: any, record: Booking) => (
        <span>
          {record.pickedPieces || 0}/{record.totalPieces || '-'}
        </span>
      ),
    },
    {
      title: '业务状态',
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
      width: 320,
      fixed: 'right' as const,
      render: renderActionColumn(zoneType),
    },
  ];

  const allClearColumns = createColumns('allClear');
  const customsColumns = createColumns('customs');
  const rejectColumns = createColumns('reject');
  const processingColumns = createColumns('processing');

  const renderRejectTag = (_: any, record: Booking) => {
    const originalNode = renderStatusTags(_, record);
    return (
      <Space direction="vertical" size={2} style={{ display: 'flex' }}>
        {originalNode}
        <Tag color="red" style={{ fontWeight: 'bold' }}>
          退回重约
        </Tag>
      </Space>
    );
  };

  const rejectColumnsWithTag = rejectColumns.map((col) =>
    col.key === 'statusTags' ? { ...col, render: renderRejectTag } : col
  );

  const createTableConfig = (
    zoneType: 'allClear' | 'customs' | 'reject' | 'processing',
    columns: any[],
    dataSource: Booking[]
  ) => ({
    rowKey: 'id',
    columns,
    dataSource,
    loading: loading,
    scroll: { x: 1700 },
    pagination: { pageSize: 10, size: 'small' as const },
    expandable: {
      expandedRowRender: (record: Booking) => renderWaybillSubTable(record),
      onExpand: async (expanded: boolean, record: Booking) => {
        if (expanded && (!record.waybillRelations || record.waybillRelations.length === 0)) {
          const relations = await loadWaybillRelations(record.id);
          setBookings((prev) =>
            prev.map((b) =>
              b.id === record.id ? { ...b, waybillRelations: relations } : b
            )
          );
        }
      },
      expandIconColumnIndex: 1,
    },
  });

  const renderSectionCard = (
    title: string,
    icon: React.ReactNode,
    count: number,
    dataSource: Booking[],
    columns: any[],
    zoneType: 'allClear' | 'customs' | 'reject' | 'processing',
    borderColor: string,
    bgColor: string
  ) => (
    <Card
      style={{
        marginBottom: 16,
        borderLeft: `4px solid ${borderColor}`,
        backgroundColor: bgColor,
      }}
      title={
        <Space>
          <span style={{ color: borderColor, fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 16, fontWeight: 'bold' }}>{title}</span>
          <Badge
            count={`${count}辆`}
            style={{
              backgroundColor: borderColor,
              marginLeft: 8,
            }}
            showZero
          />
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={loadData}
        >
          刷新
        </Button>
      }
    >
      <Table
        {...createTableConfig(zoneType, columns, dataSource)}
        locale={{
          emptyText: (
            <div style={{ padding: '20px 0', color: '#999', textAlign: 'center' }}>
              暂无车辆
            </div>
          ),
        }}
      />
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
          <SafetyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          安保车辆放行台
        </h2>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          按车辆状态分区展示，绿色可进场，黄色待查验，红色需退回。请核对证件、排队顺序和预约窗口。
        </p>
      </div>

      {queueList.length > 0 && (
        <Alert
          message={
            <Space>
              <CarOutlined />
              <span>
                当前共 <strong style={{ color: '#1890ff' }}>{queueList.length}</strong> 辆车在队列系统中
              </span>
              <ClockCircleOutlined style={{ marginLeft: 16 }} />
              <span>{dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={loadData}>
              <ReloadOutlined /> 刷新全部
            </Button>
          }
        />
      )}

      <Row gutter={[0, 0]}>
        <Col span={24}>
          {renderSectionCard(
            '可进场区 ALL_CLEAR',
            <SafetyOutlined />,
            allClearBookings.length,
            allClearBookings,
            allClearColumns,
            'allClear',
            '#52c41a',
            '#f6ffed'
          )}
        </Col>
        <Col span={24}>
          <Divider style={{ margin: '0 0 16px 0' }} />
        </Col>
        <Col span={24}>
          {renderSectionCard(
            '待查验区 CUSTOMS',
            <ScanOutlined />,
            customsBookings.length,
            customsBookings,
            customsColumns,
            'customs',
            '#faad14',
            '#fffbe6'
          )}
        </Col>
        <Col span={24}>
          <Divider style={{ margin: '0 0 16px 0' }} />
        </Col>
        <Col span={24}>
          {renderSectionCard(
            '退回区 NEED_REJECT',
            <CloseCircleOutlined />,
            rejectBookings.length,
            rejectBookings,
            rejectColumnsWithTag,
            'reject',
            '#ff4d4f',
            '#fff2f0'
          )}
        </Col>
        <Col span={24}>
          <Divider style={{ margin: '0 0 16px 0' }} />
        </Col>
        <Col span={24}>
          {renderSectionCard(
            '处理中车辆',
            <CarOutlined />,
            processingBookings.length,
            processingBookings,
            processingColumns,
            'processing',
            '#1890ff',
            '#ffffff'
          )}
        </Col>
      </Row>

      <Modal
        title="安保检查详情"
        open={detailVisible}
        width={800}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedBooking && (
          <div>
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
              <Descriptions.Item label="业务状态">
                <Tag color={BookingStatusMap[selectedBooking.status].color}>
                  {BookingStatusMap[selectedBooking.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="混合状态">
                {selectedBooking.mixStatus && (
                  <Tooltip title={MixStatusMap[selectedBooking.mixStatus].tip}>
                    <Tag color={MixStatusMap[selectedBooking.mixStatus].color}>
                      {MixStatusMap[selectedBooking.mixStatus].label}
                    </Tag>
                  </Tooltip>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="冷链标识">
                {selectedBooking.hasColdChain ? (
                  <Tag color="cyan">冷链 🧊</Tag>
                ) : (
                  <span style={{ color: '#999' }}>否</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="队列类型">
                {selectedBooking.queueType && (
                  <Tag color={QueueTypeMap[selectedBooking.queueType].color}>
                    {QueueTypeMap[selectedBooking.queueType].label}
                  </Tag>
                )}
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
            {(selectedBooking.waybillRelations?.length || 0) > 0 && (
              <div style={{ marginTop: 16 }}>
                <Divider orientation="left" orientationMargin="0">运单明细</Divider>
                {renderWaybillSubTable(selectedBooking)}
              </div>
            )}
          </div>
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
            {selectedBooking.mixStatus === MixStatus.PARTIAL_HOLD && (
              <Alert
                message="混合车辆警告"
                description="部分货物被海关暂扣，请展开查看运单明细后谨慎处理"
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginTop: 8 }}
              />
            )}
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

      <Modal
        title={
          <Space>
            <ScanOutlined style={{ color: '#faad14' }} />
            <span>查验结果处理</span>
            {selectedBooking && (
              <Tag color="blue">{selectedBooking.bookingNo}</Tag>
            )}
          </Space>
        }
        open={customsResultVisible}
        width={900}
        onCancel={() => setCustomsResultVisible(false)}
        footer={null}
      >
        <Alert
          message="逐票选择查验结果并录入件数"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 16 }}>
          <Table
            rowKey="relationId"
            dataSource={customsInspectItems}
            pagination={false}
            size="small"
            columns={[
              {
                title: '运单号',
                dataIndex: 'waybillNo',
                key: 'waybillNo',
                width: 180,
              },
              {
                title: '总件数',
                dataIndex: 'totalPieces',
                key: 'totalPieces',
                width: 100,
              },
              {
                title: '查验结果',
                key: 'passed',
                width: 180,
                render: (_: any, record: CustomsInspectItem, index: number) => (
                  <Select
                    value={record.passed}
                    onChange={(value) => {
                      const newItems = [...customsInspectItems];
                      newItems[index].passed = value;
                      if (value === true) {
                        newItems[index].piecesReleased = newItems[index].totalPieces;
                        newItems[index].piecesHeld = 0;
                      } else if (value === false) {
                        newItems[index].piecesHeld = newItems[index].totalPieces;
                        newItems[index].piecesReleased = 0;
                      }
                      setCustomsInspectItems(newItems);
                    }}
                    placeholder="请选择"
                    style={{ width: '100%' }}
                  >
                    <Option value={true}>通过放行</Option>
                    <Option value={false}>海关暂扣</Option>
                  </Select>
                ),
              },
              {
                title: '放行件数',
                key: 'piecesReleased',
                width: 140,
                render: (_: any, record: CustomsInspectItem, index: number) => (
                  <InputNumber
                    min={0}
                    max={record.totalPieces}
                    value={record.piecesReleased}
                    onChange={(value) => {
                      const newItems = [...customsInspectItems];
                      const released = Number(value) || 0;
                      newItems[index].piecesReleased = released;
                      newItems[index].piecesHeld = Math.max(0, record.totalPieces - released);
                      setCustomsInspectItems(newItems);
                    }}
                    style={{ width: '100%' }}
                  />
                ),
              },
              {
                title: '暂扣件数',
                key: 'piecesHeld',
                width: 140,
                render: (_: any, record: CustomsInspectItem, index: number) => (
                  <InputNumber
                    min={0}
                    max={record.totalPieces}
                    value={record.piecesHeld}
                    onChange={(value) => {
                      const newItems = [...customsInspectItems];
                      const held = Number(value) || 0;
                      newItems[index].piecesHeld = held;
                      newItems[index].piecesReleased = Math.max(0, record.totalPieces - held);
                      setCustomsInspectItems(newItems);
                    }}
                    style={{ width: '100%' }}
                  />
                ),
              },
            ]}
          />
        </div>
        <Form form={customsForm} layout="vertical" onFinish={handleProcessCustomsResult}>
          <Form.Item name="remark" label="查验备注">
            <TextArea rows={2} placeholder="请输入查验备注（可选）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCustomsResultVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                <CheckOutlined /> 提交查验结果
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityPage;
