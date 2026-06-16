package com.airport.cargo.entity;

import com.airport.cargo.common.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("queue_item")
public class QueueItem extends BaseEntity {

    private String queueCode;

    private Long bookingId;

    private String bookingNo;

    private String plateNumber;

    private String driverName;

    private String queueType;

    private Integer position;

    private Integer priority;

    private LocalDateTime joinTime;

    private LocalDateTime leaveTime;

    private String leaveReason;

    private Integer requeueCount;

    private LocalDateTime estimatedCallTime;

    private LocalDateTime estimatedArrivalWindowStart;

    private LocalDateTime estimatedArrivalWindowEnd;

    private String status;

    private String remark;
}
