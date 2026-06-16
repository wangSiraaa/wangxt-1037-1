package com.airport.cargo.mapper;

import com.airport.cargo.entity.Vehicle;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface VehicleMapper extends BaseMapper<Vehicle> {

    @Select("SELECT * FROM vehicle WHERE plate_number = #{plateNumber} AND deleted = 0")
    Vehicle findByPlateNumber(@Param("plateNumber") String plateNumber);

    @Select("SELECT * FROM vehicle WHERE driver_id = #{driverId} AND deleted = 0")
    Vehicle findByDriverId(@Param("driverId") String driverId);
}
