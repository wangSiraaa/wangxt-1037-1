package com.airport.cargo.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class QueueRecalculateDTO {

    private Long bookingId;
    private String triggerReason;
    private boolean recalculateQueue;
    private boolean recalculateWindow;
    private boolean reissueVoucher;
    private String originalQueueType;
    private String newQueueType;
    private LocalDateTime newWindowStart;
    private LocalDateTime newWindowEnd;
    private String operatorId;
    private String operatorName;
}
