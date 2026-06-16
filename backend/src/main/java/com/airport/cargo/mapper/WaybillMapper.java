package com.airport.cargo.mapper;

import com.airport.cargo.entity.Waybill;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;

@Mapper
public interface WaybillMapper extends BaseMapper<Waybill> {

    @Select("SELECT * FROM waybill WHERE waybill_no = #{waybillNo} AND deleted = 0")
    Waybill findByWaybillNo(@Param("waybillNo") String waybillNo);

    @Select("SELECT COALESCE(SUM(unpaid_amount), 0) FROM waybill WHERE cargo_owner = #{cargoOwner} AND deleted = 0")
    BigDecimal getTotalUnpaidAmount(@Param("cargoOwner") String cargoOwner);
}
