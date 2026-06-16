package com.airport.cargo.mapper;

import com.airport.cargo.entity.Booking;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface BookingMapper extends BaseMapper<Booking> {

    @Select("SELECT * FROM booking WHERE waybill_id = #{waybillId} AND status != 'CANCELLED' AND status != 'COMPLETED' AND deleted = 0")
    List<Booking> findActiveByWaybillId(@Param("waybillId") String waybillId);

    @Select("SELECT * FROM booking WHERE status = 'QUEUED' AND deleted = 0 ORDER BY queue_position ASC")
    List<Booking> findQueuedBookings();

    @Select("SELECT * FROM booking WHERE status = 'OWNERSHIP_VERIFIED' AND deleted = 0")
    List<Booking> findOwnershipVerifiedBookings();

    @Update("UPDATE booking SET status = 'EXPIRED' WHERE status = 'QUEUED' AND expected_arrival_end < #{now} AND deleted = 0")
    int expireOverdueBookings(@Param("now") LocalDateTime now);

    @Select("SELECT MAX(queue_position) FROM queue_item WHERE status = 'ACTIVE' AND deleted = 0")
    Integer getMaxQueuePosition();
}
