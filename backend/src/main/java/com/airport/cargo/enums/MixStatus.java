package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum MixStatus {

    ALL_CLEAR("ALL_CLEAR", "全部放行", "success", "#52c41a"),
    PARTIAL_HOLD("PARTIAL_HOLD", "部分放行部分暂扣", "warning", "#faad14"),
    ALL_HOLD("ALL_HOLD", "全部暂扣需退回重约", "error", "#ff4d4f");

    private final String code;
    private final String desc;
    private final String level;
    private final String color;

    MixStatus(String code, String desc, String level, String color) {
        this.code = code;
        this.desc = desc;
        this.level = level;
        this.color = color;
    }

    public static MixStatus fromCode(String code) {
        for (MixStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        return ALL_CLEAR;
    }

    public boolean canEnter() {
        return this == ALL_CLEAR || this == PARTIAL_HOLD;
    }

    public boolean needReject() {
        return this == ALL_HOLD;
    }
}
