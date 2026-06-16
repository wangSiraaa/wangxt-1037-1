package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum WaybillStatusInBooking {

    PENDING("PENDING", "待处理"),
    CLEARED("CLEARED", "已放行"),
    CUSTOMS_HOLD("CUSTOMS_HOLD", "海关暂扣"),
    PARTIALLY_PICKED("PARTIALLY_PICKED", "部分提货"),
    FULLY_PICKED("FULLY_PICKED", "全部提货完成"),
    RELEASED("RELEASED", "已放行可提货");

    private final String code;
    private final String desc;

    WaybillStatusInBooking(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static WaybillStatusInBooking fromCode(String code) {
        for (WaybillStatusInBooking status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        return PENDING;
    }
}
