package com.airport.cargo.service;

import com.airport.cargo.common.BusinessException;
import com.airport.cargo.dto.*;
import com.airport.cargo.entity.Booking;
import com.airport.cargo.entity.BookingWaybillRelation;
import com.airport.cargo.entity.OperationLog;
import com.airport.cargo.entity.Vehicle;
import com.airport.cargo.entity.Waybill;
import com.airport.cargo.enums.*;
import com.airport.cargo.mapper.BookingMapper;
import com.airport.cargo.mapper.BookingWaybillRelationMapper;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingMapper bookingMapper;
    private final WaybillMapper waybillMapper;
    private final VehicleMapper vehicleMapper;
    private final OperationLogMapper operationLogMapper;
    private final BookingWaybillRelationMapper waybillRelationMapper;
    private final StateMachineEngine stateMachineEngine;
    private final BusinessValidator validator;
    private final QueueService queueService;

    @Value("${app.booking.customs-draw-probability:0.15}")
    private double customsDrawProbability;

    @Transactional(rollbackFor = Exception.class)
    public Booking createBooking(BookingSubmitDTO dto) {
        Waybill waybill = waybillMapper.findByWaybillNo(dto.getWaybillNo());
        if (waybill == null) {
            throw new BusinessException("运单不存在: " + dto.getWaybillNo());
        }

        Vehicle vehicle = vehicleMapper.findByPlateNumber(dto.getPlateNumber());

        Booking booking = buildBooking(dto, waybill, vehicle);
        booking.setWaybillCount(1);
        booking.setHasColdChain(Boolean.TRUE.equals(waybill.getTemperatureControlled()));
        booking.setHasCustomsHold(false);
        booking.setMixStatus(MixStatus.ALL_CLEAR.getCode());
        booking.setQueueType(QueueType.NORMAL.getCode());

        validator.throwIfInvalid(validator.validateBookingSubmission(booking, waybill, vehicle));

        bookingMapper.insert(booking);
        createWaybillRelation(booking, waybill);

        stateMachineEngine.logOperation(booking, OperationType.SUBMIT,
                dto.getForwarderId(), dto.getForwarderName(), RoleType.FORWARDER,
                "提交预约", dto.getRemark());

        log.info("创建预约成功(单运单): bookingNo={}, waybillNo={}", booking.getBookingNo(), waybill.getWaybillNo());
        return booking;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking createMultiBooking(BookingMultiSubmitDTO dto) {
        if (dto.getWaybillNoList() == null || dto.getWaybillNoList().isEmpty()) {
            throw new BusinessException("运单号列表不能为空");
        }

        List<Waybill> waybills = new ArrayList<>();
        int totalPieces = 0;
        boolean hasColdChain = false;

        for (String waybillNo : dto.getWaybillNoList()) {
            Waybill waybill = waybillMapper.findByWaybillNo(waybillNo);
            if (waybill == null) {
                throw new BusinessException("运单不存在: " + waybillNo);
            }
            waybills.add(waybill);
            if (waybill.getCargoPieces() != null) {
                totalPieces += waybill.getCargoPieces();
            }
            if (Boolean.TRUE.equals(waybill.getTemperatureControlled())) {
                hasColdChain = true;
            }
        }

        Vehicle vehicle = vehicleMapper.findByPlateNumber(dto.getPlateNumber());
        Waybill firstWaybill = waybills.get(0);

        BookingSubmitDTO singleDto = new BookingSubmitDTO();
        singleDto.setWaybillNo(firstWaybill.getWaybillNo());
        singleDto.setPlateNumber(dto.getPlateNumber());
        singleDto.setDriverName(dto.getDriverName());
        singleDto.setDriverPhone(dto.getDriverPhone());
        singleDto.setExpectedArrivalStart(dto.getExpectedArrivalStart());
        singleDto.setExpectedArrivalEnd(dto.getExpectedArrivalEnd());
        singleDto.setForwarderId(dto.getForwarderId());
        singleDto.setForwarderName(dto.getForwarderName());
        singleDto.setForwarderContact(dto.getForwarderContact());
        singleDto.setRemark(dto.getRemark());

        Booking booking = buildBooking(singleDto, firstWaybill, vehicle);
        booking.setWaybillCount(waybills.size());
        booking.setHasColdChain(hasColdChain);
        booking.setHasCustomsHold(false);
        booking.setMixStatus(MixStatus.ALL_CLEAR.getCode());
        booking.setQueueType(hasColdChain ? QueueType.COLD_CHAIN.getCode() : QueueType.NORMAL.getCode());
        booking.setTotalPieces(totalPieces);

        validator.throwIfInvalid(validator.validateBookingSubmission(booking, firstWaybill, vehicle));

        bookingMapper.insert(booking);

        for (Waybill wb : waybills) {
            createWaybillRelation(booking, wb);
        }

        stateMachineEngine.logOperation(booking, OperationType.SUBMIT,
                dto.getForwarderId(), dto.getForwarderName(), RoleType.FORWARDER,
                "提交预约(多运单" + waybills.size() + "票)", dto.getRemark());

        log.info("创建预约成功(多运单): bookingNo={}, waybillCount={}", booking.getBookingNo(), waybills.size());
        return booking;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking verifyOwnership(OwnershipVerifyDTO dto) {
        Booking booking = getBooking(dto.getBookingId());
        List<BookingWaybillRelation> relations = waybillRelationMapper.findByBookingId(booking.getId());

        if (dto.getVerifyPass() != null && !dto.getVerifyPass()) {
            booking.setRejectReason(dto.getRemark());
            Booking result = stateMachineEngine.transition(booking, BookingStatus.OWNERSHIP_FAILED,
                    OperationType.OWNERSHIP_REJECT, dto.getOperatorId(), dto.getOperatorName(),
                    RoleType.WAREHOUSE, dto.getRemark(), "货权审核失败");
            return result;
        }

        Waybill firstWaybill = relations.isEmpty() ? null
                : waybillMapper.selectById(relations.get(0).getWaybillId());
        validator.throwIfInvalid(validator.validateOwnershipVerification(booking, firstWaybill, dto.getPickupOrderNo()));

        booking.setPickupOrderNo(dto.getPickupOrderNo());
        booking.setOwnershipVerified(true);
        booking.setOwnershipOperator(dto.getOperatorName());
        booking.setOwnershipTime(LocalDateTime.now());
        booking.setOwnershipRemark(dto.getRemark());

        Booking verified = stateMachineEngine.transition(booking, BookingStatus.OWNERSHIP_VERIFIED,
                OperationType.OWNERSHIP_VERIFY, dto.getOperatorId(), dto.getOperatorName(),
                RoleType.WAREHOUSE, "货权审核通过", dto.getRemark());

        boolean anyDrawn = triggerCustomsDraw(verified, dto.getOperatorId(), dto.getOperatorName());
        recalculateMixStatus(verified);
        generateReleaseVoucher(verified);

        BookingStatus targetStatus = anyDrawn ? BookingStatus.CUSTOMS_PENDING : BookingStatus.OWNERSHIP_VERIFIED;
        if (verified.getStatus() != targetStatus) {
            verified = stateMachineEngine.transition(verified, targetStatus,
                    anyDrawn ? OperationType.CUSTOMS_DRAW : OperationType.OWNERSHIP_VERIFY,
                    dto.getOperatorId(), dto.getOperatorName(),
                    anyDrawn ? RoleType.CUSTOMS : RoleType.WAREHOUSE,
                    anyDrawn ? "海关抽中需查验" : "货权确认",
                    anyDrawn ? String.format("抽中%d票货物待查验", countHeldWaybills(verified)) : dto.getRemark());
        }

        log.info("货权确认完成: bookingNo={}, customsDraw={}, mixStatus={}",
                verified.getBookingNo(), anyDrawn, verified.getMixStatus());
        return verified;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking startCustomsInspect(CustomsInspectDTO dto) {
        Booking booking = getBooking(dto.getBookingId());
        if (booking.getStatus() != BookingStatus.CUSTOMS_PENDING) {
            throw new BusinessException("当前状态不允许开始查验");
        }

        Booking result = stateMachineEngine.transition(booking, BookingStatus.CUSTOMS_INSPECTING,
                OperationType.CUSTOMS_INSPECT, dto.getOperatorId(), dto.getOperatorName(),
                RoleType.CUSTOMS, "开始海关查验", dto.getRemark());

        log.info("开始海关查验: bookingNo={}", booking.getBookingNo());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking processCustomsInspectResult(CustomsInspectDTO dto) {
        Booking booking = getBooking(dto.getBookingId());
        if (booking.getStatus() != BookingStatus.CUSTOMS_INSPECTING
                && booking.getStatus() != BookingStatus.CUSTOMS_PENDING) {
            throw new BusinessException("当前状态不允许处理查验结果");
        }

        if (dto.getInspectItems() != null) {
            for (CustomsInspectDTO.WaybillInspectItem item : dto.getInspectItems()) {
                BookingWaybillRelation relation = waybillRelationMapper.selectById(item.getRelationId());
                if (relation != null) {
                    boolean passed = Boolean.TRUE.equals(item.getPassed());
                    relation.setCustomsInspected(true);
                    relation.setCustomsInspectResult(passed ? "PASSED" : "HELD");
                    relation.setPiecesHeld(item.getPiecesHeld() != null ? item.getPiecesHeld() : 0);
                    relation.setPiecesReleased(item.getPiecesReleased() != null ? item.getPiecesReleased()
                            : (relation.getTotalPieces() != null ? relation.getTotalPieces() : 0));
                    relation.setWaybillStatus(passed ? WaybillStatusInBooking.CLEARED.getCode()
                            : WaybillStatusInBooking.CUSTOMS_HOLD.getCode());
                    waybillRelationMapper.updateById(relation);

                    Waybill waybill = waybillMapper.selectById(relation.getWaybillId());
                    if (waybill != null) {
                        waybill.setCustomsInspected(true);
                        waybill.setCustomsInspectTime(LocalDateTime.now());
                        waybill.setCustomsInspectOperator(dto.getOperatorName());
                        waybill.setCustomsInspectResult(passed ? "PASSED" : "HELD");
                        waybill.setCustomsInspectRemark(item.getInspectRemark());
                        if (!passed) {
                            waybill.setCargoStatus(CargoStatus.CUSTOMS_HOLD);
                        }
                        waybillMapper.updateById(waybill);
                    }
                }
            }
        }

        recalculateMixStatus(booking);

        MixStatus mixStatus = MixStatus.fromCode(booking.getMixStatus());
        BookingStatus targetStatus;
        OperationType opType;
        String opDesc;

        switch (mixStatus) {
            case ALL_CLEAR -> {
                targetStatus = BookingStatus.CUSTOMS_PASSED;
                opType = OperationType.CUSTOMS_PASS;
                opDesc = "查验全部通过";
            }
            case PARTIAL_HOLD -> {
                targetStatus = BookingStatus.PARTIAL_RELEASED;
                opType = OperationType.PARTIAL_RELEASE;
                opDesc = String.format("部分放行(%d票暂扣)", countHeldWaybills(booking));
            }
            default -> {
                targetStatus = BookingStatus.CUSTOMS_PENDING;
                opType = OperationType.CUSTOMS_HOLD;
                opDesc = String.format("全部暂扣(%d票)", countHeldWaybills(booking));
            }
        }

        Booking result = stateMachineEngine.transition(booking, targetStatus, opType,
                dto.getOperatorId(), dto.getOperatorName(), RoleType.CUSTOMS, opDesc, dto.getRemark());

        triggerTripleRecalculation(result, dto.getOperatorId(), dto.getOperatorName(),
                mixStatus != MixStatus.ALL_HOLD, true, true, "海关查验结果");

        reissueReleaseVoucher(result, dto.getOperatorName());

        log.info("海关查验处理完成: bookingNo={}, mixStatus={}, targetStatus={}",
                booking.getBookingNo(), mixStatus, targetStatus);
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking joinQueue(Long bookingId, String operatorId, String operatorName) {
        Booking booking = getBooking(bookingId);
        validator.throwIfInvalid(validator.validateQueueJoin(booking));

        QueueRecalculateDTO recalc = new QueueRecalculateDTO();
        recalc.setBookingId(bookingId);
        recalc.setTriggerReason("加入排队前确认");
        recalc.setRecalculateQueue(true);
        recalc.setRecalculateWindow(false);
        recalc.setReissueVoucher(false);
        queueService.recalculate(recalc);
        booking = getBooking(bookingId);

        Booking result = stateMachineEngine.transition(booking, BookingStatus.QUEUED,
                OperationType.JOIN_QUEUE, operatorId, operatorName, RoleType.WAREHOUSE,
                "加入排队", null);

        queueService.joinQueue(result);

        log.info("加入排队成功: bookingNo={}, queueType={}, position={}",
                result.getBookingNo(), result.getQueueType(), result.getQueuePosition());
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public Booking securityCheck(SecurityCheckDTO dto) {
        Booking booking = getBooking(dto.getBookingId());
        Vehicle vehicle = vehicleMapper.findByPlateNumber(dto.getPlateNumber());

        MixStatus mixStatus = MixStatus.fromCode(booking.getMixStatus());

        if (dto.getCheckPass() != null && !dto.getCheckPass()) {
            queueService.leaveQueue(booking.getId(), "安保检查驳回");
            booking.setRejectReason(dto.getRemark());
            Booking result = stateMachineEngine.transition(booking, BookingStatus.SECURITY_REJECTED,
                    OperationType.SECURITY_REJECT, dto.getOperatorId(), dto.getOperatorName(),
                    RoleType.SECURITY, dto.getRemark(), "安保检查驳回");
            return result;
        }

        if (mixStatus == MixStatus.ALL_HOLD) {
            throw new BusinessException("该车全部货物被海关暂扣，不能进场，请退回重约");
        }

        validator.throwIfInvalid(validator.validateSecurityCheck(booking, vehicle));

        booking.setSecurityChecked(true);
        booking.setSecurityOperator(dto.getOperatorName());
        booking.setSecurityTime(LocalDateTime.now());
        booking.setSecurityRemark(dto.getRemark());

        queueService.leaveQueue(booking.getId(), "安保检查通过");

        Booking result = stateMachineEngine.transition(booking, BookingStatus.SECURITY_CHECKED,
                OperationType.SECURITY_CHECK, dto.getOperatorId(), dto.getOperatorName(),
                RoleType.SECURITY, "安保检查通过",
                mixStatus == MixStatus.PARTIAL_HOLD
                        ? String.format("混合放行(暂扣%d票，放行其余)", countHeldWaybills(booking))
                        : dto.getRemark());

        log.info("安保检查通过: bookingNo={}, mixStatus={}", booking.getBookingNo(), mixStatus);
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
                RoleType.WAREHOUSE, dto.getPartialReason(), "部分提货完成");

        triggerTripleRecalculation(result, dto.getOperatorId(), dto.getOperatorName(),
                true, true, true, "部分放货后");

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

        List<BookingWaybillRelation> relations = waybillRelationMapper.findByBookingId(bookingId);
        for (BookingWaybillRelation rel : relations) {
            if (!WaybillStatusInBooking.CUSTOMS_HOLD.getCode().equals(rel.getWaybillStatus())) {
                rel.setWaybillStatus(WaybillStatusInBooking.FULLY_PICKED.getCode());
                rel.setPiecesPicked(rel.getTotalPieces());
                waybillRelationMapper.updateById(rel);
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
            triggerTripleRecalculation(booking, dto.getOperatorId(), dto.getOperatorName(),
                    true, true, true, "车辆变更");
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
        List<BookingWaybillRelation> relations = waybillRelationMapper.findByBookingId(id);
        booking.setWaybillRelations(relations);
        return booking;
    }

    public List<BookingWaybillRelation> getWaybillRelations(Long bookingId) {
        return waybillRelationMapper.findByBookingId(bookingId);
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
        Page<Booking> result = bookingMapper.selectPage(new Page<>(page, size), wrapper);
        for (Booking b : result.getRecords()) {
            b.setWaybillRelations(waybillRelationMapper.findByBookingId(b.getId()));
        }
        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    public int expireOverdueBookings() {
        int count = bookingMapper.expireOverdueBookings(LocalDateTime.now());
        if (count > 0) {
            log.info("自动过期预约单: {} 条", count);
        }
        return count;
    }

    private Booking buildBooking(BookingSubmitDTO dto, Waybill waybill, Vehicle vehicle) {
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
        return booking;
    }

    private void createWaybillRelation(Booking booking, Waybill waybill) {
        BookingWaybillRelation relation = new BookingWaybillRelation();
        relation.setBookingId(booking.getId());
        relation.setBookingNo(booking.getBookingNo());
        relation.setWaybillId(waybill.getId());
        relation.setWaybillNo(waybill.getWaybillNo());
        relation.setWaybillStatus(WaybillStatusInBooking.PENDING.getCode());
        relation.setCustomsInspected(Boolean.TRUE.equals(waybill.getCustomsInspected()));
        relation.setCustomsInspectResult(waybill.getCustomsInspectResult());
        relation.setPiecesHeld(0);
        relation.setPiecesReleased(0);
        relation.setPiecesPicked(0);
        relation.setTotalPieces(waybill.getCargoPieces());
        relation.setTemperatureControlled(Boolean.TRUE.equals(waybill.getTemperatureControlled()));
        waybillRelationMapper.insert(relation);
    }

    private boolean triggerCustomsDraw(Booking booking, String operatorId, String operatorName) {
        List<BookingWaybillRelation> relations = waybillRelationMapper.findByBookingId(booking.getId());
        boolean anyDrawn = false;

        for (BookingWaybillRelation rel : relations) {
            if (Boolean.TRUE.equals(rel.getCustomsInspected())) {
                if ("HELD".equals(rel.getCustomsInspectResult())) {
                    anyDrawn = true;
                    rel.setWaybillStatus(WaybillStatusInBooking.CUSTOMS_HOLD.getCode());
                    waybillRelationMapper.updateById(rel);
                }
                continue;
            }

            double random = ThreadLocalRandom.current().nextDouble();
            if (random < customsDrawProbability) {
                anyDrawn = true;
                rel.setCustomsInspected(true);
                rel.setCustomsInspectResult("HELD");
                rel.setWaybillStatus(WaybillStatusInBooking.CUSTOMS_HOLD.getCode());
                waybillRelationMapper.updateById(rel);

                Waybill waybill = waybillMapper.selectById(rel.getWaybillId());
                if (waybill != null) {
                    waybill.setCustomsInspected(true);
                    waybill.setCustomsInspectTime(LocalDateTime.now());
                    waybill.setCustomsInspectOperator(operatorName);
                    waybill.setCustomsInspectResult("HELD");
                    waybill.setCargoStatus(CargoStatus.CUSTOMS_HOLD);
                    waybillMapper.updateById(waybill);
                }

                stateMachineEngine.logOperation(booking, OperationType.CUSTOMS_DRAW,
                        operatorId, operatorName, RoleType.CUSTOMS,
                        "系统随机抽中", "运单:" + rel.getWaybillNo() + "被抽中");
            }
        }

        return anyDrawn;
    }

    private void recalculateMixStatus(Booking booking) {
        List<BookingWaybillRelation> relations = waybillRelationMapper.findByBookingId(booking.getId());
        int total = relations.size();
        int held = 0;

        for (BookingWaybillRelation rel : relations) {
            if (Boolean.TRUE.equals(rel.getCustomsInspected())
                    && "HELD".equals(rel.getCustomsInspectResult())) {
                held++;
            }
        }

        MixStatus mixStatus;
        if (held == 0) {
            mixStatus = MixStatus.ALL_CLEAR;
        } else if (held < total) {
            mixStatus = MixStatus.PARTIAL_HOLD;
        } else {
            mixStatus = MixStatus.ALL_HOLD;
        }

        booking.setMixStatus(mixStatus.getCode());
        booking.setHasCustomsHold(held > 0);

        boolean hasCold = relations.stream()
                .anyMatch(r -> Boolean.TRUE.equals(r.getTemperatureControlled()));
        booking.setHasColdChain(hasCold);
        booking.setWaybillCount(total);

        bookingMapper.updateById(booking);
    }

    private int countHeldWaybills(Booking booking) {
        List<BookingWaybillRelation> relations = waybillRelationMapper.findByBookingId(booking.getId());
        int count = 0;
        for (BookingWaybillRelation rel : relations) {
            if (Boolean.TRUE.equals(rel.getCustomsInspected())
                    && "HELD".equals(rel.getCustomsInspectResult())) {
                count++;
            }
        }
        return count;
    }

    private void generateReleaseVoucher(Booking booking) {
        String voucherNo = "RV" + System.currentTimeMillis();
        booking.setReleaseVoucherNo(voucherNo);
        booking.setReleaseVoucherStatus(ReleaseVoucherStatus.VALID.getCode());
        bookingMapper.updateById(booking);
    }

    private void reissueReleaseVoucher(Booking booking, String operatorName) {
        if (booking.getReleaseVoucherNo() != null) {
            booking.setReleaseVoucherStatus(ReleaseVoucherStatus.REISSUED.getCode());
            String newVoucherNo = "RV" + System.currentTimeMillis();
            booking.setReleaseVoucherNo(newVoucherNo);
            bookingMapper.updateById(booking);

            stateMachineEngine.logOperation(booking, OperationType.VOUCHER_REISSUE,
                    "SYSTEM", operatorName, RoleType.SYSTEM,
                    "放行凭证重开", "原凭证作废，新凭证号:" + newVoucherNo);
        }
    }

    private void triggerTripleRecalculation(Booking booking, String operatorId, String operatorName,
                                            boolean queue, boolean window, boolean voucher, String reason) {
        QueueRecalculateDTO dto = new QueueRecalculateDTO();
        dto.setBookingId(booking.getId());
        dto.setTriggerReason(reason);
        dto.setRecalculateQueue(queue);
        dto.setRecalculateWindow(window);
        dto.setReissueVoucher(voucher);
        dto.setOperatorId(operatorId);
        dto.setOperatorName(operatorName);

        QueueRecalculateDTO result = queueService.recalculate(dto);

        if (queue || window) {
            stateMachineEngine.logOperation(booking, OperationType.QUEUE_RECALCULATE,
                    operatorId, operatorName, RoleType.SYSTEM,
                    reason + ":队列重算",
                    String.format("队列:%s->%s, 窗口重算:%s",
                            result.getOriginalQueueType(), result.getNewQueueType(),
                            result.isRecalculateWindow() ? "是" : "否"));
        }
        if (window) {
            stateMachineEngine.logOperation(booking, OperationType.WINDOW_RECALCULATE,
                    operatorId, operatorName, RoleType.SYSTEM,
                    reason + ":到场窗口重算",
                    String.format("新窗口:%s ~ %s", result.getNewWindowStart(), result.getNewWindowEnd()));
        }
        if (voucher && result.isReissueVoucher()) {
            reissueReleaseVoucher(getBooking(booking.getId()), operatorName);
        }
    }

    private String generateBookingNo() {
        return "BK" + System.currentTimeMillis();
    }
}
