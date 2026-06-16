package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum RoleType {

    FORWARDER("FORWARDER", "货代"),
    WAREHOUSE("WAREHOUSE", "仓库管理员"),
    SECURITY("SECURITY", "安保人员"),
    ADMIN("ADMIN", "管理员");

    private final String code;
    private final String desc;

    RoleType(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
