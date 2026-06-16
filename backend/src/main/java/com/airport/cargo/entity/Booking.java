package com.airport.cargo.entity;

import com.airport.cargo.common.BaseEntity;
import com.airport.cargo.enums.BookingStatus;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("booking")
public class Booking extends BaseEntity {

    private String bookingNo;

    private String forwarderId;

    private String forwarderName;

    private String forwarderContact;

    private String waybillId;

    private String waybillNo;

    private String vehicleId;

    private String plateNumber;

    private String driverId;

    private String driverName;

    private String driverPhone;

    private LocalDateTime expectedArrivalStart;

    private LocalDateTime expectedArrivalEnd;

    private LocalDateTime actualArrivalTime;

    private Integer queuePosition;

    private String queueId;

    private BookingStatus status;

    private String pickupOrderNo;

    private Boolean ownershipVerified;

    private String ownershipOperator;

    private LocalDateTime ownershipTime;

    private String ownershipRemark;

    private Boolean securityChecked;

    private String securityOperator;

    private LocalDateTime securityTime;

    private String securityRemark;

    private LocalDateTime startTime;

    private String startOperator;

    private LocalDateTime completeTime;

    private String completeOperator;

    private Integer totalPieces;

    private Integer pickedPieces;

    private Boolean partialDelivery;

    private String partialReason;

    private String rejectReason;

    private String cancelReason;

    private String platformNo;

    private String remark;

    private Integer version;
}
