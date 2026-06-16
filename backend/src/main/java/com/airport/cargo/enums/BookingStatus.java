package com.airport.cargo.enums;

import lombok.Getter;

@Getter
public enum BookingStatus {

    DRAFT("DRAFT", "草稿"),
    SUBMITTED("SUBMITTED", "已提交待审核"),
    OWNERSHIP_VERIFIED("OWNERSHIP_VERIFIED", "货权已确认"),
    OWNERSHIP_FAILED("OWNERSHIP_FAILED", "货权审核失败"),
    QUEUED("QUEUED", "排队中"),
    QUEUE_CANCELLED("QUEUE_CANCELLED", "排队已取消"),
    SECURITY_CHECKED("SECURITY_CHECKED", "安保检查通过"),
    SECURITY_REJECTED("SECURITY_REJECTED", "安保检查驳回"),
    IN_PROGRESS("IN_PROGRESS", "提货中"),
    PARTIAL_COMPLETED("PARTIAL_COMPLETED", "部分提货完成"),
    COMPLETED("COMPLETED", "提货完成"),
    REJECTED("REJECTED", "已驳回"),
    CANCELLED("CANCELLED", "已取消"),
    EXPIRED("EXPIRED", "已过期");

    private final String code;
    private final String desc;

    BookingStatus(String code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static BookingStatus fromCode(String code) {
        for (BookingStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        return null;
    }

    public boolean canTransitionTo(BookingStatus targetStatus) {
        return switch (this) {
            case DRAFT -> targetStatus == SUBMITTED || targetStatus == CANCELLED;
            case SUBMITTED -> targetStatus == OWNERSHIP_VERIFIED || targetStatus == OWNERSHIP_FAILED || targetStatus == CANCELLED;
            case OWNERSHIP_VERIFIED -> targetStatus == QUEUED || targetStatus == CANCELLED;
            case OWNERSHIP_FAILED -> targetStatus == SUBMITTED || targetStatus == CANCELLED;
            case QUEUED -> targetStatus == SECURITY_CHECKED || targetStatus == SECURITY_REJECTED || targetStatus == QUEUE_CANCELLED;
            case QUEUE_CANCELLED -> targetStatus == QUEUED || targetStatus == CANCELLED;
            case SECURITY_CHECKED -> targetStatus == IN_PROGRESS || targetStatus == SECURITY_REJECTED;
            case SECURITY_REJECTED -> targetStatus == QUEUED || targetStatus == CANCELLED;
            case IN_PROGRESS -> targetStatus == PARTIAL_COMPLETED || targetStatus == COMPLETED;
            case PARTIAL_COMPLETED -> targetStatus == IN_PROGRESS || targetStatus == COMPLETED;
            case COMPLETED, REJECTED, CANCELLED, EXPIRED -> false;
            default -> false;
        };
    }

    public boolean isTerminal() {
        return this == COMPLETED || this == REJECTED || this == CANCELLED || this == EXPIRED;
    }

    public boolean canModify() {
        return this == DRAFT || this == SUBMITTED || this == OWNERSHIP_FAILED;
    }

    public boolean canQueue() {
        return this == OWNERSHIP_VERIFIED;
    }

    public boolean canWithdraw() {
        return this != COMPLETED && this != EXPIRED;
    }
}
