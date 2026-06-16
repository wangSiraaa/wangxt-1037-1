import React, { useEffect, useState, useMemo } from 'react';
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
  Radio,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CarOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { bookingApi, initApi } from '@/services/api';
import type { Booking, PageResult, BookingWaybillRelation } from '@/types';
import {
  BookingStatus,
  BookingStatusMap,
  QueueType,
  QueueTypeMap,
  MixStatus,
  MixStatusMap,
  WaybillStatusInBooking,
  WaybillStatusMap,
  ReleaseVoucherStatus,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;
const { Group: RadioGroup } = Radio;

type SubmitMode = 'SINGLE' | 'MULTI';

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
  const { currentUser, currentRole } = useAppStore();

  const [submitMode, setSubmitMode] = useState<SubmitMode>('SINGLE');
  const [selectedWaybills, setSelectedWaybills] = useState<string[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [waybillRelationsMap, setWaybillRelationsMap] = useState<
    Record<number, BookingWaybillRelation[]>
  >({});
  const [loadingRelations, setLoadingRelations] = useState<Record<number, boolean>>({});

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
      const initialMap: Record<number, BookingWaybillRelation[]> = {};
      result.records.forEach((b) => {
        if (b.waybillRelations && b.waybillRelations.length > 0) {
          initialMap[b.id] = b.waybillRelations;
        }
      });
      setWaybillRelationsMap((prev) => ({ ...prev, ...initialMap }));
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

  const selectedWaybillInfo = useMemo(() => {
    const selected = waybills.filter((w) => selectedWaybills.includes(w.waybillNo));
    const count = selected.length;
    const coldCount = selected.filter((w) => w.temperatureControlled).length;
    const totalPieces = selected.reduce((sum, w) => sum + (w.cargoPieces || 0), 0);
    const hasColdChain = coldCount > 0;
    return { count, coldCount, totalPieces, hasColdChain };
  }, [selectedWaybills, waybills]);

  const handleLoadRelations = async (bookingId: number) => {
    if (waybillRelationsMap[bookingId] || loadingRelations[bookingId]) return;
    setLoadingRelations((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const relations = await bookingApi.getWaybillRelations(bookingId);
      setWaybillRelationsMap((prev) => ({ ...prev, [bookingId]: relations }));
    } catch (error) {
      console.error('加载关联运单失败:', error);
      message.error('加载关联运单失败');
    } finally {
      setLoadingRelations((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const arrivalStart = values.expectedArrival[0].toISOString();
      const arrivalEnd = values.expectedArrival[1].toISOString();
      const commonData = {
        plateNumber: values.plateNumber,
        driverName: values.driverName,
        driverPhone: values.driverPhone,
        expectedArrivalStart: arrivalStart,
        expectedArrivalEnd: arrivalEnd,
        forwarderId: currentUser.id,
        forwarderName: currentUser.name,
        forwarderContact: values.forwarderContact,
        remark: values.remark,
      };

      if (submitMode === 'SINGLE') {
        await bookingApi.submit({
          ...commonData,
          waybillNo: values.waybillNo,
        });
      } else {
        if (!values.waybillNoList || values.waybillNoList.length === 0) {
          message.error('请选择至少一个运单');
          return;
        }
        await bookingApi.submitMulti({
          ...commonData,
          waybillNoList: values.waybillNoList,
        });
      }

      message.success('预约提交成功');
      setModalVisible(false);
      form.resetFields();
      setSubmitMode('SINGLE');
      setSelectedWaybills([]);
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

  const handleTriggerCustoms = async (booking: Booking) => {
    try {
      await bookingApi.startCustomsInspect({
        bookingId: booking.id,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
      });
      message.success('已触发海关抽检');
      loadData();
    } catch (error: any) {
      message.error(error.message || '触发失败');
    }
  };

  const canCancel = (booking: Booking) => {
    return !['COMPLETED', 'IN_PROGRESS'].includes(booking.status);
  };

  const canChangeVehicle = (booking: Booking) => {
    return ['SUBMITTED', 'OWNERSHIP_VERIFIED', 'QUEUED'].includes(booking.status);
  };

  const canTriggerCustoms = (booking: Booking) => {
    return (
      booking.status === BookingStatus.CUSTOMS_PENDING &&
      ['WAREHOUSE', 'CUSTOMS', 'ADMIN'].includes(currentRole)
    );
  };

  const renderWaybillOptionLabel = (w: any) => {
    const prefix = w.temperatureControlled ? '🔵 [冷链 2-8℃] ' : '';
    const suffix = `${w.cargoName || ''} (${w.cargoPieces || 0}件)`;
    return `${prefix}${w.waybillNo} - ${suffix}`;
  };

  const waybillRelationColumns = [
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
          <Tag color="cyan">🧊 冷链</Tag>
        ) : (
          <Tag>普通</Tag>
        ),
    },
    {
      title: '海关抽检状态',
      key: 'customs',
      width: 140,
      render: (_: any, record: BookingWaybillRelation) => {
        if (record.customsInspected === undefined || record.customsInspected === null) {
          return <Tag color="default">未抽检</Tag>;
        }
        if (record.customsInspected) {
          return record.customsInspectResult === 'PASSED' ? (
            <Tag color="success">查验通过</Tag>
          ) : (
            <Tag color="error">暂扣 {record.piecesHeld || 0}件</Tag>
          );
        }
        return <Tag color="processing">查验中</Tag>;
      },
    },
    {
      title: '当前状态',
      dataIndex: 'waybillStatus',
      key: 'waybillStatus',
      width: 120,
      render: (status: WaybillStatusInBooking) => {
        const info = WaybillStatusMap[status];
        return <Tag color={info?.color || 'default'}>{info?.label || status}</Tag>;
      },
    },
    {
      title: '件数',
      key: 'pieces',
      width: 180,
      render: (_: any, record: BookingWaybillRelation) => {
        const picked = record.piecesPicked || 0;
        const held = record.piecesHeld || 0;
        const released = record.piecesReleased || 0;
        const total = record.totalPieces || 0;
        return (
          <span>
            总 {total} / 放行 {released} / 暂扣 {held} / 已提 {picked}
          </span>
        );
      },
    },
  ];

  const expandedRowRender = (record: Booking) => {
    const relations = waybillRelationsMap[record.id] || [];
    const isLoading = loadingRelations[record.id];
    return (
      <div style={{ paddingLeft: 48 }}>
        <Spin spinning={isLoading}>
          <h4 style={{ marginBottom: 12 }}>关联运单（{relations.length} 票）</h4>
          <Table
            rowKey="id"
            columns={waybillRelationColumns}
            dataSource={relations}
            pagination={false}
            size="small"
          />
        </Spin>
      </div>
    );
  };

  const onExpand = (expanded: boolean, record: Booking) => {
    setExpandedRowKeys((prev) => {
      if (expanded) {
        handleLoadRelations(record.id);
        return [...prev, record.id];
      }
      return prev.filter((k) => k !== record.id);
    });
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
      title: '运单数量',
      key: 'waybillCount',
      width: 100,
      render: (_: any, record: Booking) =>
        record.waybillCount && record.waybillCount > 1 ? (
          <Tag color="blue">{record.waybillCount} 票</Tag>
        ) : null,
    },
    {
      title: '冷链',
      key: 'hasColdChain',
      width: 90,
      render: (_: any, record: Booking) =>
        record.hasColdChain ? <Tag color="cyan">🧊 冷链</Tag> : null,
    },
    {
      title: '混合状态',
      key: 'mixStatus',
      width: 110,
      render: (_: any, record: Booking) => {
        if (!record.mixStatus || record.mixStatus === MixStatus.ALL_CLEAR) return null;
        const info = MixStatusMap[record.mixStatus];
        return <Tag color={info?.color || 'default'}>{info?.label || record.mixStatus}</Tag>;
      },
    },
    {
      title: '队列类型',
      key: 'queueType',
      width: 150,
      render: (_: any, record: Booking) => {
        if (!record.queueType) return null;
        const info = QueueTypeMap[record.queueType];
        return <Tag color={info?.color || 'default'}>{info?.label || record.queueType}</Tag>;
      },
    },
    {
      title: '放行凭证',
      key: 'releaseVoucher',
      width: 140,
      render: (_: any, record: Booking) => {
        if (!record.releaseVoucherNo) return null;
        const isReissued = record.releaseVoucherStatus === ReleaseVoucherStatus.REISSUED;
        return (
          <Space direction="vertical" size={2}>
            <Tag color="purple">{record.releaseVoucherNo}</Tag>
            {isReissued && <Tag color="orange">已重开</Tag>}
          </Space>
        );
      },
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
      width: 90,
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
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: Booking) => (
        <Space size="small" wrap>
          {canTriggerCustoms(record) && (
            <Button
              type="link"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => handleTriggerCustoms(record)}
            >
              触发抽检
            </Button>
          )}
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

  const customsStatusOptions = [
    BookingStatus.CUSTOMS_PENDING,
    BookingStatus.CUSTOMS_INSPECTING,
    BookingStatus.CUSTOMS_PASSED,
    BookingStatus.PARTIAL_RELEASED,
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>预约管理</h2>
        <Space>
          <Select
            placeholder="状态筛选"
            style={{ width: 180 }}
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => {
              setStatusFilter(v || '');
              setPage(1);
            }}
          >
            {Object.entries(BookingStatusMap).map(([key, value]) => (
              <Option key={key} value={key}>
                {customsStatusOptions.includes(key as BookingStatus) ? '🛃 ' : ''}
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
        scroll={{ x: 2200 }}
        expandable={{
          expandedRowRender,
          expandedRowKeys,
          onExpand,
          defaultExpandAllRows: false,
        }}
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
        width={680}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSubmitMode('SINGLE');
          setSelectedWaybills([]);
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="提交模式" required>
            <RadioGroup
              value={submitMode}
              onChange={(e) => {
                setSubmitMode(e.target.value);
                setSelectedWaybills([]);
                form.setFieldsValue({
                  waybillNo: undefined,
                  waybillNoList: [],
                });
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio value="SINGLE">单运单提交</Radio>
              <Radio value="MULTI">多运单提交（一车多票）</Radio>
            </RadioGroup>
          </Form.Item>

          {submitMode === 'SINGLE' ? (
            <Form.Item
              name="waybillNo"
              label="运单号"
              rules={[{ required: true, message: '请选择运单' }]}
            >
              <Select placeholder="请选择运单" showSearch optionFilterProp="label">
                {waybills.map((w) => (
                  <Option key={w.waybillNo} value={w.waybillNo} label={renderWaybillOptionLabel(w)}>
                    {renderWaybillOptionLabel(w)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="waybillNoList"
                label="运单号（可多选多个运单号）"
                rules={[{ required: true, message: '请选择至少一个运单' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="可多选多个运单号"
                  showSearch
                  optionFilterProp="label"
                  maxTagCount="responsive"
                  value={selectedWaybills}
                  onChange={(v) => setSelectedWaybills(v)}
                  style={{ width: '100%' }}
                >
                  {waybills.map((w) => (
                    <Option key={w.waybillNo} value={w.waybillNo} label={renderWaybillOptionLabel(w)}>
                      {renderWaybillOptionLabel(w)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              {selectedWaybillInfo.count > 0 && (
                <Form.Item label="汇总信息">
                  <Space size="middle" wrap>
                    <Tag color="blue">已选 {selectedWaybillInfo.count} 票</Tag>
                    {selectedWaybillInfo.coldCount > 0 && (
                      <Tag color="cyan">冷链 {selectedWaybillInfo.coldCount} 票 🧊</Tag>
                    )}
                    <Tag color="green">总件数：{selectedWaybillInfo.totalPieces} 件</Tag>
                    {selectedWaybillInfo.hasColdChain && (
                      <Tag color="geekblue">⚠️ 整车按冷链队列优先调度</Tag>
                    )}
                  </Space>
                </Form.Item>
              )}
            </>
          )}

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
              <Button
                onClick={() => {
                  setModalVisible(false);
                  form.resetFields();
                  setSubmitMode('SINGLE');
                  setSelectedWaybills([]);
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {submitMode === 'MULTI' ? `提交预约（${selectedWaybillInfo.count}票）` : '提交预约'}
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
