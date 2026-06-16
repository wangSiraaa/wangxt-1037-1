package com.airport.cargo.mapper;

import com.airport.cargo.entity.BookingWaybillRelation;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface BookingWaybillRelationMapper extends BaseMapper<BookingWaybillRelation> {

    @Select("SELECT * FROM booking_waybill_relation WHERE booking_id = #{bookingId} AND deleted = 0")
    List<BookingWaybillRelation> findByBookingId(@Param("bookingId") Long bookingId);

    @Select("SELECT COUNT(*) FROM booking_waybill_relation WHERE booking_id = #{bookingId} AND customs_inspected = 1 AND deleted = 0")
    int countCustomsHeldByBookingId(@Param("bookingId") Long bookingId);

    @Select("SELECT COUNT(*) FROM booking_waybill_relation WHERE booking_id = #{bookingId} AND temperature_controlled = 1 AND deleted = 0")
    int countColdChainByBookingId(@Param("bookingId") Long bookingId);

    @Select("SELECT COUNT(*) FROM booking_waybill_relation WHERE booking_id = #{bookingId} AND waybill_status = 'CUSTOMS_HOLD' AND deleted = 0")
    int countAllHeldByBookingId(@Param("bookingId") Long bookingId);

    @Select("SELECT COUNT(*) FROM booking_waybill_relation WHERE booking_id = #{bookingId} AND deleted = 0")
    int countByBookingId(@Param("bookingId") Long bookingId);

    @Update("UPDATE booking_waybill_relation SET waybill_status = #{status}, customs_inspected = #{customsInspected}, " +
            "customs_inspect_result = #{result}, pieces_held = #{piecesHeld}, pieces_released = #{piecesReleased}, update_time = NOW() " +
            "WHERE id = #{id} AND deleted = 0")
    int updateWaybillStatus(@Param("id") Long id, @Param("status") String status,
                            @Param("customsInspected") Boolean customsInspected,
                            @Param("result") String result,
                            @Param("piecesHeld") Integer piecesHeld,
                            @Param("piecesReleased") Integer piecesReleased);
}
