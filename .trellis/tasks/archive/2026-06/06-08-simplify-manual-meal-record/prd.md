# 精简手动记录入口代码

## Goal

在不改变手动新增用餐记录功能行为的前提下，精简和整理刚新增的前端代码，提升可读性和一致性。

## Scope

* 只审查本轮新增 / 修改的前端文件：
  * `frontend/src/components/manual-meal-record-form.tsx`
  * `frontend/src/components/history-records-panel.tsx`
* 不改变后端接口、请求字段、历史记录交互或筛选重置行为。
* 不扩大到无关组件重构。

## Requirements

* 保持手动记录请求体不包含 `dishId`。
* 保持默认餐次时间段不变。
* 保持历史页顶部内联展开方式不变。
* 保持创建成功后关闭表单、清空筛选、回到第 1 页、触发 `onRecordChange` 不变。
* 只做可读性、命名、重复逻辑减少等低风险整理。

## Acceptance Criteria

* [x] 前端类型检查通过：`pnpm --filter @watermenu/frontend typecheck`。
* [x] 前端构建通过：`pnpm --filter @watermenu/frontend build`。
* [x] 行为与 `7a7c93a` 功能提交保持一致。
* [x] 无无关文件改动。

## Spec Update Review

本任务只整理本轮新增前端代码的局部结构，没有新增项目级编码约定、跨层契约、API 或数据库变更。因此无需更新 `.trellis/spec/`。

## Notes

* 当前可精简点：手动表单 props 类型命名、默认值构造更集中、历史页 `resetFilters` 复用 `resetPage`、辅助函数返回类型更明确。
