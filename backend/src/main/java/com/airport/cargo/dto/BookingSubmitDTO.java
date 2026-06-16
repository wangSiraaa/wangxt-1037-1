package com.airport.cargo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookingSubmitDTO {

    @NotBlank(message = "运单号不能为空")
    private String waybillNo;

    @NotBlank(message = "车牌号不能为空")
    private String plateNumber;

    @NotBlank(message = "司机姓名不能为空")
    private String driverName;

    @NotBlank(message = "司机电话不能为空")
    private String driverPhone;

    @NotNull(message = "预计到场开始时间不能为空")
    private LocalDateTime expectedArrivalStart;

    @NotNull(message = "预计到场结束时间不能为空")
    private LocalDateTime expectedArrivalEnd;

    private String forwarderId;
    private String forwarderName;
    private String forwarderContact;
    private String remark;
}
