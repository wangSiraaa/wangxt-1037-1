package com.airport.cargo.controller;

import com.airport.cargo.common.Result;
import com.airport.cargo.entity.Vehicle;
import com.airport.cargo.entity.Waybill;
import com.airport.cargo.enums.CargoStatus;
import com.airport.cargo.mapper.VehicleMapper;
import com.airport.cargo.mapper.WaybillMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Tag(name = "初始化数据", description = "测试数据初始化接口")
@RestController
@RequestMapping("/init")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class InitDataController {

    private final WaybillMapper waybillMapper;
    private final VehicleMapper vehicleMapper;

    @Operation(summary = "初始化测试数据", description = "创建运单和车辆测试数据")
    @PostMapping("/data")
    public Result<String> initTestData() {
        Waybill waybill1 = new Waybill();
        waybill1.setWaybillNo("WB20240601001");
        waybill1.setFlightNo("CA1234");
        waybill1.setArrivalTime(LocalDateTime.now().minusDays(1));
        waybill1.setCargoName("电子产品");
        waybill1.setCargoWeight(new BigDecimal("1500.00"));
        waybill1.setCargoPieces(100);
        waybill1.setCargoUnit("箱");
        waybill1.setCargoOwner("华为技术有限公司");
        waybill1.setCargoOwnerContact("13800138001");
        waybill1.setCargoStatus(CargoStatus.NORMAL);
        waybill1.setUnpaidAmount(BigDecimal.ZERO);
        waybill1.setStorageLocation("A区-01-01");
        waybill1.setCreateBy("system");
        waybill1.setUpdateBy("system");
        waybill1.setCreateTime(LocalDateTime.now());
        waybill1.setUpdateTime(LocalDateTime.now());
        waybill1.setDeleted(0);
        waybillMapper.insert(waybill1);

        Waybill waybill2 = new Waybill();
        waybill2.setWaybillNo("WB20240601002");
        waybill2.setFlightNo("MU5678");
        waybill2.setArrivalTime(LocalDateTime.now().minusDays(2));
        waybill2.setCargoName("服装");
        waybill2.setCargoWeight(new BigDecimal("800.00"));
        waybill2.setCargoPieces(50);
        waybill2.setCargoUnit("箱");
        waybill2.setCargoOwner("李宁体育用品有限公司");
        waybill2.setCargoOwnerContact("13900139002");
        waybill2.setCargoStatus(CargoStatus.LOCKED);
        waybill2.setLockReason("海关监管");
        waybill2.setLockTime(LocalDateTime.now().minusHours(2));
        waybill2.setLockOperator("customs");
        waybill2.setUnpaidAmount(BigDecimal.ZERO);
        waybill2.setStorageLocation("B区-02-03");
        waybill2.setCreateBy("system");
        waybill2.setUpdateBy("system");
        waybill2.setCreateTime(LocalDateTime.now());
        waybill2.setUpdateTime(LocalDateTime.now());
        waybill2.setDeleted(0);
        waybillMapper.insert(waybill2);

        Waybill waybill3 = new Waybill();
        waybill3.setWaybillNo("WB20240601003");
        waybill3.setFlightNo("CZ9012");
        waybill3.setArrivalTime(LocalDateTime.now().minusDays(3));
        waybill3.setCargoName("食品");
        waybill3.setCargoWeight(new BigDecimal("500.00"));
        waybill3.setCargoPieces(30);
        waybill3.setCargoUnit("箱");
        waybill3.setCargoOwner("雀巢食品有限公司");
        waybill3.setCargoOwnerContact("13700137003");
        waybill3.setCargoStatus(CargoStatus.NORMAL);
        waybill3.setUnpaidAmount(new BigDecimal("5000.00"));
        waybill3.setStorageLocation("C区-03-05");
        waybill3.setCreateBy("system");
        waybill3.setUpdateBy("system");
        waybill3.setCreateTime(LocalDateTime.now());
        waybill3.setUpdateTime(LocalDateTime.now());
        waybill3.setDeleted(0);
        waybillMapper.insert(waybill3);

        Vehicle vehicle1 = new Vehicle();
        vehicle1.setPlateNumber("京A12345");
        vehicle1.setVehicleType("厢式货车");
        vehicle1.setVehicleColor("白色");
        vehicle1.setVehicleLicenseNo("110101000001");
        vehicle1.setLicenseExpireDate(LocalDate.now().plusYears(1));
        vehicle1.setInsuranceNo("BX20240001");
        vehicle1.setInsuranceExpireDate(LocalDate.now().plusMonths(6));
        vehicle1.setDriverId("DRV001");
        vehicle1.setDriverName("张三");
        vehicle1.setDriverPhone("13800138000");
        vehicle1.setDriverLicenseNo("110101199001010001");
        vehicle1.setDriverLicenseExpireDate(LocalDate.now().plusYears(3));
        vehicle1.setIdCardNo("110101199001010001");
        vehicle1.setIdCardExpireDate(LocalDate.now().plusYears(10));
        vehicle1.setForwarderId("FWD001");
        vehicle1.setForwarderName("顺丰速运");
        vehicle1.setStatus(1);
        vehicle1.setCreateBy("system");
        vehicle1.setUpdateBy("system");
        vehicle1.setCreateTime(LocalDateTime.now());
        vehicle1.setUpdateTime(LocalDateTime.now());
        vehicle1.setDeleted(0);
        vehicleMapper.insert(vehicle1);

        Vehicle vehicle2 = new Vehicle();
        vehicle2.setPlateNumber("京B67890");
        vehicle2.setVehicleType("平板货车");
        vehicle2.setVehicleColor("蓝色");
        vehicle2.setVehicleLicenseNo("110101000002");
        vehicle2.setLicenseExpireDate(LocalDate.now().minusMonths(1));
        vehicle2.setInsuranceNo("BX20240002");
        vehicle2.setInsuranceExpireDate(LocalDate.now().plusMonths(3));
        vehicle2.setDriverId("DRV002");
        vehicle2.setDriverName("李四");
        vehicle2.setDriverPhone("13900139000");
        vehicle2.setDriverLicenseNo("110101198502020002");
        vehicle2.setDriverLicenseExpireDate(LocalDate.now().minusDays(10));
        vehicle2.setIdCardNo("110101198502020002");
        vehicle2.setIdCardExpireDate(LocalDate.now().plusYears(5));
        vehicle2.setForwarderId("FWD002");
        vehicle2.setForwarderName("德邦物流");
        vehicle2.setStatus(1);
        vehicle2.setCreateBy("system");
        vehicle2.setUpdateBy("system");
        vehicle2.setCreateTime(LocalDateTime.now());
        vehicle2.setUpdateTime(LocalDateTime.now());
        vehicle2.setDeleted(0);
        vehicleMapper.insert(vehicle2);

        return Result.success("初始化完成，已创建3个运单和2个车辆测试数据");
    }

    @Operation(summary = "查询运单列表", description = "查询所有运单")
    @GetMapping("/waybills")
    public Result<Object> getWaybills() {
        return Result.success(waybillMapper.selectList(null));
    }

    @Operation(summary = "查询车辆列表", description = "查询所有车辆")
    @GetMapping("/vehicles")
    public Result<Object> getVehicles() {
        return Result.success(vehicleMapper.selectList(null));
    }
}
