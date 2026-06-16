package com.airport.cargo.controller;

import com.airport.cargo.common.Result;
import com.airport.cargo.dto.*;
import com.airport.cargo.entity.Booking;
import com.airport.cargo.entity.OperationLog;
import com.airport.cargo.entity.QueueItem;
import com.airport.cargo.service.BookingService;
import com.airport.cargo.service.QueueService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "提货预约管理", description = "提货预约相关接口")
@RestController
@RequestMapping("/booking")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class BookingController {

    private final BookingService bookingService;
    private final QueueService queueService;

    @Operation(summary = "提交预约", description = "货代提交提货预约申请")
    @PostMapping("/submit")
    public Result<Booking> submitBooking(@Valid @RequestBody BookingSubmitDTO dto) {
        return Result.success(bookingService.createBooking(dto));
    }

    @Operation(summary = "货权确认", description = "仓库管理员核验货权")
    @PostMapping("/ownership/verify")
    public Result<Booking> verifyOwnership(@Valid @RequestBody OwnershipVerifyDTO dto) {
        return Result.success(bookingService.verifyOwnership(dto));
    }

    @Operation(summary = "加入排队", description = "货权确认后加入月台排队")
    @PostMapping("/queue/join")
    public Result<Booking> joinQueue(
            @Parameter(description = "预约ID") @RequestParam Long bookingId,
            @Parameter(description = "操作人ID") @RequestParam(required = false) String operatorId,
            @Parameter(description = "操作人姓名") @RequestParam(required = false) String operatorName) {
        return Result.success(bookingService.joinQueue(bookingId, operatorId, operatorName));
    }

    @Operation(summary = "安保检查", description = "安保人员检查车辆证件和排队顺序")
    @PostMapping("/security/check")
    public Result<Booking> securityCheck(@Valid @RequestBody SecurityCheckDTO dto) {
        return Result.success(bookingService.securityCheck(dto));
    }

    @Operation(summary = "开始提货", description = "车辆入场开始提货")
    @PostMapping("/start")
    public Result<Booking> startPickup(
            @Parameter(description = "预约ID") @RequestParam Long bookingId,
            @Parameter(description = "操作人ID") @RequestParam(required = false) String operatorId,
            @Parameter(description = "操作人姓名") @RequestParam(required = false) String operatorName) {
        return Result.success(bookingService.startPickup(bookingId, operatorId, operatorName));
    }

    @Operation(summary = "部分放货", description = "仓库部分放货，记录原因并重新排队")
    @PostMapping("/partial")
    public Result<Booking> partialDelivery(@Valid @RequestBody PartialDeliveryDTO dto) {
        return Result.success(bookingService.partialDelivery(dto));
    }

    @Operation(summary = "完成提货", description = "全部提货完成")
    @PostMapping("/complete")
    public Result<Booking> completePickup(
            @Parameter(description = "预约ID") @RequestParam Long bookingId,
            @Parameter(description = "操作人ID") @RequestParam(required = false) String operatorId,
            @Parameter(description = "操作人姓名") @RequestParam(required = false) String operatorName) {
        return Result.success(bookingService.completePickup(bookingId, operatorId, operatorName));
    }

    @Operation(summary = "变更车辆", description = "货代变更提货车辆")
    @PostMapping("/vehicle/change")
    public Result<Booking> changeVehicle(@Valid @RequestBody VehicleChangeDTO dto) {
        return Result.success(bookingService.changeVehicle(dto));
    }

    @Operation(summary = "取消预约", description = "取消提货预约")
    @PostMapping("/cancel")
    public Result<Booking> cancelBooking(
            @Parameter(description = "预约ID") @RequestParam Long bookingId,
            @Parameter(description = "取消原因") @RequestParam String cancelReason,
            @Parameter(description = "操作人ID") @RequestParam(required = false) String operatorId,
            @Parameter(description = "操作人姓名") @RequestParam(required = false) String operatorName) {
        return Result.success(bookingService.cancelBooking(bookingId, cancelReason, operatorId, operatorName));
    }

    @Operation(summary = "查询预约详情", description = "根据ID查询预约详情")
    @GetMapping("/{id}")
    public Result<Booking> getBookingDetail(@Parameter(description = "预约ID") @PathVariable Long id) {
        return Result.success(bookingService.getBooking(id));
    }

    @Operation(summary = "查询操作日志", description = "查询预约的操作历史记录")
    @GetMapping("/{id}/logs")
    public Result<List<OperationLog>> getOperationLogs(@Parameter(description = "预约ID") @PathVariable Long id) {
        return Result.success(bookingService.getOperationLogs(id));
    }

    @Operation(summary = "分页查询预约列表", description = "按状态和关键字分页查询预约")
    @GetMapping("/page")
    public Result<Page<Booking>> getBookingPage(
            @Parameter(description = "页码") @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "状态") @RequestParam(required = false) String status,
            @Parameter(description = "关键字") @RequestParam(required = false) String keyword) {
        return Result.success(bookingService.getBookingPage(page, size, status, keyword));
    }

    @Operation(summary = "获取排队列表", description = "获取当前月台排队队列")
    @GetMapping("/queue/list")
    public Result<List<QueueItem>> getQueueList() {
        return Result.success(queueService.getActiveQueue());
    }

    @Operation(summary = "获取排队位置", description = "获取指定预约的当前排队位置")
    @GetMapping("/queue/position")
    public Result<Integer> getQueuePosition(@Parameter(description = "预约ID") @RequestParam Long bookingId) {
        return Result.success(queueService.getCurrentPosition(bookingId));
    }

    @Operation(summary = "多运单提交预约", description = "货代提交多票货的提货预约(一车多票)")
    @PostMapping("/multi-submit")
    public Result<Booking> submitMultiBooking(@Valid @RequestBody BookingMultiSubmitDTO dto) {
        return Result.success(bookingService.createMultiBooking(dto));
    }

    @Operation(summary = "按类型获取排队列表", description = "NORMAL普通队列/COLD_CHAIN冷链队列/CUSTOMS查验队列")
    @GetMapping("/queue/by-type/{type}")
    public Result<List<QueueItem>> getQueueListByType(
            @Parameter(description = "队列类型 NORMAL/COLD_CHAIN/CUSTOMS") @PathVariable String type) {
        return Result.success(queueService.getActiveQueueByType(
                com.airport.cargo.enums.QueueType.fromCode(type)));
    }

    @Operation(summary = "开始海关查验", description = "海关人员开始对抽中货物进行查验")
    @PostMapping("/customs/start")
    public Result<Booking> startCustomsInspect(@Valid @RequestBody CustomsInspectDTO dto) {
        return Result.success(bookingService.startCustomsInspect(dto));
    }

    @Operation(summary = "海关查验结果处理", description = "处理查验结果：逐票通过/暂扣/部分放行")
    @PostMapping("/customs/result")
    public Result<Booking> processCustomsResult(@Valid @RequestBody CustomsInspectDTO dto) {
        return Result.success(bookingService.processCustomsInspectResult(dto));
    }

    @Operation(summary = "触发三重重算", description = "手动触发队列重算、到场窗口重算、放行凭证重开")
    @PostMapping("/recalculate")
    public Result<QueueRecalculateDTO> triggerRecalculate(@Valid @RequestBody QueueRecalculateDTO dto) {
        return Result.success(queueService.recalculate(dto));
    }

    @Operation(summary = "查询运单关联明细", description = "查询预约单下的多票运单状态")
    @GetMapping("/{id}/waybills")
    public Result<List<com.airport.cargo.entity.BookingWaybillRelation>> getWaybillRelations(
            @Parameter(description = "预约ID") @PathVariable Long id) {
        return Result.success(bookingService.getWaybillRelations(id));
    }
}
