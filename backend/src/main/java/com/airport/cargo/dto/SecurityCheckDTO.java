package com.airport.cargo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SecurityCheckDTO {

    @NotNull(message = "预约ID不能为空")
    private Long bookingId;

    @NotBlank(message = "车牌号不能为空")
    private String plateNumber;

    private Boolean checkPass;

    private String remark;

    private String operatorId;
    private String operatorName;
}
