package com.airport.cargo.mapper;

import com.airport.cargo.entity.OperationLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface OperationLogMapper extends BaseMapper<OperationLog> {

    @Select("SELECT * FROM operation_log WHERE booking_id = #{bookingId} AND deleted = 0 ORDER BY operate_time DESC")
    List<OperationLog> findByBookingId(@Param("bookingId") Long bookingId);

    @Select("SELECT * FROM operation_log WHERE booking_no = #{bookingNo} AND deleted = 0 ORDER BY operate_time DESC")
    List<OperationLog> findByBookingNo(@Param("bookingNo") String bookingNo);
}
