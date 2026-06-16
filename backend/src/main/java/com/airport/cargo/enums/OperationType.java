package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum OperationType {

    CREATE("CREATE", "创建预约"),
    SUBMIT("SUBMIT", "提交预约"),
    OWNERSHIP_VERIFY("OWNERSHIP_VERIFY", "货权确认"),
    OWNERSHIP_REJECT("OWNERSHIP_REJECT", "货权驳回"),
    JOIN_QUEUE("JOIN_QUEUE", "加入排队"),
    LEAVE_QUEUE("LEAVE_QUEUE", "离开排队"),
    REQUEUE("REQUEUE", "重新排队"),
    SECURITY_CHECK("SECURITY_CHECK", "安保检查"),
    SECURITY_REJECT("SECURITY_REJECT", "安保驳回"),
    START_PICKUP("START_PICKUP", "开始提货"),
    PARTIAL_DELIVERY("PARTIAL_DELIVERY", "部分放货"),
    COMPLETE_PICKUP("COMPLETE_PICKUP", "完成提货"),
    VEHICLE_CHANGE("VEHICLE_CHANGE", "变更车辆"),
    DRIVER_CHANGE("DRIVER_CHANGE", "变更司机"),
    CANCEL("CANCEL", "取消预约"),
    EXPIRE("EXPIRE", "预约过期"),
    REVISE("REVISE", "修改预约信息");

    private final String code;
    private final String desc;

    OperationType(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }
}
