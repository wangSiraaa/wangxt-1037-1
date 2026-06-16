import React from 'react';
import { Layout, Menu, Typography, Space } from 'antd';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  CarOutlined,
  ShopOutlined,
  SafetyOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
  DashboardOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import BookingPage from '@/pages/BookingPage';
import OwnershipPage from '@/pages/OwnershipPage';
import QueuePage from '@/pages/QueuePage';
import SecurityPage from '@/pages/SecurityPage';
import TimelinePage from '@/pages/TimelinePage';
import ExceptionPage from '@/pages/ExceptionPage';
import DashboardPage from '@/pages/DashboardPage';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">工作台</Link>,
    },
    {
      key: '/booking',
      icon: <CarOutlined />,
      label: <Link to="/booking">预约管理</Link>,
    },
    {
      key: '/ownership',
      icon: <ShopOutlined />,
      label: <Link to="/ownership">货权查验</Link>,
    },
    {
      key: '/queue',
      icon: <UnorderedListOutlined />,
      label: <Link to="/queue">月台排队</Link>,
    },
    {
      key: '/security',
      icon: <SafetyOutlined />,
      label: <Link to="/security">车辆放行</Link>,
    },
    {
      key: '/exception',
      icon: <WarningOutlined />,
      label: <Link to="/exception">异常处理</Link>,
    },
    {
      key: '/timeline',
      icon: <HistoryOutlined />,
      label: <Link to="/timeline">状态时间线</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Space align="center" style={{ height: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>机场货站提货预约系统</Title>
        </Space>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minHeight: 280,
            }}
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/ownership" element={<OwnershipPage />} />
              <Route path="/queue" element={<QueuePage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/exception" element={<ExceptionPage />} />
              <Route path="/timeline/:id?" element={<TimelinePage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;
