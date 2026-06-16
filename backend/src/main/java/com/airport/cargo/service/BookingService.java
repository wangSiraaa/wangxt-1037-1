package com.airport.cargo.service;

import com.airport.cargo.common.BusinessException;
import com.airport.cargo.dto.*;
import com.airport.cargo.entity.Booking;
import com.airport.cargo.entity.OperationLog;
import com.airport.cargo.entity.Vehicle;
import com.airport.cargo.entity.Waybill;
import com.airport.cargo.enums.BookingStatus;
import com.airport.cargo.enums.OperationType;
import com.airport.cargo.enums.RoleType;
import com.airport.cargo.mapper.BookingMapper;
import com.airport.cargo.mapper.OperationLogMapper;
import com.airport.cargo.mapper.VehicleMapper;
import com.airport.cargo.mapper.WaybillMapper;
import com.airport.cargo.statemachine.StateMachineEngine;
import com.airport.cargo.validator.BusinessValidator;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingMapper bookingMapper;
    private final WaybillMapper waybillMapper;
    private final VehicleMapper vehicleMapper;
    private final OperationLogMapper operationLogMapper;
    private final StateMachineEngine stateMachineEngine;
    private final BusinessValidator validator;
    private final QueueService queueService;

    @Transactional(rollbackFor = Exception.class)
    public Booking createBooking(BookingSubmitDTO dto) {
        Waybill waybill = waybillMapper.findByWaybillNo(dto.getWaybillNo());
        if (waybill == null) {
            throw new BusinessException("运单不存在: " + dto.getWaybillNo());
        }

        Vehicle vehicle = vehicleMapper.findByPlateNumber(dto.getPlateNumber());

        Booking booking = new Booking();
        booking.setBookingNo(generateBookingNo());
        booking.setForwarderId(dto.getForwarderId());
        booking.setForwarderName(dto.getForwarderName());
        booking.setForwarderContact(dto.getForwarderContact());
        booking.setWaybillId(waybill.getId().toString());
        booking.setWaybillNo(waybill.getWaybillNo());
        booking.setVehicleId(vehicle != null ? vehicle.getId().toString() : null);
        booking.setPlateNumber(dto.getPlateNumber());
        booking.setDriverName(dto.getDriverName());
        booking.setDriverPhone(dto.getDriverPhone());
        booking.setExpectedArrivalStart(dto.getExpectedArrivalStart());
        booking.setExpectedArrivalEnd(dto.getExpectedArrivalEnd());
        booking.setStatus(BookingStatus.SUBMITTED);
        booking.setTotalPieces(waybill.getCargoPieces());
        booking.setPickedPieces(0);
        booking.setOwnershipVerified(false);
        booking.setSecurityChecked(false);
        booking.setPartialDelivery(false);
        booking.setVersion(1);
        booking.setRemark(dto.getRemark());

        validator.throwIfInvalid(validator.validateBookingSubmission(booking, waybill, vehicle));
        
        bookingMapper.insert(booking);

        stateMachineEngine.logOperation(booking, OperationType.SUBMIT, 
            dto.getForwarderId(), dto.getForwarderName(), RoleType.FORWARDER, 
            "提交预约", dto.getRemark());

        log.info("创建预约成功: bookingNo={}", booking.getBookingNo());
        return booking;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking verifyOwnership(OwnershipVerifyDTO dto) {
        Booking booking = getBooking(dto.getBookingId());
        Waybill waybill = waybillMapper.selectById(Long.parseLong(booking.getWaybillId()));

        if (dto.getVerifyPass() != null && !dto.getVerifyPass()) {
            booking.setRejectReason(dto.getRemark());
            Booking result = stateMachineEngine.transition(booking, BookingStatus.OWNERSHIP_FAILED,
                OperationType.OWNERSHIP_REJECT, dto.getOperatorId(), dto.getOperatorName(),
                RoleType.WAREHOUSE, dto.getRemark(), "货权审核失败");
            return result;
        }

        validator.throwIfInvalid(validator.validateOwnershipVerification(booking, waybill, dto.getPickupOrderNo()));

        booking.setPickupOrderNo(dto.getPickupOrderNo());
        booking.setOwnershipVerified(true);
        booking.setOwnershipOperator(dto.getOperatorName());
        booking.setOwnershipTime(LocalDateTime.now());
        booking.setOwnershipRemark(dto.getRemark());

        Booking result = stateMachineEngine.transition(booking, BookingStatus.OWNERSHIP_VERIFIED,
            OperationType.OWNERSHIP_VERIFY, dto.getOperatorId(), dto.getOperatorName(),
            RoleType.WAREHOUSE, "货权审核通过", dto.getRemark());

        log.info("货权确认成功: bookingNo={}", booking.getBookingNo());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking joinQueue(Long bookingId, String operatorId, String operatorName) {
        Booking booking = getBooking(bookingId);
        validator.throwIfInvalid(validator.validateQueueJoin(booking));

        Booking result = stateMachineEngine.transition(booking, BookingStatus.QUEUED,
            OperationType.JOIN_QUEUE, operatorId, operatorName, RoleType.WAREHOUSE,
            "加入排队", null);

        queueService.joinQueue(result);

        log.info("加入排队成功: bookingNo={}, position={}", result.getBookingNo(), result.getQueuePosition());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking securityCheck(SecurityCheckDTO dto) {
        Booking booking = getBooking(dto.getBookingId());
        Vehicle vehicle = vehicleMapper.findByPlateNumber(dto.getPlateNumber());

        if (dto.getCheckPass() != null && !dto.getCheckPass()) {
            queueService.leaveQueue(booking.getId(), "安保检查驳回");
            booking.setRejectReason(dto.getRemark());
            Booking result = stateMachineEngine.transition(booking, BookingStatus.SECURITY_REJECTED,
                OperationType.SECURITY_REJECT, dto.getOperatorId(), dto.getOperatorName(),
                RoleType.SECURITY, dto.getRemark(), "安保检查驳回");
            return result;
        }

        validator.throwIfInvalid(validator.validateSecurityCheck(booking, vehicle));

        booking.setSecurityChecked(true);
        booking.setSecurityOperator(dto.getOperatorName());
        booking.setSecurityTime(LocalDateTime.now());
        booking.setSecurityRemark(dto.getRemark());

        queueService.leaveQueue(booking.getId(), "安保检查通过");

        Booking result = stateMachineEngine.transition(booking, BookingStatus.SECURITY_CHECKED,
            OperationType.SECURITY_CHECK, dto.getOperatorId(), dto.getOperatorName(),
            RoleType.SECURITY, "安保检查通过", dto.getRemark());

        log.info("安保检查通过: bookingNo={}", booking.getBookingNo());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking startPickup(Long bookingId, String operatorId, String operatorName) {
        Booking booking = getBooking(bookingId);

        booking.setActualArrivalTime(LocalDateTime.now());
        booking.setStartTime(LocalDateTime.now());
        booking.setStartOperator(operatorName);

        Booking result = stateMachineEngine.transition(booking, BookingStatus.IN_PROGRESS,
            OperationType.START_PICKUP, operatorId, operatorName, RoleType.WAREHOUSE,
            "开始提货", null);

        log.info("开始提货: bookingNo={}", booking.getBookingNo());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking partialDelivery(PartialDeliveryDTO dto) {
        Booking booking = getBooking(dto.getBookingId());

        validator.throwIfInvalid(validator.validatePartialDelivery(booking, dto.getPickedPieces()));

        int alreadyPicked = booking.getPickedPieces() == null ? 0 : booking.getPickedPieces();
        booking.setPickedPieces(alreadyPicked + dto.getPickedPieces());
        booking.setPartialDelivery(true);
        booking.setPartialReason(dto.getPartialReason());

        stateMachineEngine.logOperation(booking, OperationType.PARTIAL_DELIVERY,
            dto.getOperatorId(), dto.getOperatorName(), RoleType.WAREHOUSE,
            dto.getPartialReason(), String.format("本次提货%d件，累计%d件", 
                dto.getPickedPieces(), booking.getPickedPieces()));

        Booking result = stateMachineEngine.transition(booking, BookingStatus.PARTIAL_COMPLETED,
            OperationType.PARTIAL_DELIVERY, dto.getOperatorId(), dto.getOperatorName(),
            RoleType.WAREHOUSE, dto.getPartialReason(), String.format("部分提货完成"));

        queueService.requeue(booking.getId(), "部分放货后重新排队");

        log.info("部分放货: bookingNo={}, picked={}, total={}", 
            booking.getBookingNo(), dto.getPickedPieces(), booking.getPickedPieces());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking completePickup(Long bookingId, String operatorId, String operatorName) {
        Booking booking = getBooking(bookingId);

        if (booking.getTotalPieces() != null) {
            int alreadyPicked = booking.getPickedPieces() == null ? 0 : booking.getPickedPieces();
            if (alreadyPicked < booking.getTotalPieces()) {
                booking.setPickedPieces(booking.getTotalPieces());
            }
        }

        booking.setCompleteTime(LocalDateTime.now());
        booking.setCompleteOperator(operatorName);

        Booking result = stateMachineEngine.transition(booking, BookingStatus.COMPLETED,
            OperationType.COMPLETE_PICKUP, operatorId, operatorName, RoleType.WAREHOUSE,
            "提货完成", null);

        log.info("提货完成: bookingNo={}", booking.getBookingNo());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking changeVehicle(VehicleChangeDTO dto) {
        Booking booking = getBooking(dto.getBookingId());

        validator.throwIfInvalid(validator.validateVehicleChange(booking));

        Vehicle oldVehicle = vehicleMapper.findByPlateNumber(booking.getPlateNumber());
        Vehicle newVehicle = vehicleMapper.findByPlateNumber(dto.getNewPlateNumber());

        String beforeData = String.format("车牌号: %s, 司机: %s", 
            booking.getPlateNumber(), booking.getDriverName());

        booking.setVehicleId(newVehicle != null ? newVehicle.getId().toString() : null);
        booking.setPlateNumber(dto.getNewPlateNumber());
        if (StrUtil.isNotBlank(dto.getNewDriverName())) {
            booking.setDriverName(dto.getNewDriverName());
        }
        if (StrUtil.isNotBlank(dto.getNewDriverPhone())) {
            booking.setDriverPhone(dto.getNewDriverPhone());
        }
        booking.setVersion(booking.getVersion() + 1);
        bookingMapper.updateById(booking);

        String afterData = String.format("车牌号: %s, 司机: %s", 
            booking.getPlateNumber(), booking.getDriverName());

        stateMachineEngine.logOperation(booking, OperationType.VEHICLE_CHANGE,
            dto.getOperatorId(), dto.getOperatorName(), RoleType.FORWARDER,
            dto.getChangeReason(), beforeData + " -> " + afterData);

        if (booking.getStatus() == BookingStatus.QUEUED) {
            queueService.requeue(booking.getId(), "车辆变更后重新排队");
        }

        log.info("车辆变更: bookingNo={}, {} -> {}", 
            booking.getBookingNo(), oldVehicle != null ? oldVehicle.getPlateNumber() : "无", dto.getNewPlateNumber());
        return booking;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking cancelBooking(Long bookingId, String cancelReason, 
                                 String operatorId, String operatorName) {
        Booking booking = getBooking(bookingId);

        validator.throwIfInvalid(validator.validateWithdraw(booking));

        if (booking.getStatus() == BookingStatus.QUEUED) {
            queueService.leaveQueue(booking.getId(), "预约取消");
        }

        booking.setCancelReason(cancelReason);

        Booking result = stateMachineEngine.transition(booking, BookingStatus.CANCELLED,
            OperationType.CANCEL, operatorId, operatorName, RoleType.FORWARDER,
            cancelReason, null);

        log.info("取消预约: bookingNo={}, reason={}", booking.getBookingNo(), cancelReason);
        return result;
    }

    public Booking getBooking(Long id) {
        Booking booking = bookingMapper.selectById(id);
        if (booking == null) {
            throw new BusinessException("预约单不存在: " + id);
        }
        return booking;
    }

    public List<OperationLog> getOperationLogs(Long bookingId) {
        return operationLogMapper.findByBookingId(bookingId);
    }

    public Page<Booking> getBookingPage(int page, int size, String status, String keyword) {
        LambdaQueryWrapper<Booking> wrapper = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(status)) {
            wrapper.eq(Booking::getStatus, BookingStatus.fromCode(status));
        }
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(Booking::getBookingNo, keyword)
                .or().like(Booking::getWaybillNo, keyword)
                .or().like(Booking::getPlateNumber, keyword));
        }
        wrapper.orderByDesc(Booking::getCreateTime);
        return bookingMapper.selectPage(new Page<>(page, size), wrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    public int expireOverdueBookings() {
        int count = bookingMapper.expireOverdueBookings(LocalDateTime.now());
        if (count > 0) {
            log.info("自动过期预约单: {} 条", count);
        }
        return count;
    }

    private String generateBookingNo() {
        return "BK" + System.currentTimeMillis();
    }
}
