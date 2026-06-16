package com.airport.cargo.statemachine;

import com.airport.cargo.entity.Booking;
import com.airport.cargo.entity.OperationLog;
import com.airport.cargo.enums.BookingStatus;
import com.airport.cargo.enums.OperationType;
import com.airport.cargo.enums.RoleType;
import com.airport.cargo.mapper.OperationLogMapper;
import com.airport.cargo.mapper.BookingMapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class StateMachineEngine {

    private final BookingMapper bookingMapper;
    private final OperationLogMapper operationLogMapper;
    private final ObjectMapper objectMapper;

    @Transactional(rollbackFor = Exception.class)
    public Booking transition(Booking booking, BookingStatus targetStatus, 
                              OperationType operationType, String operatorId, 
                              String operatorName, RoleType operatorRole, 
                              String reason, String remark) {

        BookingStatus currentStatus = booking.getStatus();
        
        if (!currentStatus.canTransitionTo(targetStatus)) {
            throw new IllegalStateException(
                String.format("无法从状态 %s 转换到 %s", currentStatus.getDesc(), targetStatus.getDesc())
            );
        }

        String beforeData = null;
        try {
            beforeData = objectMapper.writeValueAsString(booking);
        } catch (JsonProcessingException e) {
            log.warn("序列化预约单数据失败", e);
        }

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(targetStatus);
        booking.setVersion(booking.getVersion() == null ? 1 : booking.getVersion() + 1);

        LambdaUpdateWrapper<Booking> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(Booking::getId, booking.getId())
                     .eq(Booking::getVersion, booking.getVersion() - 1);
        
        int updated = bookingMapper.update(booking, updateWrapper);
        if (updated == 0) {
            throw new IllegalStateException("数据已被其他操作修改，请刷新后重试");
        }

        String afterData = null;
        try {
            afterData = objectMapper.writeValueAsString(booking);
        } catch (JsonProcessingException e) {
            log.warn("序列化预约单数据失败", e);
        }

        OperationLog opLog = createOperationLog(booking, operationType, oldStatus, targetStatus, 
            operatorId, operatorName, operatorRole, reason, remark, beforeData, afterData);
        operationLogMapper.insert(opLog);

        log.info("状态机流转成功: bookingNo={}, {} -> {}, operation={}", 
            booking.getBookingNo(), oldStatus.getCode(), targetStatus.getCode(), operationType.getCode());

        return booking;
    }

    private OperationLog createOperationLog(Booking booking, OperationType operationType,
            BookingStatus fromStatus, BookingStatus toStatus, String operatorId,
            String operatorName, RoleType operatorRole, String reason, String remark,
            String beforeData, String afterData) {
        
        OperationLog opLog = new OperationLog();
        opLog.setBookingId(booking.getId());
        opLog.setBookingNo(booking.getBookingNo());
        opLog.setOperationType(operationType);
        opLog.setFromStatus(fromStatus);
        opLog.setToStatus(toStatus);
        opLog.setOperatorId(operatorId);
        opLog.setOperatorName(operatorName);
        opLog.setOperatorRole(operatorRole.getCode());
        opLog.setOperateTime(LocalDateTime.now());
        opLog.setOperateIp("127.0.0.1");
        opLog.setReason(reason);
        opLog.setRemark(remark);
        opLog.setBeforeData(beforeData);
        opLog.setAfterData(afterData);
        return opLog;
    }

    @Transactional(rollbackFor = Exception.class)
    public void logOperation(Booking booking, OperationType operationType, 
                             String operatorId, String operatorName, RoleType operatorRole,
                             String reason, String remark) {
        OperationLog opLog = createOperationLog(booking, operationType, booking.getStatus(), 
            booking.getStatus(), operatorId, operatorName, operatorRole, reason, remark, null, null);
        operationLogMapper.insert(opLog);
    }

    public boolean canTransition(BookingStatus current, BookingStatus target) {
        return current.canTransitionTo(target);
    }
}
