package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum CargoStatus {

    NORMAL("NORMAL", "正常"),
    LOCKED("LOCKED", "监管锁定"),
    DETAINED("DETAINED", "暂扣"),
    CUSTOMS_HOLD("CUSTOMS_HOLD", "海关暂扣"),
    LOST("LOST", "丢失"),
    DAMAGED("DAMAGED", "损坏");

    private final String code;
    private final String desc;

    CargoStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
