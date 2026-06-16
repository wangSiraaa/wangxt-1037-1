package com.airport.cargo.service;

import com.airport.cargo.common.BusinessException;
import com.airport.cargo.dto.QueueRecalculateDTO;
import com.airport.cargo.entity.Booking;
import com.airport.cargo.entity.BookingWaybillRelation;
import com.airport.cargo.entity.QueueItem;
import com.airport.cargo.enums.MixStatus;
import com.airport.cargo.enums.QueueType;
import com.airport.cargo.mapper.BookingMapper;
import com.airport.cargo.mapper.BookingWaybillRelationMapper;
import com.airport.cargo.mapper.QueueItemMapper;
import com.airport.cargo.statemachine.StateMachineEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueItemMapper queueItemMapper;
    private final BookingMapper bookingMapper;
    private final BookingWaybillRelationMapper waybillRelationMapper;
    private final StateMachineEngine stateMachineEngine;

    @Value("${app.booking.max-normal-queue-size:50}")
    private int maxNormalQueueSize;

    @Value("${app.booking.max-cold-chain-queue-size:20}")
    private int maxColdChainQueueSize;

    @Value("${app.booking.max-customs-queue-size:30}")
    private int maxCustomsQueueSize;

    @Value("${app.booking.average-minutes-per-pickup:15}")
    private int averageMinutesPerPickup;

    @Value("${app.booking.cold-chain-priority-bonus:10}")
    private int coldChainPriorityBonus;

    @Transactional(rollbackFor = Exception.class)
    public QueueItem joinQueue(Booking booking) {
        QueueType queueType = determineQueueType(booking);
        booking.setQueueType(queueType.getCode());

        int currentSize = queueItemMapper.getActiveQueueSizeByType(queueType.getCode());
        int maxSize = getMaxQueueSize(queueType);
        if (currentSize >= maxSize) {
            throw new BusinessException(queueType.getDesc() + "已满，请稍后再试");
        }

        QueueItem existing = queueItemMapper.findActiveByBookingId(booking.getId());
        if (existing != null) {
            throw new BusinessException("该预约已在排队中");
        }

        int nextPosition = queueItemMapper.getMaxPositionByType(queueType.getCode()) + 1;

        QueueItem queueItem = new QueueItem();
        queueItem.setQueueCode(generateQueueCode(queueType));
        queueItem.setBookingId(booking.getId());
        queueItem.setBookingNo(booking.getBookingNo());
        queueItem.setPlateNumber(booking.getPlateNumber());
        queueItem.setDriverName(booking.getDriverName());
        queueItem.setQueueType(queueType.getCode());
        queueItem.setPosition(nextPosition);
        queueItem.setPriority(calculatePriority(booking, queueType));
        queueItem.setJoinTime(LocalDateTime.now());
        queueItem.setStatus("ACTIVE");
        queueItem.setRequeueCount(0);
        queueItem.setEstimatedCallTime(calculateEstimatedCallTime(nextPosition, queueType));
        queueItem.setEstimatedArrivalWindowStart(booking.getExpectedArrivalStart());
        queueItem.setEstimatedArrivalWindowEnd(booking.getExpectedArrivalEnd());
        queueItemMapper.insert(queueItem);

        booking.setQueuePosition(nextPosition);
        booking.setQueueId(queueItem.getQueueCode());
        bookingMapper.updateById(booking);

        log.info("加入排队成功: bookingNo={}, queueType={}, position={}",
                booking.getBookingNo(), queueType.getCode(), nextPosition);
        return queueItem;
    }

    @Transactional(rollbackFor = Exception.class)
    public void leaveQueue(Long bookingId, String reason) {
        QueueItem queueItem = queueItemMapper.findActiveByBookingId(bookingId);
        if (queueItem == null) {
            return;
        }

        int removedPosition = queueItem.getPosition();
        String queueType = queueItem.getQueueType();

        queueItem.setStatus("LEFT");
        queueItem.setLeaveTime(LocalDateTime.now());
        queueItem.setLeaveReason(reason);
        queueItemMapper.updateById(queueItem);

        queueItemMapper.shiftPositionsAfterRemoval(removedPosition, queueType);

        Booking booking = bookingMapper.selectById(bookingId);
        if (booking != null) {
            booking.setQueuePosition(null);
            booking.setQueueId(null);
            bookingMapper.updateById(booking);
        }

        log.info("离开排队: bookingId={}, queueType={}, position={}, reason={}",
                bookingId, queueType, removedPosition, reason);
    }

    @Transactional(rollbackFor = Exception.class)
    public QueueItem requeue(Long bookingId, String reason) {
        QueueItem existing = queueItemMapper.findActiveByBookingId(bookingId);
        if (existing != null) {
            leaveQueue(bookingId, reason);
        }

        Booking booking = bookingMapper.selectById(bookingId);
        if (booking == null) {
            throw new BusinessException("预约单不存在");
        }

        QueueItem newQueueItem = joinQueue(booking);

        QueueItem item = queueItemMapper.findActiveByBookingId(bookingId);
        if (item != null) {
            item.setRequeueCount(item.getRequeueCount() == null ? 1 : item.getRequeueCount() + 1);
            queueItemMapper.updateById(item);
        }

        recalculateAllQueuePositions(QueueType.fromCode(booking.getQueueType()));

        log.info("重新排队: bookingId={}, newPosition={}", bookingId, newQueueItem.getPosition());
        return newQueueItem;
    }

    @Transactional(rollbackFor = Exception.class)
    public QueueRecalculateDTO recalculate(QueueRecalculateDTO dto) {
        Booking booking = bookingMapper.selectById(dto.getBookingId());
        if (booking == null) {
            throw new BusinessException("预约单不存在");
        }

        QueueType originalQueueType = QueueType.fromCode(booking.getQueueType());
        QueueType newQueueType = determineQueueType(booking);

        if (dto.isRecalculateQueue() && originalQueueType != newQueueType) {
            leaveQueue(booking.getId(), dto.getTriggerReason() + ":队列类型变更");
            booking.setQueueType(newQueueType.getCode());
            joinQueue(booking);
            dto.setOriginalQueueType(originalQueueType.getCode());
            dto.setNewQueueType(newQueueType.getCode());
        }

        if (dto.isRecalculateWindow()) {
            LocalDateTime[] newWindow = recalculateArrivalWindow(booking, newQueueType);
            if (newWindow != null) {
                dto.setNewWindowStart(newWindow[0]);
                dto.setNewWindowEnd(newWindow[1]);

                QueueItem queueItem = queueItemMapper.findActiveByBookingId(booking.getId());
                if (queueItem != null) {
                    queueItem.setEstimatedArrivalWindowStart(newWindow[0]);
                    queueItem.setEstimatedArrivalWindowEnd(newWindow[1]);
                    queueItem.setEstimatedCallTime(calculateEstimatedCallTime(
                            queueItem.getPosition(), newQueueType));
                    queueItemMapper.updateById(queueItem);
                }

                booking.setExpectedArrivalStart(newWindow[0]);
                booking.setExpectedArrivalEnd(newWindow[1]);
                bookingMapper.updateById(booking);
            }
        }

        recalculateAllQueuePositions(newQueueType);

        log.info("三重重算完成: bookingNo={}, 队列={}->{}, 窗口重算={}, 凭证重开={}",
                booking.getBookingNo(), originalQueueType, newQueueType,
                dto.isRecalculateWindow(), dto.isReissueVoucher());

        return dto;
    }

    public List<QueueItem> getActiveQueue() {
        return queueItemMapper.findActiveQueue();
    }

    public List<QueueItem> getActiveQueueByType(QueueType queueType) {
        return queueItemMapper.findActiveQueueByType(queueType.getCode());
    }

    public QueueItem getQueueItem(Long bookingId) {
        return queueItemMapper.findActiveByBookingId(bookingId);
    }

    public QueueType determineQueueType(Booking booking) {
        if (Boolean.TRUE.equals(booking.getHasCustomsHold())
                || MixStatus.fromCode(booking.getMixStatus()) == MixStatus.ALL_HOLD) {
            return QueueType.CUSTOMS;
        }

        if (Boolean.TRUE.equals(booking.getHasColdChain())) {
            return QueueType.COLD_CHAIN;
        }

        List<BookingWaybillRelation> relations = waybillRelationMapper.findByBookingId(booking.getId());
        if (relations != null && !relations.isEmpty()) {
            boolean hasHold = relations.stream()
                    .anyMatch(r -> Boolean.TRUE.equals(r.getCustomsInspected())
                            && "HELD".equals(r.getCustomsInspectResult()));
            if (hasHold) {
                return QueueType.CUSTOMS;
            }
            boolean hasCold = relations.stream()
                    .anyMatch(r -> Boolean.TRUE.equals(r.getTemperatureControlled()));
            if (hasCold) {
                return QueueType.COLD_CHAIN;
            }
        }

        return QueueType.NORMAL;
    }

    public int calculatePriority(Booking booking, QueueType queueType) {
        int priority = 10;

        if (queueType == QueueType.COLD_CHAIN) {
            priority += coldChainPriorityBonus;
        }

        if (booking.getExpectedArrivalStart() != null
                && booking.getExpectedArrivalStart().isBefore(LocalDateTime.now().plusHours(1))) {
            priority += 5;
        }

        if (Boolean.TRUE.equals(booking.getPartialDelivery())) {
            priority += 3;
        }

        MixStatus mixStatus = MixStatus.fromCode(booking.getMixStatus());
        if (mixStatus == MixStatus.PARTIAL_HOLD) {
            priority += 2;
        }

        return priority;
    }

    private LocalDateTime[] recalculateArrivalWindow(Booking booking, QueueType queueType) {
        int queueSize = queueItemMapper.getActiveQueueSizeByType(queueType.getCode());
        int averageMinutes = averageMinutesPerPickup;

        switch (queueType) {
            case COLD_CHAIN -> averageMinutes = 25;
            case CUSTOMS -> averageMinutes = 45;
        }

        int waitMinutes = queueSize * averageMinutes;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime newStart = now.plusMinutes(Math.max(0, waitMinutes - 30));
        LocalDateTime newEnd = now.plusMinutes(waitMinutes + 60);

        return new LocalDateTime[]{newStart, newEnd};
    }

    private void recalculateAllQueuePositions(QueueType queueType) {
        List<QueueItem> activeQueue = queueItemMapper.findActiveQueueByType(queueType.getCode());
        for (int i = 0; i < activeQueue.size(); i++) {
            QueueItem item = activeQueue.get(i);
            int newPosition = i + 1;
            if (!item.getPosition().equals(newPosition)) {
                item.setPosition(newPosition);
                queueItemMapper.updateById(item);

                Booking booking = bookingMapper.selectById(item.getBookingId());
                if (booking != null) {
                    booking.setQueuePosition(newPosition);
                    bookingMapper.updateById(booking);
                }
            }
        }
    }

    private int getMaxQueueSize(QueueType queueType) {
        return switch (queueType) {
            case NORMAL -> maxNormalQueueSize;
            case COLD_CHAIN -> maxColdChainQueueSize;
            case CUSTOMS -> maxCustomsQueueSize;
        };
    }

    private LocalDateTime calculateEstimatedCallTime(int position, QueueType queueType) {
        int avgMinutes = averageMinutesPerPickup;
        switch (queueType) {
            case COLD_CHAIN -> avgMinutes = 25;
            case CUSTOMS -> avgMinutes = 45;
        }
        return LocalDateTime.now().plusMinutes((long) position * avgMinutes);
    }

    private String generateQueueCode(QueueType queueType) {
        String prefix = switch (queueType) {
            case NORMAL -> "QN";
            case COLD_CHAIN -> "QC";
            case CUSTOMS -> "QS";
        };
        return prefix + System.currentTimeMillis();
    }

    public int getCurrentPosition(Long bookingId) {
        QueueItem item = queueItemMapper.findActiveByBookingId(bookingId);
        return item != null ? item.getPosition() : -1;
    }
}
