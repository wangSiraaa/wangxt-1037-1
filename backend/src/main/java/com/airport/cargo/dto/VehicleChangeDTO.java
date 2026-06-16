package com.airport.cargo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VehicleChangeDTO {

    @NotNull(message = "预约ID不能为空")
    private Long bookingId;

    @NotBlank(message = "新车牌号不能为空")
    private String newPlateNumber;

    private String newDriverName;
    private String newDriverPhone;

    @NotBlank(message = "变更原因不能为空")
    private String changeReason;

    private String operatorId;
    private String operatorName;
}
