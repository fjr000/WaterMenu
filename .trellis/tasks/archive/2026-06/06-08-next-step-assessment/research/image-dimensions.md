# 图片尺寸读取依赖调研

## 结论

本任务允许新增轻量依赖读取上传图片的 `width` / `height`。推荐使用 `image-size`。

## 依据

`image-size` 是 Node.js 图片尺寸解析库，特点：

* 支持 JPEG、PNG、WebP 等主流格式。
* 支持从文件或 Buffer / Uint8Array 读取尺寸。
* TypeScript 类型内置。
* 依赖轻量，官方说明为 zero dependencies。
* 只读取图片头信息，适合上传后读取元数据。

## 使用建议

后端上传接收文件后：

1. 先由上传中间件限制 MIME 类型与 5MB 大小。
2. 再使用 `image-size` 对文件 Buffer 或落盘文件读取尺寸。
3. 校验实际识别类型仍属于 JPEG / PNG / WebP，不能只信任文件扩展名。
4. 保存 `width` / `height` 到 `DishImage`。

## 参考 API

从 Buffer 读取：

```ts
import { imageSize } from 'image-size';

const dimensions = imageSize(buffer);
console.log(dimensions.width, dimensions.height);
```

从文件读取：

```ts
import { imageSizeFromFile } from 'image-size/fromFile';

const dimensions = await imageSizeFromFile('uploads/photo.jpg');
console.log(dimensions.width, dimensions.height);
```

## 对本项目的约束映射

* 本项目只允许 JPEG / PNG / WebP，即使 `image-size` 支持更多格式，也必须在业务层拒绝其他格式。
* 不能因为解析出尺寸就跳过 MIME / magic bytes 校验。
* 读取尺寸失败应视为非法图片，删除已落盘临时文件并返回 400。
* 该依赖只属于后端包，不应加入前端。
