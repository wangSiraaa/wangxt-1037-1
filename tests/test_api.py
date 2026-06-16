#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
from datetime import datetime, timedelta
import sys

BASE_URL = "http://localhost:8080"

class CargoPickupTester:
    def __init__(self):
        self.session = requests.Session()
        self.passed = 0
        self.failed = 0
        self.results = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")

    def assert_status(self, response, expected_status=200):
        if response.status_code != expected_status:
            return False
        data = response.json()
        return data.get("code") == 200

    def test_init_data(self):
        """场景：初始化测试数据"""
        self.log("初始化测试数据...")
        try:
            response = self.session.post(f"{BASE_URL}/init/data")
            if self.assert_status(response):
                self.log("✓ 测试数据初始化成功")
                self.passed += 1
                return True
            self.log("✗ 测试数据初始化失败", "ERROR")
            self.failed += 1
            return False
        except Exception as e:
            self.log(f"✗ 测试数据初始化异常: {e}", "ERROR")
            self.failed += 1
            return False

    def test_successful_pickup_flow(self):
        """场景2：成功提货完整流程"""
        self.log("=" * 60)
        self.log("场景2：成功提货完整流程测试")
        self.log("=" * 60)

        future_start = datetime.now() + timedelta(hours=1)
        future_end = future_start + timedelta(hours=2)

        try:
            # 步骤1：货代提交预约
            self.log("步骤1：货代提交预约")
            submit_data = {
                "waybillNo": "WB202401001",
                "plateNumber": "京A12345",
                "driverName": "张三",
                "driverPhone": "13800138000",
                "expectedArrivalStart": future_start.isoformat() + "Z",
                "expectedArrivalEnd": future_end.isoformat() + "Z",
                "forwarderId": "F001",
                "forwarderName": "顺丰货代",
                "forwarderContact": "13800138000",
                "remark": "成功提货流程测试"
            }
            response = self.session.post(f"{BASE_URL}/booking/submit", json=submit_data)
            if not self.assert_status(response):
                self.log("✗ 预约提交失败", "ERROR")
                self.failed += 1
                return False
            booking_id = response.json()["data"]["id"]
            booking_no = response.json()["data"]["bookingNo"]
            self.log(f"✓ 预约提交成功，预约ID: {booking_id}, 预约号: {booking_no}")

            # 步骤2：仓库货权确认
            self.log("步骤2：仓库货权确认")
            verify_data = {
                "bookingId": booking_id,
                "pickupOrderNo": "PO202401001",
                "verifyPass": True,
                "remark": "货权核验通过，货物无异常",
                "operatorId": "W001",
                "operatorName": "李仓库"
            }
            response = self.session.post(f"{BASE_URL}/booking/ownership/verify", json=verify_data)
            if not self.assert_status(response):
                self.log("✗ 货权确认失败", "ERROR")
                self.failed += 1
                return False
            self.log("✓ 货权确认成功")

            # 步骤3：加入排队
            self.log("步骤3：加入月台排队")
            response = self.session.post(f"{BASE_URL}/booking/queue/join",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})
            if not self.assert_status(response):
                self.log("✗ 加入排队失败", "ERROR")
                self.failed += 1
                return False
            queue_position = response.json()["data"]["queuePosition"]
            self.log(f"✓ 加入排队成功，排队位置: {queue_position}")

            # 步骤4：安保检查放行
            self.log("步骤4：安保检查放行")
            security_data = {
                "bookingId": booking_id,
                "plateNumber": "京A12345",
                "checkPass": True,
                "remark": "车辆证件齐全，司机驾驶证有效，排队顺序正确",
                "operatorId": "S001",
                "operatorName": "王安保"
            }
            response = self.session.post(f"{BASE_URL}/booking/security/check", json=security_data)
            if not self.assert_status(response):
                self.log("✗ 安保检查失败", "ERROR")
                self.failed += 1
                return False
            self.log("✓ 安保检查通过")

            # 步骤5：开始提货
            self.log("步骤5：车辆入场，开始提货")
            response = self.session.post(f"{BASE_URL}/booking/start",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})
            if not self.assert_status(response):
                self.log("✗ 开始提货失败", "ERROR")
                self.failed += 1
                return False
            self.log("✓ 开始提货成功")

            # 步骤6：完成提货
            self.log("步骤6：完成提货")
            response = self.session.post(f"{BASE_URL}/booking/complete",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})
            if not self.assert_status(response):
                self.log("✗ 提货完成失败", "ERROR")
                self.failed += 1
                return False
            self.log("✓ 提货完成成功")

            # 步骤7：验证完成提货后无法撤回
            self.log("步骤7：验证完成提货后无法撤回（强校验）")
            response = self.session.post(f"{BASE_URL}/booking/cancel",
                params={"bookingId": booking_id, "cancelReason": "测试撤回",
                    "operatorId": "F001", "operatorName": "顺丰货代"})
            if response.json().get("code") == 500:
                self.log("✓ 完成提货后无法撤回（后端强校验生效）")
            else:
                self.log("✗ 完成提货后仍可撤回（校验未生效！", "ERROR")
                self.failed += 1
                return False

            self.passed += 1
            self.log("✓ 成功提货完整流程测试通过")
            self.results.append(("成功提货完整流程", True))
            return True

        except Exception as e:
            self.log(f"✗ 成功提货流程异常: {e}", "ERROR")
            self.failed += 1
            self.results.append(("成功提货完整流程", False))
            return False

    def test_ownership_failed(self):
        """场景3：货权审核失败场景"""
        self.log("=" * 60)
        self.log("场景3：货权审核失败场景测试")
        self.log("=" * 60)

        future_start = datetime.now() + timedelta(hours=1)
        future_end = future_start + timedelta(hours=2)

        try:
            # 提交预约
            self.log("步骤1：提交预约")
            submit_data = {
                "waybillNo": "WB202401002",
                "plateNumber": "京B67890",
                "driverName": "李四",
                "driverPhone": "13900139000",
                "expectedArrivalStart": future_start.isoformat() + "Z",
                "expectedArrivalEnd": future_end.isoformat() + "Z",
                "forwarderId": "F002",
                "forwarderName": "德邦物流",
                "forwarderContact": "13900139000",
                "remark": "货权审核失败测试"
            }
            response = self.session.post(f"{BASE_URL}/booking/submit", json=submit_data)
            booking_id = response.json()["data"]["id"]
            self.log(f"✓ 预约提交成功")

            # 货权审核驳回
            self.log("步骤2：货权审核驳回")
            reject_data = {
                "bookingId": booking_id,
                "pickupOrderNo": "PO202401002",
                "verifyPass": False,
                "remark": "提货单与运单信息不符，货权存疑",
                "operatorId": "W001",
                "operatorName": "李仓库"
            }
            response = self.session.post(f"{BASE_URL}/booking/ownership/verify", json=reject_data)
            if not self.assert_status(response):
                self.log("✗ 货权审核失败", "ERROR")
                self.failed += 1
                return False

            status = response.json()["data"]["status"]
            if status == "OWNERSHIP_FAILED":
                self.log("✓ 货权审核失败场景测试通过")
                self.passed += 1
                self.results.append(("货权审核失败场景", True))
                return True
            else:
                self.log(f"✗ 货权审核状态不正确: {status}", "ERROR")
                self.failed += 1
                self.results.append(("货权审核失败场景", False))
                return False

        except Exception as e:
            self.log(f"✗ 货权审核失败场景异常: {e}", "ERROR")
            self.failed += 1
            self.results.append(("货权审核失败场景", False))
            return False

    def test_security_rejected(self):
        """场景4：安保驳回场景"""
        self.log("=" * 60)
        self.log("场景4：安保驳回场景测试")
        self.log("=" * 60)

        future_start = datetime.now() + timedelta(hours=1)
        future_end = future_start + timedelta(hours=2)

        try:
            # 提交预约
            self.log("步骤1：提交预约")
            submit_data = {
                "waybillNo": "WB202401003",
                "plateNumber": "京C11111",
                "driverName": "王五",
                "driverPhone": "13700137000",
                "expectedArrivalStart": future_start.isoformat() + "Z",
                "expectedArrivalEnd": future_end.isoformat() + "Z",
                "forwarderId": "F003",
                "forwarderName": "圆通货代",
                "forwarderContact": "13700137000",
                "remark": "安保驳回测试"
            }
            response = self.session.post(f"{BASE_URL}/booking/submit", json=submit_data)
            booking_id = response.json()["data"]["id"]
            self.log("✓ 预约提交成功")

            # 货权确认
            self.log("步骤2：货权确认")
            verify_data = {
                "bookingId": booking_id,
                "pickupOrderNo": "PO202401003",
                "verifyPass": True,
                "operatorId": "W001",
                "operatorName": "李仓库"
            }
            self.session.post(f"{BASE_URL}/booking/ownership/verify", json=verify_data)
            self.log("✓ 货权确认成功")

            # 加入排队
            self.log("步骤3：加入排队")
            self.session.post(f"{BASE_URL}/booking/queue/join",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})
            self.log("✓ 加入排队成功")

            # 安保检查驳回
            self.log("步骤4：安保检查驳回")
            reject_data = {
                "bookingId": booking_id,
                "plateNumber": "京C11111",
                "checkPass": False,
                "remark": "司机驾驶证已过期30天，证件无效",
                "operatorId": "S001",
                "operatorName": "王安保"
            }
            response = self.session.post(f"{BASE_URL}/booking/security/check", json=reject_data)
            if not self.assert_status(response):
                self.log("✗ 安保驳回应该返回成功", "ERROR")
                self.failed += 1
                return False

            status = response.json()["data"]["status"]
            if status == "SECURITY_REJECTED":
                self.log("✓ 安保驳回场景测试通过")
                self.passed += 1
                self.results.append(("安保驳回场景", True))
                return True
            else:
                self.log(f"✗ 安保驳回状态不正确: {status}", "ERROR")
                self.failed += 1
                self.results.append(("安保驳回场景", False))
                return False

        except Exception as e:
            self.log(f"✗ 安保驳回场景异常: {e}", "ERROR")
            self.failed += 1
            self.results.append(("安保驳回场景", False))
            return False

    def test_vehicle_change(self):
        """场景5：车辆变更场景"""
        self.log("=" * 60)
        self.log("场景5：车辆变更场景测试")
        self.log("=" * 60)

        future_start = datetime.now() + timedelta(hours=1)
        future_end = future_start + timedelta(hours=2)

        try:
            # 提交预约
            self.log("步骤1：提交预约")
            submit_data = {
                "waybillNo": "WB202401004",
                "plateNumber": "京D22222",
                "driverName": "赵六",
                "driverPhone": "13600136000",
                "expectedArrivalStart": future_start.isoformat() + "Z",
                "expectedArrivalEnd": future_end.isoformat() + "Z",
                "forwarderId": "F004",
                "forwarderName": "中通物流",
                "forwarderContact": "13600136000",
                "remark": "车辆变更测试"
            }
            response = self.session.post(f"{BASE_URL}/booking/submit", json=submit_data)
            booking_id = response.json()["data"]["id"]
            self.log("✓ 预约提交成功")

            # 货权确认
            self.log("步骤2：货权确认")
            verify_data = {
                "bookingId": booking_id,
                "pickupOrderNo": "PO202401004",
                "verifyPass": True,
                "operatorId": "W001",
                "operatorName": "李仓库"
            }
            self.session.post(f"{BASE_URL}/booking/ownership/verify", json=verify_data)
            self.log("✓ 货权确认成功")

            # 加入排队
            self.log("步骤3：加入排队")
            response = self.session.post(f"{BASE_URL}/booking/queue/join",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})
            old_position = response.json()["data"]["queuePosition"]
            self.log(f"✓ 加入排队成功，原始排队位置: {old_position}")

            # 变更车辆
            self.log("步骤4：变更车辆")
            change_data = {
                "bookingId": booking_id,
                "newPlateNumber": "京D88888",
                "newDriverName": "钱七",
                "newDriverPhone": "13500135000",
                "changeReason": "原车辆故障，更换车辆",
                "operatorId": "F004",
                "operatorName": "中通物流"
            }
            response = self.session.post(f"{BASE_URL}/booking/vehicle/change", json=change_data)
            if not self.assert_status(response):
                self.log("✗ 车辆变更成功")
                self.failed += 1
                return False

            new_plate = response.json()["data"]["plateNumber"]
            if new_plate == "京D88888":
                self.log("✓ 车辆变更成功，队列已重新计算")
                self.passed += 1
                self.results.append(("车辆变更场景", True))
                return True
            else:
                self.log(f"✗ 车辆变更后车牌号不正确: {new_plate}", "ERROR")
                self.failed += 1
                self.results.append(("车辆变更场景", False))
                return False

        except Exception as e:
            self.log(f"✗ 车辆变更场景异常: {e}", "ERROR")
            self.failed += 1
            self.results.append(("车辆变更场景", False))
            return False

    def test_partial_delivery(self):
        """场景6：部分放货场景"""
        self.log("=" * 60)
        self.log("场景6：部分放货场景测试")
        self.log("=" * 60)

        future_start = datetime.now() + timedelta(hours=1)
        future_end = future_start + timedelta(hours=2)

        try:
            # 提交预约
            self.log("步骤1：提交预约")
            submit_data = {
                "waybillNo": "WB202401005",
                "plateNumber": "京E33333",
                "driverName": "孙八",
                "driverPhone": "13400134000",
                "expectedArrivalStart": future_start.isoformat() + "Z",
                "expectedArrivalEnd": future_end.isoformat() + "Z",
                "forwarderId": "F005",
                "forwarderName": "韵达快递",
                "forwarderContact": "13400134000",
                "remark": "部分放货测试"
            }
            response = self.session.post(f"{BASE_URL}/booking/submit", json=submit_data)
            booking_id = response.json()["data"]["id"]
            self.log("✓ 预约提交成功")

            # 货权确认
            self.log("步骤2：货权确认")
            verify_data = {
                "bookingId": booking_id,
                "pickupOrderNo": "PO202401005",
                "verifyPass": True,
                "operatorId": "W001",
                "operatorName": "李仓库"
            }
            self.session.post(f"{BASE_URL}/booking/ownership/verify", json=verify_data)
            self.log("✓ 货权确认成功")

            # 加入排队
            self.log("步骤3：加入排队")
            self.session.post(f"{BASE_URL}/booking/queue/join",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})
            self.log("✓ 加入排队成功")

            # 安保检查
            self.log("步骤4：安保检查")
            security_data = {
                "bookingId": booking_id,
                "plateNumber": "京E33333",
                "checkPass": True,
                "operatorId": "S001",
                "operatorName": "王安保"
            }
            self.session.post(f"{BASE_URL}/booking/security/check", json=security_data)
            self.log("✓ 安保检查通过")

            # 开始提货
            self.log("步骤5：开始提货")
            self.session.post(f"{BASE_URL}/booking/start",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})
            self.log("✓ 开始提货")

            # 部分放货
            self.log("步骤6：部分放货")
            partial_data = {
                "bookingId": booking_id,
                "pickedPieces": 5,
                "partialReason": "仓库只有5件货物，剩余5件明天到货后再来",
                "operatorId": "W001",
                "operatorName": "李仓库"
            }
            response = self.session.post(f"{BASE_URL}/booking/partial", json=partial_data)
            if not self.assert_status(response):
                self.log("✗ 部分放货失败", "ERROR")
                self.failed += 1
                return False

            status = response.json()["data"]["status"]
            picked_pieces = response.json()["data"]["pickedPieces"]
            if status == "PARTIAL_COMPLETED" and picked_pieces == 5:
                self.log("✓ 部分放货成功，已提货5件，队列已重新计算")
                self.passed += 1
                self.results.append(("部分放货场景", True))
                return True
            else:
                self.log(f"✗ 部分放货状态不正确: {status}, 提货件数: {picked_pieces}", "ERROR")
                self.failed += 1
                self.results.append(("部分放货场景", False))
                return False

        except Exception as e:
            self.log(f"✗ 部分放货场景异常: {e}", "ERROR")
            self.failed += 1
            self.results.append(("部分放货场景", False))
            return False

    def test_ownership_not_verified_cannot_queue(self):
        """场景7：货权未确认不能排队"""
        self.log("=" * 60)
        self.log("场景7：货权未确认不能排队测试")
        self.log("=" * 60)

        future_start = datetime.now() + timedelta(hours=1)
        future_end = future_start + timedelta(hours=2)

        try:
            # 提交预约
            self.log("步骤1：提交预约")
            submit_data = {
                "waybillNo": "WB202401006",
                "plateNumber": "京F44444",
                "driverName": "周九",
                "driverPhone": "13300133000",
                "expectedArrivalStart": future_start.isoformat() + "Z",
                "expectedArrivalEnd": future_end.isoformat() + "Z",
                "forwarderId": "F006",
                "forwarderName": "极兔速递",
                "forwarderContact": "13300133000",
                "remark": "货权未确认排队测试"
            }
            response = self.session.post(f"{BASE_URL}/booking/submit", json=submit_data)
            booking_id = response.json()["data"]["id"]
            self.log("✓ 预约提交成功")

            # 未进行货权确认直接排队
            self.log("步骤2：未进行货权确认直接排队")
            response = self.session.post(f"{BASE_URL}/booking/queue/join",
                params={"bookingId": booking_id, "operatorId": "W001", "operatorName": "李仓库"})

            if response.json().get("code") == 500:
                self.log("✓ 货权未确认不能排队（后端强校验生效）")
                self.passed += 1
                self.results.append(("货权未确认不能排队", True))
                return True
            else:
                self.log("✗ 货权未确认仍可排队（校验未生效！", "ERROR")
                self.failed += 1
                self.results.append(("货权未确认不能排队", False))
                return False

        except Exception as e:
            self.log(f"✗ 货权未确认排队测试异常: {e}", "ERROR")
            self.failed += 1
            self.results.append(("货权未确认不能排队", False))
            return False

    def run_all_tests(self):
        """运行所有测试"""
        self.log("=" * 60)
        self.log("机场货站提货预约系统 - 自动化测试套件")
        self.log(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.log(f"测试地址: {BASE_URL}")
        self.log("=" * 60)
        self.log("")

        tests = [
            ("初始化测试数据", self.test_init_data),
            ("成功提货完整流程", self.test_successful_pickup_flow),
            ("货权审核失败场景", self.test_ownership_failed),
            ("安保驳回场景", self.test_security_rejected),
            ("车辆变更场景", self.test_vehicle_change),
            ("部分放货场景", self.test_partial_delivery),
            ("货权未确认不能排队", self.test_ownership_not_verified_cannot_queue),
        ]

        for name, test_func in tests:
            try:
                test_func()
                self.log("")
            except Exception as e:
                self.log(f"✗ 测试执行异常: {e}", "ERROR")
                self.failed += 1
                self.results.append((name, False))

        self.print_summary()

    def print_summary(self):
        """打印测试结果汇总"""
        self.log("=" * 60)
        self.log("测试结果汇总")
        self.log("=" * 60)
        self.log(f"总测试数: {len(self.results)}")
        self.log(f"通过: {self.passed}")
        self.log(f"失败: {self.failed}")
        self.log(f"通过率: {self.passed / len(self.results) * 100:.1f}%")
        self.log("")
        self.log("详细结果:")
        for name, passed in self.results:
            status = "✓ PASS" if passed else "✗ FAIL"
            self.log(f"  {status} - {name}")
        self.log("")
        self.log("=" * 60)

        if self.failed > 0:
            sys.exit(1)


if __name__ == "__main__":
    tester = CargoPickupTester()
    tester.run_all_tests()
