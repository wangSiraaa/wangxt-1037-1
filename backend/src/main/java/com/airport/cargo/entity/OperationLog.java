package com.airport.cargo.entity;

import com.airport.cargo.common.BaseEntity;
import com.airport.cargo.enums.BookingStatus;
import com.airport.cargo.enums.OperationType;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("operation_log")
public class OperationLog extends BaseEntity {

    private Long bookingId;

    private String bookingNo;

    private OperationType operationType;

    private BookingStatus fromStatus;

    private BookingStatus toStatus;

    private String operatorId;

    private String operatorName;

    private String operatorRole;

    private LocalDateTime operateTime;

    private String operateIp;

    private String remark;

    private String reason;

    private String beforeData;

    private String afterData;

    private String extraInfo;
}
