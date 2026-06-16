package com.airport.cargo.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CustomsInspectDTO {

    @NotNull(message = "预约单ID不能为空")
    private Long bookingId;

    private List<WaybillInspectItem> inspectItems;

    @NotNull(message = "操作人ID不能为空")
    private String operatorId;

    @NotNull(message = "操作人姓名不能为空")
    private String operatorName;

    private String remark;

    @Data
    public static class WaybillInspectItem {
        @NotNull(message = "关系ID不能为空")
        private Long relationId;
        @NotNull(message = "运单ID不能为空")
        private Long waybillId;
        private String waybillNo;
        private Boolean passed;
        private Integer piecesHeld;
        private Integer piecesReleased;
        private String inspectRemark;
    }
}
