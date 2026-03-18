---
name: create-api
description: 在 controller 中新增 API 时，同步在对应 service 中实现方法并完成 module 注册
---

# 创建API

## 适用场景

- 需要新增一个 NestJS API（查询、创建、更新、删除等）
- 需要在 controller 与 service 间建立清晰调用链
- 需要确保新建 controller/service 在 module 中正确注册

## 执行原则

- 先确认归属模块，优先复用现有 controller 与 service
- controller 只做参数接收、校验与调用，不写业务细节
- 业务逻辑放在 service，方法命名与 API 语义一致
- 变更最小化，只修改与需求直接相关文件

## 标准步骤

1. 定位目标模块与现有文件
	- 查找相关 `*.controller.ts`、`*.service.ts`、`*.module.ts`
	- 若不存在，则在该模块下创建对应文件
2. 在 controller 中新增路由方法
	- 使用合适的 HTTP 装饰器（GET/POST/PATCH/DELETE）
	- 定义参数装饰器（Param/Query/Body）并调用 service
3. 在 service 中新增对应方法
	- 方法名与 controller 调用一致
	- 在 service 中实现业务逻辑与数据访问
4. 完成依赖注入与模块注册
	- 确保 controller/service 在 `module` 的 `controllers`、`providers` 中注册
	- 若跨模块调用，检查 `exports/imports` 是否完整
5. 最小验证
	- 编译通过，无新增类型错误
	- 路由可访问，controller 能正确调用 service
6. 创建完接口后补齐 Swagger 文档（按 `getUserData` 风格）
	- 在 controller 类上保留/新增：`@ApiTags('模块名')`、`@ApiBearerAuth()`
	- 在路由方法上优先补齐请求说明：`@ApiBody({ description, examples })`
	- `description` 使用简短动作句，直接说明接口用途（如："get user's data for merge"）
	- `examples` 使用对象结构并给出可直接调用的请求体示例，保持字段名与真实入参一致
	- Swagger 描述遵循“最小但可用”：至少包含用途说明与一个有效示例

## Swagger 写作模板（参考）

```ts
@ApiTags('UserMerge')
@ApiBearerAuth()
@Controller('user-merge')
export class UserMergeController {
	@Post('getUserData')
	@ApiBody({
		description: "get user's data for merge",
		examples: {
			a: {
				value: {
					key: '100212616.693866',
				},
			},
		},
	})
	async getUserData(@Body() body: any) {
		return this.userMergeService.getUserData(body);
	}
}
```

## Swagger 最低验收标准

- 每个新 API 都有可读的 Swagger 注解
- 请求参数（Body/Query/Param）在文档中可理解、可复现
- 至少提供 1 个能反映真实字段结构的示例

## 输出要求（完成定义）

- API 路由已在 controller 暴露
- 对应 service 方法已实现并被 controller 调用
- module 注册完整，依赖注入可用
- 命名、目录与现有代码风格保持一致
