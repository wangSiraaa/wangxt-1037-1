package com.airport.cargo.entity;

import com.airport.cargo.common.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("booking_waybill_relation")
public class BookingWaybillRelation extends BaseEntity {

    private Long bookingId;

    private String bookingNo;

    private Long waybillId;

    private String waybillNo;

    private String waybillStatus;

    private Boolean customsInspected;

    private String customsInspectResult;

    private Integer piecesHeld;

    private Integer piecesReleased;

    private Integer piecesPicked;

    private Integer totalPieces;

    private Boolean temperatureControlled;

    private String remark;
}
