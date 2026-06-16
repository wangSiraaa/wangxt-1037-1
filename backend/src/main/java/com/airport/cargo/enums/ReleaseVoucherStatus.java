package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum ReleaseVoucherStatus {

    VALID("VALID", "有效"),
    INVALID("INVALID", "作废"),
    REISSUED("REISSUED", "已重开");

    private final String code;
    private final String desc;

    ReleaseVoucherStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static ReleaseVoucherStatus fromCode(String code) {
        for (ReleaseVoucherStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        return VALID;
    }
}
