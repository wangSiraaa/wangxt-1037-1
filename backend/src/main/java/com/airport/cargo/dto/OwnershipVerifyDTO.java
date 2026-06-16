package com.airport.cargo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OwnershipVerifyDTO {

    @NotNull(message = "预约ID不能为空")
    private Long bookingId;

    @NotBlank(message = "提货单号不能为空")
    private String pickupOrderNo;

    private Boolean verifyPass;

    private String remark;

    private String operatorId;
    private String operatorName;
}
