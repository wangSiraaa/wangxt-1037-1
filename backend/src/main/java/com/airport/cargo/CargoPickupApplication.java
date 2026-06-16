package com.airport.cargo;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.airport.cargo.mapper")
public class CargoPickupApplication {
    public static void main(String[] args) {
        SpringApplication.run(CargoPickupApplication.class, args);
    }
}
