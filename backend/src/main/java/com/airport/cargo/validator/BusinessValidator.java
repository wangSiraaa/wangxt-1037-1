package com.airport.cargo.validator;

import com.airport.cargo.common.BusinessException;
import com.airport.cargo.entity.Booking;
import com.airport.cargo.entity.Vehicle;
import com.airport.cargo.entity.Waybill;
import com.airport.cargo.enums.CargoStatus;
import com.airport.cargo.mapper.WaybillMapper;
import com.airport.cargo.mapper.VehicleMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BusinessValidator {

    private final WaybillMapper waybillMapper;
    private final VehicleMapper vehicleMapper;

    public ValidationResult validateBookingSubmission(Booking booking, Waybill waybill, Vehicle vehicle) {
        List<String> errors = new ArrayList<>();

        if (waybill == null) {
            errors.add("运单信息不存在");
            return new ValidationResult(false, errors);
        }

        validateWaybill(waybill, errors);
        validateVehicle(vehicle, errors);
        validateTimeWindow(booking, errors);
        validateActiveBooking(waybill.getId().toString(), errors);

        return new ValidationResult(errors.isEmpty(), errors);
    }

    public ValidationResult validateOwnershipVerification(Booking booking, Waybill waybill, String pickupOrderNo) {
        List<String> errors = new ArrayList<>();

        if (pickupOrderNo == null || pickupOrderNo.isBlank()) {
            errors.add("提货单号不能为空");
        }

        validateCargoStatus(waybill, errors);
        validateUnpaidAmount(waybill, errors);

        return new ValidationResult(errors.isEmpty(), errors);
    }

    public ValidationResult validateQueueJoin(Booking booking) {
        List<String> errors = new ArrayList<>();

        if (!booking.getStatus().canQueue()) {
            errors.add("当前状态不允许排队，货权未确认");
        }

        if (booking.getOwnershipVerified() == null || !booking.getOwnershipVerified()) {
            errors.add("货权未确认，不能排队");
        }

        if (booking.getExpectedArrivalEnd() != null 
            && booking.getExpectedArrivalEnd().isBefore(LocalDateTime.now())) {
            errors.add("预约窗口已过期");
        }

        return new ValidationResult(errors.isEmpty(), errors);
    }

    public ValidationResult validateSecurityCheck(Booking booking, Vehicle vehicle) {
        List<String> errors = new ArrayList<>();

        if (vehicle == null) {
            errors.add("车辆信息不存在");
            return new ValidationResult(false, errors);
        }

        validateVehicleDocuments(vehicle, errors);
        validateDriverDocuments(vehicle, errors);
        validateQueuePosition(booking, errors);
        validateTimeWindowForSecurity(booking, errors);

        return new ValidationResult(errors.isEmpty(), errors);
    }

    public ValidationResult validateWithdraw(Booking booking) {
        List<String> errors = new ArrayList<>();

        if (!booking.getStatus().canWithdraw()) {
            errors.add("当前状态不允许撤回，提货已完成或预约已过期");
        }

        return new ValidationResult(errors.isEmpty(), errors);
    }

    public ValidationResult validateVehicleChange(Booking booking) {
        List<String> errors = new ArrayList<>();

        if (booking.getStatus().isTerminal()) {
            errors.add("预约已完成或已取消，无法变更车辆");
        }

        if (booking.getStatus() == com.airport.cargo.enums.BookingStatus.IN_PROGRESS) {
            errors.add("提货进行中，无法变更车辆");
        }

        return new ValidationResult(errors.isEmpty(), errors);
    }

    public ValidationResult validatePartialDelivery(Booking booking, int pickedPieces) {
        List<String> errors = new ArrayList<>();

        if (booking.getTotalPieces() == null) {
            errors.add("总件数未设置");
            return new ValidationResult(false, errors);
        }

        if (pickedPieces <= 0) {
            errors.add("提货件数必须大于0");
        }

        if (pickedPieces >= booking.getTotalPieces()) {
            errors.add("部分提货件数必须小于总件数，全部提货请走完成流程");
        }

        int alreadyPicked = booking.getPickedPieces() == null ? 0 : booking.getPickedPieces();
        if (alreadyPicked + pickedPieces > booking.getTotalPieces()) {
            errors.add(String.format("累计提货件数(%d)不能超过总件数(%d)", 
                alreadyPicked + pickedPieces, booking.getTotalPieces()));
        }

        return new ValidationResult(errors.isEmpty(), errors);
    }

    private void validateWaybill(Waybill waybill, List<String> errors) {
        if (waybill.getCargoStatus() != null && waybill.getCargoStatus() == CargoStatus.LOCKED) {
            errors.add("货物被监管锁定，无法提货");
        }
        if (waybill.getCargoStatus() != null && waybill.getCargoStatus() == CargoStatus.DETAINED) {
            errors.add("货物被暂扣，无法提货");
        }
    }

    private void validateCargoStatus(Waybill waybill, List<String> errors) {
        if (waybill.getCargoStatus() == CargoStatus.LOCKED) {
            errors.add("货物被监管锁定，原因: " + waybill.getLockReason());
        }
        if (waybill.getCargoStatus() == CargoStatus.DETAINED) {
            errors.add("货物被暂扣，无法放行");
        }
        if (waybill.getCargoStatus() == CargoStatus.LOST) {
            errors.add("货物已丢失");
        }
    }

    private void validateUnpaidAmount(Waybill waybill, List<String> errors) {
        if (waybill.getUnpaidAmount() != null 
            && waybill.getUnpaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            errors.add(String.format("存在欠费 %.2f 元，请先结清费用", waybill.getUnpaidAmount()));
        }
    }

    private void validateVehicle(Vehicle vehicle, List<String> errors) {
        if (vehicle == null) {
            errors.add("车辆信息不能为空");
            return;
        }
        if (vehicle.getPlateNumber() == null || vehicle.getPlateNumber().isBlank()) {
            errors.add("车牌号不能为空");
        }
    }

    private void validateVehicleDocuments(Vehicle vehicle, List<String> errors) {
        if (vehicle.getLicenseExpireDate() != null 
            && vehicle.getLicenseExpireDate().isBefore(LocalDate.now())) {
            errors.add("车辆行驶证已过期");
        }
        if (vehicle.getInsuranceExpireDate() != null 
            && vehicle.getInsuranceExpireDate().isBefore(LocalDate.now())) {
            errors.add("车辆保险已过期");
        }
    }

    private void validateDriverDocuments(Vehicle vehicle, List<String> errors) {
        if (vehicle.getDriverLicenseExpireDate() != null 
            && vehicle.getDriverLicenseExpireDate().isBefore(LocalDate.now())) {
            errors.add("司机驾驶证已过期");
        }
        if (vehicle.getIdCardExpireDate() != null 
            && vehicle.getIdCardExpireDate().isBefore(LocalDate.now())) {
            errors.add("司机身份证已过期");
        }
    }

    private void validateTimeWindow(Booking booking, List<String> errors) {
        if (booking.getExpectedArrivalStart() == null) {
            errors.add("预计到场开始时间不能为空");
            return;
        }
        if (booking.getExpectedArrivalEnd() == null) {
            errors.add("预计到场结束时间不能为空");
            return;
        }
        if (booking.getExpectedArrivalEnd().isBefore(booking.getExpectedArrivalStart())) {
            errors.add("预计到场结束时间不能早于开始时间");
        }
        if (booking.getExpectedArrivalStart().isBefore(LocalDateTime.now())) {
            errors.add("预约窗口开始时间不能早于当前时间");
        }
    }

    private void validateTimeWindowForSecurity(Booking booking, List<String> errors) {
        if (booking.getExpectedArrivalEnd() != null 
            && booking.getExpectedArrivalEnd().isBefore(LocalDateTime.now())) {
            errors.add("预约窗口已过期，请重新预约");
        }
    }

    private void validateQueuePosition(Booking booking, List<String> errors) {
        if (booking.getQueuePosition() == null || booking.getQueuePosition() <= 0) {
            errors.add("车辆未在排队队列中");
        }
    }

    private void validateActiveBooking(String waybillId, List<String> errors) {
        List<com.airport.cargo.entity.Booking> activeBookings = 
            waybillMapper.findActiveByWaybillId(waybillId);
        if (!activeBookings.isEmpty()) {
            errors.add("该运单已有进行中的预约");
        }
    }

    public void throwIfInvalid(ValidationResult result) {
        if (!result.isValid()) {
            throw new BusinessException(String.join("; ", result.getErrors()));
        }
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class ValidationResult {
        private boolean valid;
        private List<String> errors;
    }
}
