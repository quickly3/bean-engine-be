import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import Converter from 'openapi-to-postmanv2';
import { AppModule } from 'src/modules/app.module';

type PostmanItem = {
  name?: string;
  item?: PostmanItem[];
  request?: {
    name?: string;
    url?: {
      path?: string[];
    };
  };
};

function getRoutePathFromItem(item: PostmanItem): string | null {
  const pathSegments = item.request?.url?.path;

  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return null;
  }

  return pathSegments.join('/');
}

function renameApiItemsByRoutePath(items: PostmanItem[]) {
  for (const item of items) {
    if (Array.isArray(item.item) && item.item.length > 0) {
      renameApiItemsByRoutePath(item.item);
      continue;
    }

    const routePath = getRoutePathFromItem(item);
    if (!routePath) {
      continue;
    }

    item.name = routePath;
    if (item.request) {
      item.request.name = routePath;
    }
  }
}

async function convertOpenApiToPostman(openApi: unknown) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    Converter.convert(
      {
        type: 'json',
        data: JSON.stringify(openApi),
      },
      {
        folderStrategy: 'paths',
      },
      (error, result) => {
        if (error) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
          return;
        }

        if (!result.result || !result.output?.[0]?.data) {
          reject(new Error('Failed to convert OpenAPI to Postman collection'));
          return;
        }

        resolve(result.output[0].data as Record<string, unknown>);
      },
    );
  });
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bean Engine API')
    .setDescription('Bean Engine backend API documentation')
    .setVersion('1.0.0')
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const postmanCollection = await convertOpenApiToPostman(openApiDocument);
  const collectionItems = postmanCollection.item as PostmanItem[] | undefined;

  if (Array.isArray(collectionItems)) {
    renameApiItemsByRoutePath(collectionItems);
  }

  const outputPath = path.resolve(
    process.cwd(),
    'postman',
    'bean-engine.collection.json',
  );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(postmanCollection, null, 2),
    'utf-8',
  );

  await app.close();
  console.log(`Postman collection updated: ${outputPath}`);
}

main().catch((error) => {
  console.error('Sync Postman collection failed:', error);
  process.exit(1);
});
