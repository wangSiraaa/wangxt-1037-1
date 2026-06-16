package com.airport.cargo.mapper;

import com.airport.cargo.entity.QueueItem;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface QueueItemMapper extends BaseMapper<QueueItem> {

    @Select("SELECT * FROM queue_item WHERE status = 'ACTIVE' AND deleted = 0 ORDER BY position ASC")
    List<QueueItem> findActiveQueue();

    @Select("SELECT * FROM queue_item WHERE booking_id = #{bookingId} AND status = 'ACTIVE' AND deleted = 0")
    QueueItem findActiveByBookingId(@Param("bookingId") Long bookingId);

    @Select("SELECT COALESCE(MAX(position), 0) FROM queue_item WHERE status = 'ACTIVE' AND deleted = 0")
    Integer getMaxPosition();

    @Update("UPDATE queue_item SET position = position - 1 WHERE position > #{removedPosition} AND status = 'ACTIVE' AND deleted = 0")
    int shiftPositionsAfterRemoval(@Param("removedPosition") Integer removedPosition);

    @Update("UPDATE queue_item SET position = position + 1 WHERE position >= #{insertPosition} AND status = 'ACTIVE' AND deleted = 0")
    int shiftPositionsForInsert(@Param("insertPosition") Integer insertPosition);

    @Select("SELECT COUNT(*) FROM queue_item WHERE status = 'ACTIVE' AND deleted = 0")
    int getActiveQueueSize();
}
