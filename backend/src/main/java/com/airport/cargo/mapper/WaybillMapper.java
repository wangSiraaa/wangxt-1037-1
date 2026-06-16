package com.airport.cargo.mapper;

import com.airport.cargo.entity.Waybill;
import com.airport.cargo.entity.Booking;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface WaybillMapper extends BaseMapper<Waybill> {

    @Select("SELECT * FROM waybill WHERE waybill_no = #{waybillNo} AND deleted = 0 LIMIT 1")
    Waybill findByWaybillNo(@Param("waybillNo") String waybillNo);

    @Select("SELECT COALESCE(SUM(unpaid_amount), 0) FROM waybill WHERE cargo_owner = #{cargoOwner} AND deleted = 0")
    BigDecimal getTotalUnpaidAmount(@Param("cargoOwner") String cargoOwner);

    @Select("SELECT b.* FROM booking b INNER JOIN booking_waybill_relation r ON b.id = r.booking_id WHERE r.waybill_id = #{waybillId} AND b.status NOT IN ('COMPLETED','CANCELLED','EXPIRED') AND b.deleted = 0")
    List<Booking> findActiveByWaybillId(@Param("waybillId") String waybillId);
}
