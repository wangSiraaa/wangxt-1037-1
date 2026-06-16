package com.airport.cargo.entity;

import com.airport.cargo.common.BaseEntity;
import com.airport.cargo.enums.CargoStatus;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("waybill")
public class Waybill extends BaseEntity {

    private String waybillNo;

    private String flightNo;

    private LocalDateTime arrivalTime;

    private String cargoName;

    private BigDecimal cargoWeight;

    private Integer cargoPieces;

    private String cargoUnit;

    private String cargoOwner;

    private String cargoOwnerContact;

    private CargoStatus cargoStatus;

    private Boolean temperatureControlled;

    private String temperatureRange;

    private Boolean customsInspected;

    private LocalDateTime customsInspectTime;

    private String customsInspectOperator;

    private String customsInspectResult;

    private String customsInspectRemark;

    private String lockReason;

    private LocalDateTime lockTime;

    private String lockOperator;

    private BigDecimal unpaidAmount;

    private String storageLocation;

    private String remark;
}
