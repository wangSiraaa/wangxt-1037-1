package com.airport.cargo.entity;

import com.airport.cargo.common.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("vehicle")
public class Vehicle extends BaseEntity {

    private String plateNumber;

    private String vehicleType;

    private String vehicleColor;

    private String vehicleLicenseNo;

    private LocalDate licenseExpireDate;

    private String vehicleLicenseImg;

    private String insuranceNo;

    private LocalDate insuranceExpireDate;

    private String driverId;

    private String driverName;

    private String driverPhone;

    private String driverLicenseNo;

    private LocalDate driverLicenseExpireDate;

    private String driverLicenseImg;

    private String idCardNo;

    private LocalDate idCardExpireDate;

    private String idCardImg;

    private String forwarderId;

    private String forwarderName;

    private Integer status;

    private String remark;
}
