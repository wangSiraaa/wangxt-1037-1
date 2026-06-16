package com.airport.cargo.scheduler;

import com.airport.cargo.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingService bookingService;

    @Scheduled(cron = "0 */5 * * * ?")
    public void expireOverdueBookings() {
        try {
            int count = bookingService.expireOverdueBookings();
            if (count > 0) {
                log.info("定时任务：过期预约单处理完成，共处理 {} 条", count);
            }
        } catch (Exception e) {
            log.error("定时任务：过期预约单处理失败", e);
        }
    }
}
