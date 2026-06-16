package com.airport.cargo.service;

import com.airport.cargo.common.BusinessException;
import com.airport.cargo.entity.Booking;
import com.airport.cargo.entity.QueueItem;
import com.airport.cargo.mapper.BookingMapper;
import com.airport.cargo.mapper.QueueItemMapper;
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

    @Value("${app.booking.max-queue-size:50}")
    private int maxQueueSize;

    @Transactional(rollbackFor = Exception.class)
    public QueueItem joinQueue(Booking booking) {
        int currentSize = queueItemMapper.getActiveQueueSize();
        if (currentSize >= maxQueueSize) {
            throw new BusinessException("排队队列已满，请稍后再试");
        }

        QueueItem existing = queueItemMapper.findActiveByBookingId(booking.getId());
        if (existing != null) {
            throw new BusinessException("该预约已在排队中");
        }

        int nextPosition = queueItemMapper.getMaxPosition() + 1;

        QueueItem queueItem = new QueueItem();
        queueItem.setQueueCode(generateQueueCode());
        queueItem.setBookingId(booking.getId());
        queueItem.setBookingNo(booking.getBookingNo());
        queueItem.setPlateNumber(booking.getPlateNumber());
        queueItem.setDriverName(booking.getDriverName());
        queueItem.setPosition(nextPosition);
        queueItem.setPriority(calculatePriority(booking));
        queueItem.setJoinTime(LocalDateTime.now());
        queueItem.setStatus("ACTIVE");
        queueItem.setRequeueCount(0);
        queueItem.setEstimatedCallTime(calculateEstimatedCallTime(nextPosition));
        queueItemMapper.insert(queueItem);

        booking.setQueuePosition(nextPosition);
        booking.setQueueId(queueItem.getQueueCode());
        bookingMapper.updateById(booking);

        log.info("加入排队成功: bookingNo={}, position={}", booking.getBookingNo(), nextPosition);
        return queueItem;
    }

    @Transactional(rollbackFor = Exception.class)
    public void leaveQueue(Long bookingId, String reason) {
        QueueItem queueItem = queueItemMapper.findActiveByBookingId(bookingId);
        if (queueItem == null) {
            return;
        }

        int removedPosition = queueItem.getPosition();
        
        queueItem.setStatus("LEFT");
        queueItem.setLeaveTime(LocalDateTime.now());
        queueItem.setLeaveReason(reason);
        queueItemMapper.updateById(queueItem);

        queueItemMapper.shiftPositionsAfterRemoval(removedPosition);

        Booking booking = bookingMapper.selectById(bookingId);
        if (booking != null) {
            booking.setQueuePosition(null);
            booking.setQueueId(null);
            bookingMapper.updateById(booking);
        }

        log.info("离开排队: bookingId={}, position={}, reason={}", bookingId, removedPosition, reason);
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
        
        QueueItem oldItem = queueItemMapper.findActiveByBookingId(bookingId);
        if (oldItem != null) {
            oldItem.setRequeueCount(oldItem.getRequeueCount() + 1);
            queueItemMapper.updateById(oldItem);
        }

        updateBookingQueuePositions();
        
        log.info("重新排队: bookingId={}, newPosition={}", bookingId, newQueueItem.getPosition());
        return newQueueItem;
    }

    public List<QueueItem> getActiveQueue() {
        return queueItemMapper.findActiveQueue();
    }

    public QueueItem getQueueItem(Long bookingId) {
        return queueItemMapper.findActiveByBookingId(bookingId);
    }

    private void updateBookingQueuePositions() {
        List<QueueItem> activeQueue = queueItemMapper.findActiveQueue();
        for (int i = 0; i < activeQueue.size(); i++) {
            QueueItem item = activeQueue.get(i);
            int newPosition = i + 1;
            if (item.getPosition() != newPosition) {
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

    private int calculatePriority(Booking booking) {
        int priority = 10;
        
        if (booking.getExpectedArrivalStart() != null 
            && booking.getExpectedArrivalStart().isBefore(LocalDateTime.now().plusHours(1))) {
            priority += 5;
        }
        
        if (booking.getPartialDelivery() != null && booking.getPartialDelivery()) {
            priority += 3;
        }
        
        return priority;
    }

    private LocalDateTime calculateEstimatedCallTime(int position) {
        int averageMinutesPerPickup = 15;
        return LocalDateTime.now().plusMinutes((long) position * averageMinutesPerPickup);
    }

    private String generateQueueCode() {
        return "Q" + System.currentTimeMillis();
    }

    public int getCurrentPosition(Long bookingId) {
        QueueItem item = queueItemMapper.findActiveByBookingId(bookingId);
        return item != null ? item.getPosition() : -1;
    }
}
