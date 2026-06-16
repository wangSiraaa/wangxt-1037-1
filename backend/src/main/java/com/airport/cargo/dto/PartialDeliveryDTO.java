package com.airport.cargo.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PartialDeliveryDTO {

    @NotNull(message = "预约ID不能为空")
    private Long bookingId;

    @NotNull(message = "提货件数不能为空")
    @Min(value = 1, message = "提货件数必须大于0")
    private Integer pickedPieces;

    @NotBlank(message = "部分放货原因不能为空")
    private String partialReason;

    private String operatorId;
    private String operatorName;
}
