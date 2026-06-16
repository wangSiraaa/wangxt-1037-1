package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum QueueType {

    NORMAL("NORMAL", "普通月台队列"),
    COLD_CHAIN("COLD_CHAIN", "冷链月台队列"),
    CUSTOMS("CUSTOMS", "海关待查验队列");

    private final String code;
    private final String desc;

    QueueType(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static QueueType fromCode(String code) {
        for (QueueType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        return NORMAL;
    }
}
